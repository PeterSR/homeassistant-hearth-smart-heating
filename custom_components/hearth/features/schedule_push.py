"""Push weekly schedules to Danfoss Ally TRV on-device memory."""

from __future__ import annotations

import hashlib
import logging
from datetime import datetime
from typing import TYPE_CHECKING

from . import DanfossFeature
from ..const import DAYS_OF_WEEK
from ..danfoss_const import (
    ATTR_PROGRAMMING_OPERATION_MODE,
    CLUSTER_THERMOSTAT,
    CMD_CLEAR_WEEKLY_SCHEDULE,
    CMD_SET_WEEKLY_SCHEDULE,
    DAY_BITMAP_ZCL,
    PROG_MODE_SCHEDULE_PREHEAT,
)

if TYPE_CHECKING:
    from ..coordinator import HearthCoordinator

_LOGGER = logging.getLogger(__name__)


class SchedulePushFeature(DanfossFeature):
    """Push weekly schedules to Danfoss TRV on-device memory."""

    def __init__(self, *args, coordinator: HearthCoordinator, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._coordinator = coordinator
        # Track pushed schedules: entity_id -> (schedule_id, schedule_hash)
        self._pushed: dict[str, tuple[str | None, int]] = {}
        self._initial_push_done = False
        # Entities skipped because they were unavailable - retried every tick
        # (cheap: gated on a state lookup) until they come back and push.
        self._pending: set[str] = set()

    async def async_tick(self, now: datetime, tick_count: int) -> None:
        if not self._initial_push_done:
            self._initial_push_done = True
            await self._push_all()
            return

        if self._pending:
            await self._retry_pending()

    async def async_on_schedule_changed(self, area_ids: list[str]) -> None:
        """Called when a schedule is edited."""
        for area_id in area_ids:
            area = self.store.areas.get(area_id)
            if area and area.enabled:
                await self._push_area(area)

    async def async_on_area_temps_changed(self, area_id: str) -> None:
        """Called when home_temp or away_temp changes - re-push schedule."""
        area = self.store.areas.get(area_id)
        if area and area.enabled:
            await self._push_area(area)

    async def async_push_device(self, entity_id: str) -> None:
        """Push schedule to a single device (on rejoin / E10 error)."""
        # Clear cache so it re-pushes
        self._pushed.pop(entity_id, None)
        for area in self.store.areas.values():
            if entity_id in area.climate_entities:
                template = self._coordinator._get_effective_schedule(area)
                if template:
                    await self._push_one(entity_id, template, area)
                return

    async def _push_all(self) -> None:
        for area in self.store.areas.values():
            if area.enabled:
                try:
                    await self._push_area(area)
                except Exception:
                    _LOGGER.exception(
                        "Failed to push schedule for area %s", area.area_id
                    )

    async def _push_area(self, area) -> None:
        template = self._coordinator._get_effective_schedule(area)
        if template is None:
            return

        for entity_id in self._get_danfoss_entities(area):
            try:
                await self._push_one(entity_id, template, area)
            except Exception as exc:
                self._log_command(entity_id, "schedule_push", False, str(exc))
                _LOGGER.exception("Failed to push schedule to %s", entity_id)

    async def _retry_pending(self) -> None:
        for entity_id in list(self._pending):
            area_id = self._resolve_area_id(entity_id)
            area = self.store.areas.get(area_id) if area_id else None
            if area is None or not area.enabled:
                self._pending.discard(entity_id)
                continue
            template = self._coordinator._get_effective_schedule(area)
            if template is None:
                continue
            try:
                await self._push_one(entity_id, template, area)
            except Exception as exc:
                self._log_command(entity_id, "schedule_push", False, str(exc))
                _LOGGER.exception("Failed to push schedule to %s", entity_id)

    async def _push_one(self, entity_id: str, schedule, area) -> None:
        backend = self._get_backend(entity_id)
        if backend is None:
            return
        if not self._is_entity_available(entity_id):
            self._pending.add(entity_id)
            return
        self._pending.discard(entity_id)

        from ..adapters.zigbee.z2m_backend import Z2MBackend
        is_z2m = isinstance(backend, Z2MBackend)

        # Always ensure programming_operation_mode = schedule + preheat (value 3).
        # Single attribute write - cheap, idempotent, and necessary for preheat
        # coordination to work even when the schedule itself is unchanged.
        try:
            if is_z2m:
                await backend.async_set_programming_mode(entity_id, "schedule_with_preheat")
            else:
                await backend.async_write_attribute(
                    entity_id,
                    CLUSTER_THERMOSTAT,
                    ATTR_PROGRAMMING_OPERATION_MODE,
                    PROG_MODE_SCHEDULE_PREHEAT,
                )
        except Exception as exc:
            _LOGGER.debug("Failed to set programming mode on %s: %s", entity_id, exc)

        # Check if schedule already pushed (avoid redundant battery-draining writes).
        # Keyed on the EFFECTIVE schedule id (vacation > group > area) - using
        # area.schedule_id here would miss re-pushes when vacation mode or a
        # group schedule changes the schedule actually being applied.
        effective_schedule_id = self._coordinator._get_effective_schedule_id(area)
        schedule_hash = self._hash_schedule(schedule, area.home_temp, area.away_temp)
        cached = self._pushed.get(entity_id)
        if cached and cached == (effective_schedule_id, schedule_hash):
            _LOGGER.debug("Schedule already pushed to %s, skipping", entity_id)
            return

        # Clear existing schedule via raw cluster command - works on both backends.
        # Z2M's high-level clear_weekly_schedule property isn't exposed on the
        # 014G2461 converter, so we go through the raw command path.
        await backend.async_send_cluster_command(
            entity_id, CLUSTER_THERMOSTAT, CMD_CLEAR_WEEKLY_SCHEDULE,
            params={},
        )

        # Push each day
        for day_name in DAYS_OF_WEEK:
            day_sched = schedule.days.get(day_name)
            if not day_sched or not day_sched.entries:
                continue

            transitions = []
            for entry in day_sched.entries:
                minutes = self._time_to_minutes(entry.time)
                if entry.temp == "home":
                    temp_hundredths = int(area.home_temp * 100)
                elif entry.temp == "away":
                    temp_hundredths = int(area.away_temp * 100)
                else:
                    temp_hundredths = int(float(entry.temp) * 100)
                transitions.append((minutes, temp_hundredths))

            transitions.sort(key=lambda t: t[0])
            transitions = transitions[:6]

            day_bitmap = DAY_BITMAP_ZCL.get(day_name, 0)
            if day_bitmap:
                if is_z2m:
                    await backend.async_set_weekly_schedule(
                        entity_id, day_bitmap, transitions,
                    )
                else:
                    await self._send_day_schedule(entity_id, backend, day_bitmap, transitions)

        self._pushed[entity_id] = (effective_schedule_id, schedule_hash)
        self._log_command(
            entity_id, "schedule_push", True,
            f"schedule={effective_schedule_id}, home={area.home_temp}, away={area.away_temp}",
        )
        _LOGGER.info("Schedule pushed to %s", entity_id)

    async def _send_day_schedule(
        self, entity_id: str, backend, day_bitmap: int, transitions: list[tuple[int, int]]
    ) -> None:
        """Send SetWeeklySchedule for a single day.

        ZCL SetWeeklySchedule (cmd 0x01) params:
        - num_of_transitions_for_sequence (uint8)
        - day_of_week_for_sequence (bitmap8)
        - mode_for_sequence (bitmap8) - 0x01 = heat
        - values: flat list of int16 [time1, setpoint1, time2, setpoint2, ...]
        """
        values: list[int] = []
        for minutes, temp in transitions:
            values.extend([minutes, temp])

        await backend.async_send_cluster_command(
            entity_id, CLUSTER_THERMOSTAT, CMD_SET_WEEKLY_SCHEDULE,
            params={
                "num_transitions_for_sequence": len(transitions),
                "day_of_week_for_sequence": day_bitmap,
                "mode_for_sequence": 0x01,  # heat
                "values": values,
            },
        )

    @staticmethod
    def _time_to_minutes(time_str: str) -> int:
        """Convert 'HH:MM' to minutes from midnight."""
        parts = time_str.split(":")
        return int(parts[0]) * 60 + int(parts[1])

    @staticmethod
    def _hash_schedule(schedule, home_temp: float, away_temp: float) -> int:
        """Simple hash of schedule + temps to detect changes."""
        data = f"{schedule.to_dict()}:{home_temp}:{away_temp}"
        return int(hashlib.md5(data.encode()).hexdigest()[:8], 16)
