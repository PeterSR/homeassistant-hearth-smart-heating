"""Coordinator: the brain of Hearth."""

from __future__ import annotations

import logging
import time
from collections import deque
from datetime import timedelta
from typing import Any, Callable

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import CALLBACK_TYPE, HomeAssistant, callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers.event import (
    async_call_later,
    async_track_state_change_event,
    async_track_time_interval,
)
from homeassistant.util import dt as dt_util

from .adapters import create_adapter
from .adapters.base import DeviceAdapter
from .const import STATE_AWAY, STATE_HOME, STATE_OFF
from .models import AreaConfig, Override, WeeklySchedule
from .schedule_engine import ScheduleEngine
from .store import HearthStore

_LOGGER = logging.getLogger(__name__)

TICK_INTERVAL = timedelta(seconds=60)

# Dial detection / preheat classification tolerances
SETPOINT_MATCH_TOLERANCE = 0.1  # °C - Danfoss reports in 0.5°C steps
PREHEAT_WINDOW_MIN = 90  # minutes before a transition that preheat is plausible

# Suppress redundant setpoints to the same target for this long after a
# successful send. Prevents the every-minute retry pattern observed when
# a Z2M sleeper takes a long time to ack (observed: 62 retries/hour against
# one TRV).
# After this TTL we allow a single retry in case the original was lost.
IN_FLIGHT_SETPOINT_TTL_SEC = 600  # 10 min

# When a device has been available but away from its target for longer than
# this, log a WARNING on the reconcile send instead of staying silent: a
# dead-man's switch for drift that would otherwise be invisible (observed:
# one area sat 3°C off target for 37 min across 8 evenings before this was
# added).
DRIFT_WARNING_THRESHOLD_SEC = 120  # 2 min


