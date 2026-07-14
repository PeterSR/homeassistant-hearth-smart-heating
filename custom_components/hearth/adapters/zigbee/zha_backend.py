"""ZHA backend implementation."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er

from .base import ZigbeeBackend

_LOGGER = logging.getLogger(__name__)


class ZHABackend(ZigbeeBackend):
    """Zigbee backend using ZHA services."""

    def __init__(self, hass: HomeAssistant) -> None:
        super().__init__(hass)
        self._ieee_cache: dict[str, str] = {}

    def get_device_ieee(self, entity_id: str) -> str | None:
        """Resolve entity_id -> IEEE address via entity/device registries."""
        if entity_id in self._ieee_cache:
            return self._ieee_cache[entity_id] or None

        entity_reg = er.async_get(self.hass)
        entity_entry = entity_reg.async_get(entity_id)
        if not entity_entry or not entity_entry.device_id:
            return None

        device_reg = dr.async_get(self.hass)
        device = device_reg.async_get(entity_entry.device_id)
        if not device:
            return None

        # Check connections (ZHA stores IEEE here)
        for conn_type, conn_id in device.connections:
            if conn_type == "ieee":
                self._ieee_cache[entity_id] = conn_id
                return conn_id

        # Check identifiers (ZHA uses ("zha", ieee) tuples)
        for domain, identifier in device.identifiers:
            if domain == "zha":
                self._ieee_cache[entity_id] = identifier
                return identifier

        # Log once for debugging - cache None to avoid repeated warnings
        _LOGGER.warning(
            "Cannot resolve IEEE for %s. connections=%s identifiers=%s",
            entity_id, device.connections, device.identifiers,
        )
        self._ieee_cache[entity_id] = ""
        return None

    async def async_write_attribute(
        self, entity_id, cluster_id, attribute_id, value, manufacturer=None
    ) -> None:
        ieee = self.get_device_ieee(entity_id)
        if ieee is None:
            _LOGGER.debug("Skipping write_attribute: no IEEE for %s", entity_id)
            return

        service_data: dict[str, Any] = {
            "ieee": ieee,
            "endpoint_id": 1,
            "cluster_id": cluster_id,
            "cluster_type": "in",
            "attribute": attribute_id,
            "value": value,
        }
        if manufacturer is not None:
            service_data["manufacturer"] = manufacturer

        _LOGGER.debug(
            "ZHA write_attribute %s: cluster=%#x attr=%#x val=%s",
            entity_id, cluster_id, attribute_id, value,
        )
        await self.hass.services.async_call(
            "zha", "set_zigbee_cluster_attribute",
            service_data, blocking=True,
        )

    async def async_read_attribute(
        self, entity_id, cluster_id, attribute_id, manufacturer=None
    ) -> Any:
        # ZHA doesn't have a straightforward read-attribute service that returns values.
        # For load_estimate etc., we read from the HA entity state attributes.
        state = self.hass.states.get(entity_id)
        if state is None:
            return None
        # Z2M/ZHA expose some Zigbee attributes as HA entity attributes
        return state.attributes.get("load_estimate")

    async def async_send_cluster_command(
        self, entity_id, cluster_id, command_id, params=None, manufacturer=None
    ) -> None:
        ieee = self.get_device_ieee(entity_id)
        if ieee is None:
            _LOGGER.debug("Skipping cluster_command: no IEEE for %s", entity_id)
            return

        service_data: dict[str, Any] = {
            "ieee": ieee,
            "endpoint_id": 1,
            "cluster_id": cluster_id,
            "cluster_type": "in",
            "command": command_id,
            "command_type": "server",
        }
        if params is not None:
            service_data["params"] = params
        else:
            service_data["params"] = {}
        if manufacturer is not None:
            service_data["manufacturer"] = manufacturer

        _LOGGER.debug(
            "ZHA cluster_command %s: cluster=%#x cmd=%#x params=%s",
            entity_id, cluster_id, command_id, params,
        )
        await self.hass.services.async_call(
            "zha", "issue_zigbee_cluster_command",
            service_data, blocking=True,
        )
