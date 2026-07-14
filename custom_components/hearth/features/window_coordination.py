"""Window coordination for Danfoss Ally TRVs.

UNTESTED: No window sensors available for testing.

When configured window sensors report open, writes ATTR_EXTERNAL_OPEN_WINDOW_DETECTED
to Danfoss TRVs so they reduce heating. Resets on window close.
"""

from __future__ import annotations

import logging
from datetime import datetime

from . import DanfossFeature
from ..danfoss_const import (
    ATTR_EXTERNAL_OPEN_WINDOW_DETECTED,
    CLUSTER_THERMOSTAT,
    DANFOSS_MFR_CODE,
)

_LOGGER = logging.getLogger(__name__)


class WindowCoordinationFeature(DanfossFeature):
    """Monitor window sensors and write external window state to Danfoss TRVs.

    UNTESTED: This feature has not been tested with real hardware.
    """

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        # area_id -> whether any window is currently open
        self._area_window_state: dict[str, bool] = {}

    async def async_tick(self, now: datetime, tick_count: int) -> None:
        for area in self.store.areas.values():
            if not area.enabled or not area.window_sensors:
                continue
            try:
                await self._check_area(area)
            except Exception:
                _LOGGER.exception(
                    "Window coordination error for area %s", area.area_id
                )

    async def _check_area(self, area) -> None:
        # Determine if any window is open
        any_open = False
        for sensor_id in area.window_sensors:
            state = self.hass.states.get(sensor_id)
            if state and state.state == "on":
                any_open = True
                break

        prev_open = self._area_window_state.get(area.area_id)

        # Only act on state changes
        if any_open == prev_open:
            return

        self._area_window_state[area.area_id] = any_open
        value = "Open" if any_open else "Closed"

        for entity_id in self._get_danfoss_entities(area):
            backend = self._get_backend(entity_id)
            if backend is None:
                continue
            if not self._is_entity_available(entity_id):
                continue
            try:
                from ..adapters.zigbee.z2m_backend import Z2MBackend

                if isinstance(backend, Z2MBackend):
                    await backend.async_write_attribute(
                        entity_id,
                        CLUSTER_THERMOSTAT,
                        ATTR_EXTERNAL_OPEN_WINDOW_DETECTED,
                        value,
                        manufacturer=DANFOSS_MFR_CODE,
                    )
                else:
                    # ZHA: write boolean-ish value (1 = open, 0 = closed)
                    await backend.async_write_attribute(
                        entity_id,
                        CLUSTER_THERMOSTAT,
                        ATTR_EXTERNAL_OPEN_WINDOW_DETECTED,
                        1 if any_open else 0,
                        manufacturer=DANFOSS_MFR_CODE,
                    )
                self._log_command(
                    entity_id, "window_coordination", True,
                    f"Window {value.lower()} in area",
                )
            except Exception as exc:
                self._log_command(
                    entity_id, "window_coordination", False, str(exc),
                )
                _LOGGER.exception(
                    "Failed to set window state on %s", entity_id
                )

        _LOGGER.info(
            "Window %s in area %s: notified %d TRVs",
            value.lower(), area.area_id, len(self._get_danfoss_entities(area)),
        )

    def get_window_state(self, area_id: str) -> bool | None:
        """Return whether any window is open in the area, or None if no sensors."""
        area = self.store.areas.get(area_id)
        if not area or not area.window_sensors:
            return None
        return self._area_window_state.get(area_id, False)
