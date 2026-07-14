"""Device health monitoring for Danfoss Ally TRVs.

Reads diagnostic attributes from sibling HA entities (not via Zigbee reads),
detects error conditions (E10 motor stuck, etc.), and triggers automatic
re-sync (schedule push + time sync) when errors clear.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import TYPE_CHECKING, Any

from . import DanfossFeature

if TYPE_CHECKING:
    from ..coordinator import HearthCoordinator

_LOGGER = logging.getLogger(__name__)

# Check every 5 ticks = 5 minutes
HEALTH_CHECK_INTERVAL_TICKS = 5

# Diagnostics to read from sibling entities
DIAGNOSTIC_NAMES = [
    "software_error",
    "pi_heating_demand",
    "setpoint_change_source",
    "adaptation_run_status",
    "preheat_status",
    "preheat_time",
    "motor_step_counter",
    "linkquality",
]


class DeviceHealthFeature(DanfossFeature):
    """Monitor Danfoss TRV health via sibling HA entities."""

    def __init__(self, *args, coordinator: HearthCoordinator, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._coordinator = coordinator
        # entity_id -> cached diagnostics dict
        self._device_diagnostics: dict[str, dict[str, Any]] = {}
        # entity_id -> last known error string (for transition detection)
        self._previous_errors: dict[str, str | None] = {}
        # entity_id -> last known setpoint source (avoid repeated warnings)
        self._last_source: dict[str, str | None] = {}

    async def async_tick(self, now: datetime, tick_count: int) -> None:
        if tick_count % HEALTH_CHECK_INTERVAL_TICKS != 0:
            return

        for area in self.store.areas.values():
            if not area.enabled:
                continue
            for entity_id in self._get_danfoss_entities(area):
                try:
                    await self._check_device(entity_id, now)
                except Exception:
                    _LOGGER.exception("Health check failed for %s", entity_id)

    async def _check_device(self, entity_id: str, now: datetime) -> None:
        diag: dict[str, Any] = {}

        # Read all diagnostic values from sibling entities
        for name in DIAGNOSTIC_NAMES:
            val = self._read_sibling_state(entity_id, name)
            diag[name] = val

        # Parse numeric values
        for name in ("pi_heating_demand", "motor_step_counter", "linkquality"):
            raw = diag.get(name)
            if raw is not None:
                try:
                    diag[name] = int(float(raw))
                except (ValueError, TypeError):
                    pass

        # Derive error state.
        # ZHA reports "nothing" for no error, Z2M reports "Good".
        # Only flag known error patterns (E1, E2, ..., E10, etc.)
        sw_error = diag.get("software_error")
        has_error = (
            sw_error is not None
            and sw_error.lower() not in ("good", "nothing", "none", "ok")
        )
        diag["has_error"] = has_error
        diag["error_code"] = sw_error if has_error else None

        self._device_diagnostics[entity_id] = diag

        # Detect error transitions
        prev_error = self._previous_errors.get(entity_id)
        if has_error and not prev_error:
            # New error detected
            self._log_command(
                entity_id, "health_error", False,
                f"Error detected: {sw_error}",
            )
            _LOGGER.warning("Danfoss error on %s: %s", entity_id, sw_error)
        elif not has_error and prev_error:
            # Error cleared - trigger re-sync
            self._log_command(
                entity_id, "health_recovery", True,
                f"Error cleared (was: {prev_error}), triggering re-sync",
            )
            _LOGGER.info("Danfoss error cleared on %s (was: %s), re-syncing", entity_id, prev_error)
            await self._coordinator.async_on_device_error_recovery(entity_id)

        self._previous_errors[entity_id] = sw_error if has_error else None

        # Detect setpoint source changes.
        # "External" / "Externally" = our integration (good)
        # "Schedule" = on-device pushed schedule (also good, we pushed it)
        # "Manual" = user turned the TRV dial (flag it)
        source = diag.get("setpoint_change_source")
        prev_source = self._last_source.get(entity_id)
        expected_sources = ("External", "Externally", "Schedule")
        if source and source not in expected_sources and source != prev_source:
            self._log_command(
                entity_id, "health_source_change", False,
                f"Setpoint changed by '{source}' (manual intervention)",
            )
            _LOGGER.warning(
                "Setpoint on %s changed by '%s' (manual intervention)",
                entity_id, source,
            )
        self._last_source[entity_id] = source

    def get_device_diagnostics(self, entity_id: str) -> dict[str, Any] | None:
        """Return cached diagnostics for a device."""
        return self._device_diagnostics.get(entity_id)

    def get_all_diagnostics(self) -> dict[str, dict[str, Any]]:
        """Return all cached diagnostics."""
        return dict(self._device_diagnostics)
