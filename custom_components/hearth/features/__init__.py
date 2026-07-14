"""Danfoss-specific feature modules."""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from collections import deque
from datetime import datetime
from typing import TYPE_CHECKING, Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er
from homeassistant.util import dt as dt_util

if TYPE_CHECKING:
    from ..adapters.base import DeviceAdapter
    from ..adapters.zigbee.base import ZigbeeBackend
    from ..store import HearthStore

_LOGGER = logging.getLogger(__name__)

COMMAND_LOG_MAXLEN = 1000

# Suffix patterns for finding sibling diagnostic entities on the same device.
# Each diagnostic name maps to a list of entity_id suffixes to try.
DIAGNOSTIC_ENTITY_SUFFIXES: dict[str, list[str]] = {
    "software_error": ["_software_error"],
    "pi_heating_demand": ["_pi_heating_demand"],
    "setpoint_change_source": ["_setpoint_change_source"],
    "adaptation_run_status": ["_adaptation_run_status"],
    "preheat_status": ["_preheat_status", "_pre_heat_status"],
    "preheat_time": ["_preheat_time", "_pre_heat_time"],
    "motor_step_counter": ["_motor_step_counter", "_motor_stepcount"],
    "linkquality": ["_linkquality", "_lqi"],
    "load_estimate": ["_load_estimate"],
    "window_open": ["_window_open"],
}


class DanfossFeature(ABC):
    """Base class for Danfoss-specific periodic features."""

    def __init__(
        self,
        hass: HomeAssistant,
        store: HearthStore,
        adapters: dict[str, DeviceAdapter],
        command_logs: dict[str, deque[dict]],
        feature_status: dict[str, dict[str, str]] | None = None,
    ) -> None:
        self.hass = hass
        self.store = store
        self.adapters = adapters
        self._command_logs = command_logs
        self._feature_status = feature_status or {}
        # Cache: climate_entity_id -> {diagnostic_name: sibling_entity_id}
        self._sibling_cache: dict[str, dict[str, str]] = {}

    # --- Sibling entity resolution ---

    def _build_sibling_cache(self, climate_entity_id: str) -> dict[str, str]:
        """Find diagnostic sibling entities on the same device as a climate entity.

        ZHA and Z2M both expose Danfoss attributes as separate HA entities
        (sensor.*, binary_sensor.*, etc.) on the same device. This finds them
        by matching entity_id suffix patterns, same approach as battery resolution.
        """
        if climate_entity_id in self._sibling_cache:
            return self._sibling_cache[climate_entity_id]

        result: dict[str, str] = {}
        entity_reg = er.async_get(self.hass)
        entity_entry = entity_reg.async_get(climate_entity_id)
        if not entity_entry or not entity_entry.device_id:
            self._sibling_cache[climate_entity_id] = result
            return result

        # Get all entities on the same device
        device_entities = er.async_entries_for_device(
            entity_reg, entity_entry.device_id
        )

        # Match each diagnostic name by suffix
        for diag_name, suffixes in DIAGNOSTIC_ENTITY_SUFFIXES.items():
            for entry in device_entities:
                eid = entry.entity_id
                for suffix in suffixes:
                    if eid.endswith(suffix):
                        result[diag_name] = eid
                        break
                if diag_name in result:
                    break

        self._sibling_cache[climate_entity_id] = result
        if result:
            _LOGGER.debug(
                "Sibling entities for %s: %s",
                climate_entity_id,
                {k: v for k, v in result.items()},
            )
        return result

    def _read_sibling_state(
        self, climate_entity_id: str, diagnostic_name: str
    ) -> str | None:
        """Read the state of a sibling diagnostic entity."""
        siblings = self._build_sibling_cache(climate_entity_id)
        sibling_eid = siblings.get(diagnostic_name)
        if sibling_eid is None:
            return None
        state = self.hass.states.get(sibling_eid)
        if state is None or state.state in ("unavailable", "unknown"):
            return None
        return state.state

    def _read_sibling_numeric(
        self, climate_entity_id: str, diagnostic_name: str
    ) -> float | None:
        """Read a numeric value from a sibling diagnostic entity."""
        val = self._read_sibling_state(climate_entity_id, diagnostic_name)
        if val is None:
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    # --- Area resolution ---

    def _resolve_area_id(self, entity_id: str) -> str | None:
        """Find the area_id that contains this entity."""
        for area in self.store.areas.values():
            if entity_id in area.climate_entities:
                return area.area_id
        return None

    def _get_area_log(self, area_id: str) -> deque[dict]:
        """Get or create the command log deque for an area."""
        if area_id not in self._command_logs:
            self._command_logs[area_id] = deque(maxlen=COMMAND_LOG_MAXLEN)
        return self._command_logs[area_id]

    def _log_command(
        self, entity_id: str, command: str, success: bool, detail: str = ""
    ) -> None:
        """Append an entry to the per-area command audit log.

        Consecutive duplicates collapse: if the new entry matches the last one
        on (entity_id, command, success, detail), bump `repeat_count` and update
        `last_timestamp` rather than appending. Avoids saturating the 1000-cap
        deque during retry storms.
        """
        ts = dt_util.now().isoformat()
        area_id = self._resolve_area_id(entity_id) or "_unknown"
        log = self._get_area_log(area_id)
        if log:
            last = log[-1]
            if (last.get("entity_id") == entity_id
                    and last.get("command") == command
                    and last.get("success") == success
                    and last.get("detail") == detail):
                last["last_timestamp"] = ts
                last["repeat_count"] = last.get("repeat_count", 1) + 1
                if success:
                    self._feature_status.setdefault(entity_id, {})[command] = ts
                return
        log.append({
            "timestamp": ts,
            "entity_id": entity_id,
            "command": command,
            "success": success,
            "detail": detail,
        })
        if success:
            self._feature_status.setdefault(entity_id, {})[command] = ts

    def _is_entity_available(self, entity_id: str) -> bool:
        """Return False when the climate entity is unavailable/unknown.

        Used by feature ticks to skip backend writes during Zigbee outages.
        """
        state = self.hass.states.get(entity_id)
        return state is not None and state.state not in ("unavailable", "unknown")

    @abstractmethod
    async def async_tick(self, now: datetime, tick_count: int) -> None:
        """Called every 60s with the current time and monotonic tick count.

        Use tick_count to implement sub-frequencies:
        - Every tick (60s): tick_count % 1 == 0
        - Every 5 min:      tick_count % 5 == 0
        - Every 15 min:     tick_count % 15 == 0
        - Every 24 hours:   tick_count % 1440 == 0
        """

    def _get_danfoss_entities(self, area) -> list[str]:
        """Return entity_ids in an area that use DanfossAllyAdapter."""
        from ..adapters.danfoss_ally import DanfossAllyAdapter

        return [
            eid for eid in area.climate_entities
            if isinstance(self.adapters.get(eid), DanfossAllyAdapter)
        ]

    def _get_backend(self, entity_id: str) -> ZigbeeBackend | None:
        """Get the Zigbee backend for a specific entity from its adapter."""
        from ..adapters.danfoss_ally import DanfossAllyAdapter

        adapter = self.adapters.get(entity_id)
        if isinstance(adapter, DanfossAllyAdapter):
            return adapter.backend
        return None
