"""Danfoss Ally device adapter: uses raw Zigbee commands."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant

from ..danfoss_const import (
    CLUSTER_THERMOSTAT,
    CMD_SETPOINT_COMMAND,
    DANFOSS_MFR_CODE,
    SETPOINT_TYPE_PREHEAT,
    SETPOINT_TYPE_SCHEDULE,
    SETPOINT_TYPE_USER,
)
from .base import DeviceAdapter
from .zigbee import ZigbeeBackend, create_zigbee_backend

_LOGGER = logging.getLogger(__name__)


class DanfossAllyAdapter(DeviceAdapter):
    """Adapter for Danfoss Ally TRVs: uses raw Zigbee commands."""

    def __init__(
        self, hass: HomeAssistant, entity_id: str, zigbee_backend_type: str
    ) -> None:
        super().__init__(hass, entity_id)
        self._backend = create_zigbee_backend(hass, zigbee_backend_type)

    @property
    def backend(self) -> ZigbeeBackend | None:
        return self._backend

    async def async_set_temperature(self, temperature: float, **kwargs: Any) -> None:
        """Set temperature using SetpointCommand 0x40 with correct type.

        Both ZHA and Z2M support schedule vs user setpoint types:
        - ZHA: raw SetpointCommand 0x40 with type byte
        - Z2M: native occupied_heating_setpoint / occupied_heating_setpoint_scheduled
        """
        from .zigbee.z2m_backend import Z2MBackend

        if self._backend is None or not self._backend.get_device_ieee(self.entity_id):
            # No backend - fallback to standard climate service
            _LOGGER.debug("Danfoss fallback %s: %.1f°C via climate service", self.entity_id, temperature)
            await self.hass.services.async_call(
                "climate", "set_temperature",
                {"entity_id": self.entity_id, "temperature": temperature},
                blocking=True,
            )
            return

        change_type = kwargs.get("change_type", "schedule")
        type_map = {
            "schedule": SETPOINT_TYPE_SCHEDULE,
            "user": SETPOINT_TYPE_USER,
            "preheat": SETPOINT_TYPE_PREHEAT,
        }
        setpoint_type = type_map.get(change_type, SETPOINT_TYPE_SCHEDULE)

        if isinstance(self._backend, Z2MBackend):
            _LOGGER.debug(
                "Danfoss Z2M %s: type=%d temp=%.1f°C",
                self.entity_id, setpoint_type, temperature,
            )
            await self._backend.async_set_danfoss_setpoint(
                self.entity_id, temperature, setpoint_type,
            )
        else:
            # ZHA: raw SetpointCommand 0x40
            temp_value = int(temperature * 100)
            _LOGGER.debug(
                "Danfoss SetpointCommand %s: type=%d temp=%d (%.1f°C)",
                self.entity_id, setpoint_type, temp_value, temperature,
            )
            await self._backend.async_send_cluster_command(
                self.entity_id,
                CLUSTER_THERMOSTAT,
                CMD_SETPOINT_COMMAND,
                {"type": setpoint_type, "heating_setpoint": temp_value},
                manufacturer=DANFOSS_MFR_CODE,
            )

    def get_device_info(self) -> dict[str, Any]:
        state = self.hass.states.get(self.entity_id)
        if state is None:
            return {"entity_id": self.entity_id, "adapter_type": "danfoss_ally"}
        return {
            "entity_id": self.entity_id,
            "friendly_name": state.attributes.get("friendly_name", self.entity_id),
            "adapter_type": "danfoss_ally",
        }