class HearthCoordinator:
    """Coordinates schedule evaluation, setpoint application, and state updates."""

    def __init__(
        self, hass: HomeAssistant, store: HearthStore, entry: ConfigEntry
    ) -> None:
        self.hass = hass
        self.store = store
        self.entry = entry
        self.engine = ScheduleEngine()
        self._adapters: dict[str, DeviceAdapter] = {}
        self._listeners: list[Callable[[], None]] = []
        self._unsub_timer: CALLBACK_TYPE | None = None
        self._auto_away_active: bool = False
        self._auto_away_timer_unsub: CALLBACK_TYPE | None = None
        self._presence_unsub: CALLBACK_TYPE | None = None
        self._danfoss_features: list = []
        self._tick_counter: int = 0
        self._dial_unsub: CALLBACK_TYPE | None = None
        # Track setpoints we send to distinguish our changes from physical dial turns
        self._our_setpoints: dict[str, tuple[float, float]] = {}  # entity_id -> (target, monotonic_time)
        # Track active preheat per area: area_id -> transition_dt (when preheat ends).
        # While active, entities already preset to the upcoming target are left
        # alone so the TRV can warm up without us forcing it back; siblings that
        # haven't preset still get reconciled normally (see _evaluate_area).
        self._preheat_active: dict[str, Any] = {}  # area_id -> aware datetime
        # Track how long each entity has been available-but-off-target, for the
        # drift dead-man's switch. entity_id -> monotonic time drift was first seen.
        self._drift_since: dict[str, float] = {}
        # Per-area command logs, persisted to disk
        self.command_logs: dict[str, deque[dict]] = {}
        # Per-entity last-success timestamps: {entity_id: {command: iso_timestamp}}
        self.feature_status: dict[str, dict[str, str]] = {}

    async def async_start(self) -> None:
        """Start the coordinator."""
        self._build_adapters()
        self._load_command_logs()
        self._setup_danfoss_features()

        # Ensure all areas have a materialized schedule
        now = dt_util.now()
        for area in self.store.areas.values():
            self._ensure_materialized(area, now)
        self.store.async_save()

        # Scan TRVs for in-progress autonomous preheat so we don't overwrite it
        # on the first tick after a restart.
        self._scan_preheat_on_startup(now)

        self._unsub_timer = async_track_time_interval(
            self.hass, self._async_tick, TICK_INTERVAL
        )
        await self.async_setup_presence_tracking()
        self._setup_dial_detection()
        _LOGGER.info(
            "Hearth coordinator started with %d areas", len(self.store.areas)
        )

    async def async_stop(self) -> None:
        """Stop the coordinator."""
        self._teardown_dial_detection()
        self._teardown_presence_tracking()
        if self._unsub_timer:
            self._unsub_timer()
            self._unsub_timer = None
        self._save_command_logs()
        self._adapters.clear()
        _LOGGER.info("Hearth coordinator stopped")

    def _build_adapters(self) -> None:
        """Build adapters for all configured climate entities."""
        self._adapters.clear()
        for area in self.store.areas.values():
            for entity_id in area.climate_entities:
                if entity_id not in self._adapters:
                    self._adapters[entity_id] = create_adapter(
                        self.hass, entity_id
                    )

    def rebuild_adapters_for_area(self, area: AreaConfig) -> None:
        """Rebuild adapters when an area's entities change."""
        for entity_id in area.climate_entities:
            if entity_id not in self._adapters:
                self._adapters[entity_id] = create_adapter(
                    self.hass, entity_id
                )
        # Re-setup dial detection when entities change
        self._setup_dial_detection()

    # --- Physical dial turn detection ---

    def _setup_dial_detection(self) -> None:
        """Subscribe to climate entity state changes to detect physical dial turns."""
        self._teardown_dial_detection()
        entity_ids = list(self._adapters.keys())
        if not entity_ids:
            return
        self._dial_unsub = async_track_state_change_event(
            self.hass, entity_ids, self._handle_climate_state_change
        )

    def _teardown_dial_detection(self) -> None:
        """Remove dial detection subscriptions."""
        if self._dial_unsub:
            self._dial_unsub()
            self._dial_unsub = None

    @callback
    def _handle_climate_state_change(self, event) -> None:
        """Classify climate entity target changes: confirm / catch-up / preheat / dial turn."""
        entity_id = event.data["entity_id"]
        new_state = event.data.get("new_state")
        old_state = event.data.get("old_state")
        if new_state is None or old_state is None:
            return

        new_target = new_state.attributes.get("temperature")
        old_target = old_state.attributes.get("temperature")
        if new_target is None or old_target is None:
            return
        if abs(new_target - old_target) < 0.05:
            return

        # 1) Confirmation: this matches a setpoint we sent within the last 120s
        if entity_id in self._our_setpoints:
            our_temp, sent_at = self._our_setpoints[entity_id]
            if abs(our_temp - new_target) < SETPOINT_MATCH_TOLERANCE and (
                time.monotonic() - sent_at
            ) < 120:
                del self._our_setpoints[entity_id]
                self._notify_listeners()
                return

        area_id = self._find_area_for_entity(entity_id)
        if not area_id:
            return
        area = self.store.areas.get(area_id)
        if area is None:
            return

        now = dt_util.now()
        sched = area.materialized_schedule

        # 2) Catch-up: TRV reporting the current scheduled target - schedule transition
        # just fired or post-restart sync. Not a user action, ignore.
        current_sched = self.engine.get_scheduled_target_temp(sched, area, now)
        if current_sched is not None and abs(new_target - current_sched) < SETPOINT_MATCH_TOLERANCE:
            return

        # 3) Scheduled transition prep: TRV jumped to the upcoming scheduled target
        # inside the preheat window. Danfoss TRVs autonomously move heating_setpoint
        # ~60 min before a transition - in BOTH directions (warming AND setback).
        next_target = self.engine.get_next_scheduled_target(sched, area, now)
        if next_target is not None:
            upcoming_temp, transition_dt = next_target
            seconds_until = (transition_dt - now).total_seconds()
            if (
                abs(new_target - upcoming_temp) < SETPOINT_MATCH_TOLERANCE
                and 0 < seconds_until <= PREHEAT_WINDOW_MIN * 60
            ):
                # Already coordinated this transition? Just confirm.
                active_until = self._preheat_active.get(area_id)
                if active_until and active_until == transition_dt:
                    self._notify_listeners()
                    return
                self._preheat_active[area_id] = transition_dt
                # Only propagate when WARMING - siblings handle cooling autonomously
                # by closing their valves; we'd just be sending noisy zigbee commands.
                warming = current_sched is None or upcoming_temp > current_sched + SETPOINT_MATCH_TOLERANCE
                _LOGGER.info(
                    "Scheduled prep detected on %s in area %s: %.1f -> %.1f (transition in %d min, %s)",
                    entity_id, area_id, old_target, new_target, int(seconds_until / 60),
                    "warming" if warming else "setback",
                )
                if warming:
                    self.hass.async_create_task(
                        self._propagate_preheat(area, entity_id, upcoming_temp)
                    )
                else:
                    self._notify_listeners()
                return

        # 4) Otherwise: physical dial turn → user override
        _LOGGER.info(
            "Physical dial turn detected on %s: %.1f -> %.1f",
            entity_id, old_target, new_target,
        )
        self.hass.async_create_task(
            self.async_set_override(area_id, new_target, until="next_transition")
        )

    async def _propagate_preheat(
        self, area: AreaConfig, trigger_entity_id: str, target_temp: float
    ) -> None:
        """Mirror a detected preheat to other TRVs in the same area."""
        sent = 0
        for entity_id in area.climate_entities:
            if entity_id == trigger_entity_id:
                continue
            adapter = self._adapters.get(entity_id)
            if adapter is None:
                continue
            current = adapter.get_target_temperature()
            if current is not None and abs(current - target_temp) < SETPOINT_MATCH_TOLERANCE:
                # Sibling already preheated autonomously - nothing to do
                continue
            try:
                await adapter.async_set_temperature(target_temp, change_type="schedule")
                self._our_setpoints[entity_id] = (target_temp, time.monotonic())
                self._log_command(
                    area.area_id, entity_id, "preheat_propagate", True,
                    f"trigger={trigger_entity_id}, target={target_temp:.1f}",
                )
                sent += 1
            except Exception as exc:
                self._log_command(
                    area.area_id, entity_id, "preheat_propagate", False, str(exc),
                )
                _LOGGER.exception("Failed to propagate preheat to %s", entity_id)
        if sent:
            _LOGGER.info(
                "Preheat triggered by %s in area %s: propagated to %d sibling TRVs",
                trigger_entity_id, area.area_id, sent,
            )
        self._notify_listeners()

    def _find_area_for_entity(self, entity_id: str) -> str | None:
        """Find which area contains a given climate entity."""
        for area_id, area in self.store.areas.items():
            if entity_id in area.climate_entities:
                return area_id
        return None

    def _setup_danfoss_features(self) -> None:
        """Initialize Danfoss-specific feature modules.

        Always initialized - features are no-ops when no Danfoss devices exist.
        Each feature gets the Zigbee backend per-device from the adapter.
        """
        from .features.boiler_control import BoilerControlFeature
        from .features.device_health import DeviceHealthFeature
        from .features.external_temp import ExternalTempFeature
        from .features.load_balancing import LoadBalancingFeature
        from .features.schedule_push import SchedulePushFeature
        from .features.time_sync import TimeSyncFeature
        from .features.window_coordination import WindowCoordinationFeature

        args = (self.hass, self.store, self._adapters, self.command_logs, self.feature_status)
        self._danfoss_features = [
            DeviceHealthFeature(*args, coordinator=self),
            TimeSyncFeature(*args),
            ExternalTempFeature(*args),
            LoadBalancingFeature(*args),
            SchedulePushFeature(*args, coordinator=self),
            WindowCoordinationFeature(*args),
            BoilerControlFeature(*args),
        ]
        _LOGGER.info("Danfoss features initialized: %d modules", len(self._danfoss_features))

    # --- Effective schedule indirection (vacation > group > area) ---

    def _get_effective_schedule_id(self, area: AreaConfig) -> str | None:
        """Get the effective schedule ID: vacation > group > area."""
        gc = self.store.global_config
        if gc.vacation_mode and gc.vacation_schedule_id:
            return gc.vacation_schedule_id
        group = self.store.get_group_for_area(area.area_id)
        if group and group.schedule_id:
            return group.schedule_id
        return area.schedule_id

    def _get_effective_schedule(self, area: AreaConfig) -> WeeklySchedule | None:
        """Get the effective weekly schedule template."""
        sched_id = self._get_effective_schedule_id(area)
        if sched_id and sched_id in self.store.schedules:
            return self.store.schedules[sched_id].schedule
        return None

    # --- Tick ---

    async def _async_tick(self, now) -> None:
        """Periodic evaluation of all areas."""
        now_dt = dt_util.now()
        self._tick_counter += 1
        changed = False
        for area in list(self.store.areas.values()):
            area_changed = await self._evaluate_area(area, now_dt)
            if area_changed:
                changed = True

        # Run Danfoss feature periodic tasks
        for feature in self._danfoss_features:
            try:
                await feature.async_tick(now_dt, self._tick_counter)
            except Exception:
                _LOGGER.exception(
                    "Error in Danfoss feature %s", type(feature).__name__
                )

        # Persist command logs every hour
        if self._tick_counter % 60 == 0:
            self._save_command_logs()

        if changed:
            self._notify_listeners()

    async def _evaluate_area(self, area: AreaConfig, now) -> bool:
        """Evaluate an area and apply setpoint if needed. Returns True if state changed."""
        changed = False

        # Ensure materialized schedule is up to date (rolling forward)
        if self._ensure_materialized(area, now):
            changed = True

        # Check override expiry
        if area.override and self.engine.is_override_expired(area, now):
            _LOGGER.debug("Override expired for area %s", area.area_id)
            area.override = None
            changed = True
            self.store.async_save()

        # Drop expired preheat tracking
        active_until = self._preheat_active.get(area.area_id)
        if active_until is not None and active_until <= now:
            del self._preheat_active[area.area_id]
            active_until = None

        # Compute state
        state = self.engine.compute_area_state(
            area, self.store.global_config, now
        )
        target = state["target_temp"]
        if target is None:
            return changed

        # If preheat is active and the user hasn't overridden, resolve the
        # upcoming scheduled target so we can leave entities that already
        # preset to it alone - this is entity-scoped, not area-wide, so a
        # sibling that hasn't preset (or missed it) still gets reconciled.
        upcoming_temp = None
        if active_until is not None and area.override is None:
            next_target = self.engine.get_next_scheduled_target(
                area.materialized_schedule, area, now
            )
            if next_target is not None:
                upcoming_temp = next_target[0]

        # Apply to all climate entities
        change_type = "user" if area.override else "schedule"
        effective_state = state["effective_state"]
        for entity_id in area.climate_entities:
            adapter = self._adapters.get(entity_id)
            if adapter is None:
                continue
            current_target = adapter.get_target_temperature()
            if current_target is not None and abs(current_target - target) <= 0.05:
                self._drift_since.pop(entity_id, None)
                continue

            # Track how long this entity has been off-target, regardless of
            # whether we act on it this tick - feeds the drift warning below.
            drift_started = self._drift_since.setdefault(entity_id, time.monotonic())

            # Preheat active: leave this entity alone if it's already preset to
            # the upcoming scheduled target - let it warm up without us forcing
            # it back. Siblings that aren't preset fall through and reconcile.
            if (
                upcoming_temp is not None
                and current_target is not None
                and abs(current_target - upcoming_temp) < SETPOINT_MATCH_TOLERANCE
            ):
                continue

            # Skip silently if the device is unavailable - re-issuing every
            # minute during a Zigbee outage just floods the command log.
            if not adapter.is_available():
                continue

            # Suppress redundant setpoints when our last command for the same
            # target is still in flight (TRV hasn't acked by reporting it).
            pending = self._our_setpoints.get(entity_id)
            if pending is not None:
                pending_target, sent_at = pending
                if abs(pending_target - target) < SETPOINT_MATCH_TOLERANCE:
                    if time.monotonic() - sent_at < IN_FLIGHT_SETPOINT_TTL_SEC:
                        continue
                    # TTL expired - drop the stale entry and allow a retry
                    del self._our_setpoints[entity_id]

            drift_elapsed = time.monotonic() - drift_started
            if drift_elapsed > DRIFT_WARNING_THRESHOLD_SEC:
                _LOGGER.warning(
                    "Reconciling %s after %.0f min off target (expected %.1f, was %s)",
                    entity_id, drift_elapsed / 60, target,
                    f"{current_target:.1f}" if current_target is not None else "unknown",
                )

            try:
                await adapter.async_set_temperature(
                    target, change_type=change_type
                )
                self._our_setpoints[entity_id] = (target, time.monotonic())
                self._log_setpoint(area.area_id, entity_id, target, change_type, effective_state, current_target)
                self._drift_since.pop(entity_id, None)
                changed = True
            except Exception as exc:
                self._log_command(area.area_id, entity_id, "setpoint", False,
                    f"target={target}, type={change_type}: {exc}")
                _LOGGER.exception(
                    "Failed to set temperature on %s", entity_id
                )

        return changed

    def _ensure_materialized(self, area: AreaConfig, now) -> bool:
        """Ensure area has an up-to-date materialized schedule. Returns True if regenerated."""
        if not self.engine.needs_rematerialization(area.materialized_schedule, now):
            return False

        template = self._get_effective_schedule(area)
        if template is None:
            return False

        area.materialized_schedule = self.engine.materialize_schedule(
            template, self._get_effective_schedule_id(area), now
        )
        self.store.async_save()
        return True

    # --- Command logging (per-area, persisted) ---

    COMMAND_LOG_MAXLEN = 1000  # ~3 days per area

    def _get_area_log(self, area_id: str) -> deque[dict]:
        """Get or create the command log deque for an area."""
        if area_id not in self.command_logs:
            self.command_logs[area_id] = deque(maxlen=self.COMMAND_LOG_MAXLEN)
        return self.command_logs[area_id]

    def _log_setpoint(self, area_id: str, entity_id: str, target: float,
                      change_type: str, state: str, prev: float | None) -> None:
        ts = dt_util.now().isoformat()
        prev_str = f"{prev:.1f}" if prev is not None else "none"
        self._append_log_entry(area_id, {
            "timestamp": ts,
            "entity_id": entity_id,
            "command": "setpoint",
            "success": True,
            "detail": f"{prev_str}→{target:.1f}°C ({change_type}, {state})",
        })
        self.feature_status.setdefault(entity_id, {})["setpoint"] = ts

    def _log_command(self, area_id: str, entity_id: str, command: str,
                     success: bool, detail: str = "") -> None:
        self._append_log_entry(area_id, {
            "timestamp": dt_util.now().isoformat(),
            "entity_id": entity_id,
            "command": command,
            "success": success,
            "detail": detail,
        })

    def _append_log_entry(self, area_id: str, entry: dict) -> None:
        """Append to the area's command log, collapsing consecutive duplicates.

        When the new entry matches the last one on (entity_id, command, success,
        detail), bump `repeat_count` and update `last_timestamp` instead of
        appending. Keeps the log readable when a flood happens (observed:
        about 6000 identical retry failures in one incident would otherwise
        saturate the 1000-cap).
        """
        log = self._get_area_log(area_id)
        if log:
            last = log[-1]
            if (last.get("entity_id") == entry.get("entity_id")
                    and last.get("command") == entry.get("command")
                    and last.get("success") == entry.get("success")
                    and last.get("detail") == entry.get("detail")):
                last["last_timestamp"] = entry["timestamp"]
                last["repeat_count"] = last.get("repeat_count", 1) + 1
                return
        log.append(entry)

    def _load_command_logs(self) -> None:
        """Load persisted command logs from store."""
        stored = self.store.load_command_logs()
        for area_id, entries in stored.items():
            self.command_logs[area_id] = deque(entries, maxlen=self.COMMAND_LOG_MAXLEN)
        _LOGGER.debug("Loaded command logs for %d areas", len(self.command_logs))

    def _save_command_logs(self) -> None:
        """Persist command logs to store."""
        data = {aid: list(log) for aid, log in self.command_logs.items()}
        self.store.save_command_logs(data)

    # --- Feature helpers ---

    def _get_health_feature(self):
        """Get the DeviceHealthFeature instance."""
        from .features.device_health import DeviceHealthFeature
        return next(
            (f for f in self._danfoss_features if isinstance(f, DeviceHealthFeature)),
            None,
        )

    def _get_window_state(self, area_id: str) -> bool | None:
        """Get window open state for an area."""
        from .features.window_coordination import WindowCoordinationFeature
        feat = next(
            (f for f in self._danfoss_features if isinstance(f, WindowCoordinationFeature)),
            None,
        )
        return feat.get_window_state(area_id) if feat else None

    def _get_preheat_state(self, area_id: str):
        """Return scheduled-prep state dict for an area, or None if not active."""
        active_until = self._preheat_active.get(area_id)
        if active_until is None:
            return None
        now = dt_util.now()
        if active_until <= now:
            return None
        area = self.store.areas.get(area_id)
        if area is None:
            return None
        next_target = self.engine.get_next_scheduled_target(area.materialized_schedule, area, now)
        if next_target is None:
            return {"active_until": active_until.isoformat()}
        upcoming_temp, transition_dt = next_target
        current_sched = self.engine.get_scheduled_target_temp(area.materialized_schedule, area, now)
        warming = current_sched is None or upcoming_temp > current_sched
        return {
            "active_until": active_until.isoformat(),
            "transition_at": transition_dt.isoformat(),
            "upcoming_temp": upcoming_temp,
            "direction": "warming" if warming else "setback",
        }

    def _scan_preheat_on_startup(self, now) -> None:
        """Detect in-progress autonomous preheat so the first tick doesn't overwrite it.

        For each area, check if any TRV is already at the upcoming scheduled target
        within the preheat window. If so, pre-populate _preheat_active.
        """
        for area in self.store.areas.values():
            if area.override is not None:
                continue
            sched = area.materialized_schedule
            next_target = self.engine.get_next_scheduled_target(sched, area, now)
            if next_target is None:
                continue
            upcoming_temp, transition_dt = next_target
            seconds_until = (transition_dt - now).total_seconds()
            if not (0 < seconds_until <= PREHEAT_WINDOW_MIN * 60):
                continue
            # Check if any TRV in this area is already at the upcoming target
            for entity_id in area.climate_entities:
                adapter = self._adapters.get(entity_id)
                if adapter is None:
                    continue
                current = adapter.get_target_temperature()
                if current is not None and abs(current - upcoming_temp) < SETPOINT_MATCH_TOLERANCE:
                    self._preheat_active[area.area_id] = transition_dt
                    _LOGGER.info(
                        "Startup: detected in-progress preheat in %s (%s at %.1f, "
                        "transition to %.1f in %d min)",
                        area.area_id, entity_id, current, upcoming_temp,
                        int(seconds_until / 60),
                    )
                    break

    def _get_boiler_state(self):
        """Get boiler state dict."""
        from .features.boiler_control import BoilerControlFeature
        feat = next(
            (f for f in self._danfoss_features if isinstance(f, BoilerControlFeature)),
            None,
        )
        return feat.get_boiler_state() if feat else None

    async def async_on_device_error_recovery(self, entity_id: str) -> None:
        """Re-sync a device after error recovery (e.g., E10 cleared)."""
        _LOGGER.info("Triggering re-sync for %s after error recovery", entity_id)
        area_id = None
        for area in self.store.areas.values():
            if entity_id in area.climate_entities:
                area_id = area.area_id
                break
        if area_id:
            self._log_command(area_id, entity_id, "resync", True, "Error recovery re-sync")

        for feature in self._danfoss_features:
            try:
                if hasattr(feature, "async_sync_device"):
                    await feature.async_sync_device(entity_id)
                if hasattr(feature, "async_push_device"):
                    await feature.async_push_device(entity_id)
            except Exception:
                _LOGGER.exception(
                    "Re-sync failed for %s in %s", entity_id, type(feature).__name__
                )

    # --- Actions ---

    async def async_set_override(
        self,
        area_id: str,
        temp: float,
        until: str | None = "next_transition",
    ) -> None:
        """Set a temperature override on an area.

        If the requested temp matches what the schedule already wants,
        clear the override instead - no point overriding to the same value.
        """
        area = self.store.areas.get(area_id)
        if area is None:
            return

        # Check if this override is redundant (matches scheduled target)
        now = dt_util.now()
        self._ensure_materialized(area, now)
        schedule_state = self.engine.get_current_state(area.materialized_schedule, now)
        scheduled_temp = area.home_temp if schedule_state == STATE_HOME else area.away_temp
        if abs(temp - scheduled_temp) < 0.05:
            area.override = None
        else:
            area.override = Override(temp=temp, until=until)
        # Manual override supersedes autonomous preheat tracking
        self._preheat_active.pop(area_id, None)
        self.store.async_save()
        self._notify_listeners()
        self.hass.async_create_task(self._apply_area_now(area))

    async def async_clear_override(self, area_id: str) -> None:
        """Clear an area's override."""
        area = self.store.areas.get(area_id)
        if area is None:
            return
        area.override = None
        self.store.async_save()
        self._notify_listeners()
        self.hass.async_create_task(self._apply_area_now(area))

    async def async_set_area_state(self, area_id: str, state: str) -> None:
        """Chop the materialized schedule - user clicked Home/Away."""
        area = self.store.areas.get(area_id)
        if area is None:
            return

        now = dt_util.now()
        self._ensure_materialized(area, now)

        if area.materialized_schedule:
            area.materialized_schedule = self.engine.insert_user_entry(
                area.materialized_schedule, state, now
            )

        # Clear any temp override when changing state
        area.override = None
        # Manual state change supersedes autonomous preheat tracking
        self._preheat_active.pop(area_id, None)
        self.store.async_save()
        self._notify_listeners()
        self.hass.async_create_task(self._apply_area_now(area))

    async def async_set_area_enabled(self, area_id: str, enabled: bool) -> None:
        """Enable or disable an area."""
        area = self.store.areas.get(area_id)
        if area is None:
            return
        area.enabled = enabled
        if not enabled:
            area.override = None
        self.store.async_save()
        self._notify_listeners()
        self.hass.async_create_task(self._apply_area_now(area))

    async def async_resume_schedule(self, area_id: str) -> None:
        """Resume following the schedule after user overrides.

        Clears the temp override and any user chops in the materialized schedule,
        regenerating it from the template. Use this when the user wants to undo
        their manual home/away changes and go back to normal schedule behavior.
        """
        area = self.store.areas.get(area_id)
        if area is None:
            return

        now = dt_util.now()
        template = self._get_effective_schedule(area)
        if template:
            area.materialized_schedule = self.engine.materialize_schedule(
                template, self._get_effective_schedule_id(area), now
            )
        area.override = None
        self._preheat_active.pop(area_id, None)
        self.store.async_save()
        self._notify_listeners()
        self.hass.async_create_task(self._apply_area_now(area))

    async def async_sync_schedule(self, area_id: str) -> None:
        """Sync the materialized schedule from the template.

        Regenerates the materialized schedule from the schedule template.
        Use this when the template has been edited and the user wants today's
        concrete schedule to reflect those changes. Unlike resume, this is not
        about undoing user actions - it's about pulling upstream template changes.
        Also clears any temp override since the schedule context has changed.
        """
        area = self.store.areas.get(area_id)
        if area is None:
            return

        now = dt_util.now()
        template = self._get_effective_schedule(area)
        if template:
            area.materialized_schedule = self.engine.materialize_schedule(
                template, self._get_effective_schedule_id(area), now
            )
        area.override = None
        self.store.async_save()
        self._notify_listeners()
        self.hass.async_create_task(self._apply_area_now(area))

    async def async_set_vacation(
        self, enabled: bool, schedule_id: str | None = None
    ) -> None:
        """Set vacation mode globally.

        When enabled, all areas follow the vacation schedule instead of their own.
        Clears overrides and force-rematerializes all areas.
        """
        if schedule_id is not None:
            self.store.global_config.vacation_schedule_id = schedule_id
        self.store.global_config.vacation_mode = enabled

        # Force rematerialize all areas from the new effective schedule
        now = dt_util.now()
        for area in self.store.areas.values():
            area.override = None
            template = self._get_effective_schedule(area)
            if template:
                area.materialized_schedule = self.engine.materialize_schedule(
                    template, self._get_effective_schedule_id(area), now
                )

        self.store.async_save()
        self._notify_listeners()
        self.hass.async_create_task(self._apply_all_areas_now())
        # Vacation mode changes the EFFECTIVE schedule for every area - push the
        # new on-device schedule so a Zigbee outage still fails over correctly.
        self.hass.async_create_task(
            self._notify_schedule_push(list(self.store.areas.keys()))
        )

    async def async_trigger_home(self) -> None:
        """Set all enabled areas to home by chopping their schedules."""
        self._auto_away_active = False
        self._cancel_away_timer()
        now = dt_util.now()
        for area in self.store.areas.values():
            if not area.enabled:
                continue
            self._ensure_materialized(area, now)
            if area.materialized_schedule:
                area.materialized_schedule = self.engine.insert_user_entry(
                    area.materialized_schedule, STATE_HOME, now
                )
            area.override = None
        self.store.async_save()
        self._notify_listeners()
        self.hass.async_create_task(self._apply_all_areas_now())

    async def async_trigger_away(self) -> None:
        """Set all enabled areas to away by chopping their schedules."""
        now = dt_util.now()
        for area in self.store.areas.values():
            if not area.enabled:
                continue
            self._ensure_materialized(area, now)
            if area.materialized_schedule:
                area.materialized_schedule = self.engine.insert_user_entry(
                    area.materialized_schedule, STATE_AWAY, now
                )
            area.override = None
        self.store.async_save()
        self._notify_listeners()
        self.hass.async_create_task(self._apply_all_areas_now())

    async def _apply_area_now(self, area: AreaConfig) -> None:
        """Apply the current target to an area, then notify when done."""
        now = dt_util.now()
        await self._evaluate_area(area, now)
        # Always notify - even if no Zigbee command was sent, the UI needs to
        # know the devices are in sync (clears "Applying to devices..." indicator)
        self._notify_listeners()

    async def _apply_all_areas_now(self) -> None:
        """Immediately apply targets to all areas."""
        now = dt_util.now()
        changed = False
        for area in list(self.store.areas.values()):
            if await self._evaluate_area(area, now):
                changed = True
        if changed:
            self._notify_listeners()

    # --- State ---

    def get_area_state(self, area_id: str) -> dict[str, Any] | None:
        """Build the state dict for a single area."""
        area = self.store.areas.get(area_id)
        if area is None:
            return None
        return self._build_area_state(area)

    def get_full_state(self) -> dict[str, Any]:
        """Build the full state dict for all areas and global config."""
        now = dt_util.now()
        areas_state = {}
        for area_id, area in self.store.areas.items():
            areas_state[area_id] = self._build_area_state(area, now)

        global_dict = self.store.global_config.to_dict()
        global_dict["auto_away_active"] = self._auto_away_active
        global_dict["boiler_state"] = self._get_boiler_state()

        return {
            "areas": areas_state,
            "schedules": {
                sid: sched.to_dict()
                for sid, sched in self.store.schedules.items()
            },
            "groups": {
                gid: group.to_dict()
                for gid, group in self.store.groups.items()
            },
            "global": global_dict,
        }

    def _build_area_state(self, area: AreaConfig, now=None) -> dict[str, Any]:
        """Build state dict for an area."""
        if now is None:
            now = dt_util.now()

        # Compute effective state
        computed = self.engine.compute_area_state(
            area, self.store.global_config, now
        )

        # Next transition from materialized schedule
        next_trans = self.engine.get_next_transition(area.materialized_schedule, now)
        next_transition = None
        if next_trans:
            dt, state = next_trans
            next_transition = {
                "time": dt.isoformat(),
                "temp": area.home_temp if state == STATE_HOME else area.away_temp,
            }

        # Today's materialized schedule entries for the schedule bar
        today_schedule = self.engine.get_today_entries(area.materialized_schedule, now)

        # Device states
        from .adapters.danfoss_ally import DanfossAllyAdapter
        devices = []
        for entity_id in area.climate_entities:
            adapter = self._adapters.get(entity_id)
            if adapter:
                is_danfoss = isinstance(adapter, DanfossAllyAdapter)
                zigbee_backend = None
                if is_danfoss and adapter.backend:
                    from .adapters.zigbee.zha_backend import ZHABackend
                    from .adapters.zigbee.z2m_backend import Z2MBackend
                    if isinstance(adapter.backend, ZHABackend):
                        zigbee_backend = "zha"
                    elif isinstance(adapter.backend, Z2MBackend):
                        zigbee_backend = "z2m"
                device_dict = {
                    "entity_id": entity_id,
                    "current_temp": adapter.get_current_temperature(),
                    "target_temp": adapter.get_target_temperature(),
                    "battery": adapter.get_battery_level(),
                    "covered": entity_id in area.covered_entities,
                    "adapter_type": "danfoss_ally" if is_danfoss else "generic",
                    "zigbee_backend": zigbee_backend,
                    "feature_status": self.feature_status.get(entity_id, {}),
                    **adapter.get_device_info(),
                }
                # Merge diagnostics from health feature
                health = self._get_health_feature()
                if health:
                    diag = health.get_device_diagnostics(entity_id)
                    if diag:
                        device_dict["diagnostics"] = diag
                devices.append(device_dict)

        # Area current temp from sensors (average) or average of devices
        current_temp = None
        if area.temperature_sensors:
            sensor_temps = []
            for sensor_id in area.temperature_sensors:
                ha_state = self.hass.states.get(sensor_id)
                if ha_state and ha_state.state not in ("unknown", "unavailable"):
                    try:
                        sensor_temps.append(float(ha_state.state))
                    except ValueError:
                        pass
            if sensor_temps:
                current_temp = sum(sensor_temps) / len(sensor_temps)
        if current_temp is None and devices:
            temps = [d["current_temp"] for d in devices if d["current_temp"] is not None]
            if temps:
                current_temp = sum(temps) / len(temps)

        # Build temperature sensor details (with battery from sibling entities)
        from homeassistant.helpers import entity_registry as er, device_registry as dr
        entity_reg = er.async_get(self.hass)
        device_reg = dr.async_get(self.hass)
        temp_sensor_details = []
        for sensor_id in area.temperature_sensors:
            ha_state = self.hass.states.get(sensor_id)
            detail: dict[str, Any] = {
                "entity_id": sensor_id,
                "friendly_name": ha_state.attributes.get("friendly_name", sensor_id) if ha_state else sensor_id,
                "current_temp": None,
                "battery": None,
            }
            if ha_state and ha_state.state not in ("unknown", "unavailable"):
                try:
                    detail["current_temp"] = float(ha_state.state)
                except ValueError:
                    pass
            # Check for battery attribute first, then sibling battery entity
            if ha_state and "battery" in ha_state.attributes:
                detail["battery"] = ha_state.attributes["battery"]
            else:
                entity_entry = entity_reg.async_get(sensor_id)
                if entity_entry and entity_entry.device_id:
                    for entry in entity_reg.entities.get_entries_for_device_id(entity_entry.device_id):
                        if entry.original_device_class == "battery" or entry.entity_id.endswith("_battery"):
                            batt_state = self.hass.states.get(entry.entity_id)
                            if batt_state and batt_state.state not in ("unknown", "unavailable"):
                                try:
                                    detail["battery"] = round(float(batt_state.state))
                                except ValueError:
                                    pass
                                break
            temp_sensor_details.append(detail)

        # Resolve area name from HA area registry
        area_reg = ar.async_get(self.hass)
        ha_area = area_reg.async_get_area(area.area_id)
        name = ha_area.name if ha_area else area.area_id

        group = self.store.get_group_for_area(area.area_id)

        return {
            "area_id": area.area_id,
            "name": name,
            "group_id": group.group_id if group else None,
            "current_temp": current_temp,
            "target_temp": computed["target_temp"],
            "effective_state": computed["effective_state"],
            "schedule_state": computed["schedule_state"],
            "following_schedule": computed["following_schedule"],
            "enabled": area.enabled,
            "override": area.override.to_dict() if area.override else None,
            "next_transition": next_transition,
            "today_schedule": today_schedule,
            "home_temp": area.home_temp,
            "away_temp": area.away_temp,
            "min_temp": area.min_temp,
            "max_temp": area.max_temp,
            "temperature_sensors": area.temperature_sensors,
            "temperature_sensor_details": temp_sensor_details,
            "schedule_id": area.schedule_id,
            "climate_entities": area.climate_entities,
            "covered_entities": area.covered_entities,
            "window_sensors": area.window_sensors,
            "window_open": self._get_window_state(area.area_id),
            "preheat": self._get_preheat_state(area.area_id),
            "devices": devices,
            "device_count": len(area.climate_entities),
        }

    # --- Presence-based auto-away ---

    async def async_setup_presence_tracking(self) -> None:
        """Set up or tear down presence tracking based on config."""
        self._teardown_presence_tracking()

        config = self.store.global_config
        if not config.auto_away_enabled or not config.presence_entities:
            self._auto_away_active = False
            return

        # Filter to entities that exist
        valid = [eid for eid in config.presence_entities if self.hass.states.get(eid)]
        missing = set(config.presence_entities) - set(valid)
        if missing:
            _LOGGER.warning("Presence entities not found: %s", missing)
        if not valid:
            return

        self._presence_unsub = async_track_state_change_event(
            self.hass, valid, self._handle_presence_change
        )
        _LOGGER.info("Presence tracking set up for %s", valid)

        # Check current state immediately
        if not self._is_anyone_home():
            self._start_away_timer()

    def _teardown_presence_tracking(self) -> None:
        """Remove presence tracking subscriptions and timers."""
        if self._presence_unsub:
            self._presence_unsub()
            self._presence_unsub = None
        self._cancel_away_timer()

    @callback
    def _handle_presence_change(self, event) -> None:
        """Handle presence entity state changes."""
        new_state = event.data.get("new_state")
        if new_state is None:
            return

        anyone_home = self._is_anyone_home()
        if anyone_home:
            self._cancel_away_timer()
            if self._auto_away_active:
                self.hass.async_create_task(self._async_resume_from_auto_away())
        else:
            if not self._auto_away_active:
                self._start_away_timer()

    def _is_anyone_home(self) -> bool:
        """Check if ANY tracked presence entity reports home."""
        for entity_id in self.store.global_config.presence_entities:
            state = self.hass.states.get(entity_id)
            if state and self._is_entity_home(state):
                return True
        return False

    @staticmethod
    def _is_entity_home(state) -> bool:
        """Determine if a single presence entity indicates 'home'."""
        entity_id = state.entity_id
        if entity_id.startswith("person.") or entity_id.startswith("group."):
            return state.state == "home"
        if entity_id.startswith("binary_sensor.") or entity_id.startswith("input_boolean."):
            return state.state == "on"
        return state.state == "home"

    @callback
    def _start_away_timer(self) -> None:
        """Start the auto-away delay timer."""
        self._cancel_away_timer()
        delay = self.store.global_config.auto_away_delay_minutes * 60
        self._auto_away_timer_unsub = async_call_later(
            self.hass, delay, self._auto_away_timer_fired
        )
        _LOGGER.debug("Auto-away timer started, delay=%d seconds", delay)

    @callback
    def _cancel_away_timer(self) -> None:
        """Cancel the pending auto-away timer."""
        if self._auto_away_timer_unsub:
            self._auto_away_timer_unsub()
            self._auto_away_timer_unsub = None

    @callback
    def _auto_away_timer_fired(self, _now) -> None:
        """Timer expired - trigger auto-away."""
        self._auto_away_timer_unsub = None
        self._auto_away_active = True
        _LOGGER.info("Auto-away activated")
        self.hass.async_create_task(self.async_trigger_away())
        self._notify_listeners()

    async def _async_resume_from_auto_away(self) -> None:
        """Resume all area schedules after auto-away ends."""
        _LOGGER.info("Auto-away deactivated, resuming schedules")
        self._auto_away_active = False
        for area_id in list(self.store.areas.keys()):
            await self.async_resume_schedule(area_id)

    async def async_on_global_config_changed(self, changed_keys: set[str]) -> None:
        """React to global config changes."""
        presence_keys = {"presence_entities", "auto_away_enabled", "auto_away_delay_minutes"}
        if changed_keys & presence_keys:
            await self.async_setup_presence_tracking()

    # --- Listener system ---

    @callback
    def add_listener(self, listener: Callable[[], None]) -> Callable[[], None]:
        """Add a state change listener. Returns unsubscribe function."""
        self._listeners.append(listener)

        @callback
        def remove_listener() -> None:
            if listener in self._listeners:
                self._listeners.remove(listener)

        return remove_listener

    # --- Danfoss feature triggers ---

    async def async_on_schedule_changed(self, schedule_id: str) -> None:
        """Notify Danfoss features that a schedule was edited."""
        affected_areas = set()
        # Direct area references
        for area in self.store.areas.values():
            if area.schedule_id == schedule_id:
                affected_areas.add(area.area_id)
        # Group references
        for group in self.store.groups.values():
            if group.schedule_id == schedule_id:
                affected_areas.update(group.area_ids)
        await self._notify_schedule_push(list(affected_areas))

    async def async_on_group_schedule_changed(self, group_id: str) -> None:
        """Rematerialize all areas in a group when the group's schedule changes."""
        group = self.store.groups.get(group_id)
        if not group:
            return
        now = dt_util.now()
        for area_id in group.area_ids:
            area = self.store.areas.get(area_id)
            if area:
                template = self._get_effective_schedule(area)
                if template:
                    area.materialized_schedule = self.engine.materialize_schedule(
                        template, self._get_effective_schedule_id(area), now
                    )
                area.override = None
        self.store.async_save()
        self._notify_listeners()
        self.hass.async_create_task(self._apply_all_areas_now())
        await self._notify_schedule_push(list(group.area_ids))

    async def _notify_schedule_push(self, area_ids: list[str]) -> None:
        """Tell Danfoss features (schedule_push) to re-push affected areas' on-device schedule."""
        for feature in self._danfoss_features:
            if hasattr(feature, "async_on_schedule_changed"):
                await feature.async_on_schedule_changed(area_ids)

    async def async_on_area_temps_changed(self, area_id: str) -> None:
        """Notify Danfoss features that area temps changed (re-push schedule)."""
        for feature in self._danfoss_features:
            if hasattr(feature, "async_on_area_temps_changed"):
                await feature.async_on_area_temps_changed(area_id)

    async def async_on_covered_entities_changed(self, area: AreaConfig) -> None:
        """Write radiator_covered attribute to all Danfoss TRVs in the area."""
        for feature in self._danfoss_features:
            if hasattr(feature, "async_set_radiator_covered"):
                for entity_id in area.climate_entities:
                    covered = entity_id in area.covered_entities
                    try:
                        await feature.async_set_radiator_covered(entity_id, covered)
                    except Exception:
                        _LOGGER.exception(
                            "Failed to set radiator_covered on %s", entity_id
                        )

    @callback
    def _notify_listeners(self) -> None:
        """Notify all listeners of state changes."""
        for listener in list(self._listeners):
            try:
                listener()
            except Exception:
                _LOGGER.exception("Error in state listener")
