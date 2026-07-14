"""External temperature injection for Danfoss Ally TRVs."""

from __future__ import annotations

import logging
from datetime import datetime

from . import DanfossFeature
from ..danfoss_const import (
    ATTR_EXTERNAL_MEASURED_ROOM_SENSOR,
    ATTR_RADIATOR_COVERED,
    CLUSTER_THERMOSTAT,
    DANFOSS_MFR_CODE,
)

_LOGGER = logging.getLogger(__name__)


class ExternalTempFeature(DanfossFeature):
    """Inject external room sensor temperature into Danfoss TRVs."""

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        # Per-entity tracking: entity_id -> (last_temp_sent, last_send_time)
        self._last_sent: dict[str, tuple[float, datetime]] = {}

    async def async_tick(self, now: datetime, tick_count: int) -> None:
        """Evaluate all areas every tick (60s). Rate limiting is per-entity."""
        for area in self.store.areas.values():
            if not area.enabled:
                continue
            try:
                await self._update_area(area, now)
            except Exception:
                _LOGGER.exception(
                    "External temp error for area %s", area.area_id
                )

    async def _update_area(self, area, now: datetime) -> None:
        if not area.temperature_sensors:
            return

        current_temp = self._get_average_sensor_temp(area)
        if current_temp is None:
            return

        for entity_id in self._get_danfoss_entities(area):
            backend = self._get_backend(entity_id)
            if backend is None:
                continue
            if not self._is_entity_available(entity_id):
                continue
            covered = entity_id in area.covered_entities
            if self._should_send(entity_id, current_temp, covered, now):
                value = int(current_temp * 100)
                try:
                    await backend.async_write_attribute(
                        entity_id,
                        CLUSTER_THERMOSTAT,
                        ATTR_EXTERNAL_MEASURED_ROOM_SENSOR,
                        value,
                        manufacturer=DANFOSS_MFR_CODE,
                    )
                    self._last_sent[entity_id] = (current_temp, now)
                    self._log_command(
                        entity_id, "external_temp", True,
                        f"{current_temp:.1f}°C (raw={value}, covered={covered})",
                    )
                    _LOGGER.debug(
                        "External temp %s: %.1f°C (value=%d, covered=%s)",
                        entity_id, current_temp, value, covered,
                    )
                except Exception as exc:
                    self._log_command(entity_id, "external_temp", False, str(exc))
                    _LOGGER.exception("Failed to send external temp to %s", entity_id)

    def _should_send(
        self, entity_id: str, temp: float, covered: bool, now: datetime
    ) -> bool:
        """Rate limiting per Danfoss spec."""
        if entity_id not in self._last_sent:
            return True

        last_temp, last_time = self._last_sent[entity_id]
        elapsed = (now - last_time).total_seconds()
        temp_change = abs(temp - last_temp)

        if covered:
            # Covered radiator mode:
            # Min interval: 5 min with >= 0.1K change
            # Max interval: 30 min (must send before 35min timeout)
            if elapsed >= 1500:  # 25 min (safe margin)
                return True
            if elapsed >= 300 and temp_change >= 0.1:
                return True
        else:
            # Auto offset mode:
            # Min interval: 30 min with >= 0.1K change
            # Max interval: 3 hours (must send before 3h timeout)
            if elapsed >= 9000:  # 2.5h (safe margin)
                return True
            if elapsed >= 1800 and temp_change >= 0.1:
                return True

        return False

    def _get_average_sensor_temp(self, area) -> float | None:
        temps = []
        for sensor_id in area.temperature_sensors:
            state = self.hass.states.get(sensor_id)
            if state and state.state not in ("unavailable", "unknown"):
                try:
                    temps.append(float(state.state))
                except ValueError:
                    pass
        if not temps:
            return None
        return sum(temps) / len(temps)

    async def async_set_radiator_covered(
        self, entity_id: str, covered: bool
    ) -> None:
        """Write the radiator_covered attribute to a TRV."""
        backend = self._get_backend(entity_id)
        if backend is None:
            return
        if not self._is_entity_available(entity_id):
            return
        await backend.async_write_attribute(
            entity_id,
            CLUSTER_THERMOSTAT,
            ATTR_RADIATOR_COVERED,
            covered,
            manufacturer=DANFOSS_MFR_CODE,
        )
