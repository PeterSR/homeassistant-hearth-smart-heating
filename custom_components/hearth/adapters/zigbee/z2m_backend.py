"""Zigbee2MQTT backend implementation.

Z2M has native Danfoss Ally support - most operations use named MQTT
properties rather than raw cluster commands. See:
https://www.zigbee2mqtt.io/devices/014G2461.html
"""

from __future__ import annotations

import json
import logging
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er

from .base import ZigbeeBackend

_LOGGER = logging.getLogger(__name__)

# Z2M exposes Danfoss attributes as named MQTT properties.
# (cluster_id, attribute_id) -> Z2M property name
Z2M_PROPERTY_MAP: dict[tuple[int, int], str] = {
    (0x0201, 0x4015): "external_measured_room_sensor",
    (0x0201, 0x4016): "radiator_covered",
    (0x0201, 0x4030): "heat_available",
    (0x0201, 0x4032): "load_balancing_enable",
    (0x0201, 0x4003): "window_open_external",
    (0x0201, 0x4040): "load_room_mean",
    (0x0201, 0x0025): "programming_operation_mode",
}

# Z2M cluster name mapping (numeric -> string for raw commands)
Z2M_CLUSTER_NAMES: dict[int, str] = {
    0x0003: "genIdentify",
    0x000A: "genTime",
    0x0201: "hvacThermostat",
}

# Z2M rejects numeric attribute IDs in its "write" key - it needs names.
# (cluster_id, attribute_id) -> Z2M attribute name.
Z2M_ATTRIBUTE_NAMES: dict[tuple[int, int], str] = {
    (0x000A, 0x0000): "time",
    (0x000A, 0x0001): "timeStatus",
    (0x000A, 0x0002): "timeZone",
    (0x000A, 0x0003): "dstStart",
    (0x000A, 0x0004): "dstEnd",
    (0x000A, 0x0005): "dstShift",
}


class Z2MBackend(ZigbeeBackend):
    """Zigbee backend using Zigbee2MQTT via MQTT."""

    def __init__(self, hass: HomeAssistant, base_topic: str = "zigbee2mqtt") -> None:
        super().__init__(hass)
        self._base_topic = base_topic
        self._friendly_name_cache: dict[str, str] = {}

    def get_device_ieee(self, entity_id: str) -> str | None:
        """For Z2M, return the friendly_name used in MQTT topics."""
        return self._get_friendly_name(entity_id)

    def _get_friendly_name(self, entity_id: str) -> str | None:
        if entity_id in self._friendly_name_cache:
            return self._friendly_name_cache[entity_id]

        entity_reg = er.async_get(self.hass)
        entity_entry = entity_reg.async_get(entity_id)
        if not entity_entry or not entity_entry.device_id:
            return None

        device_reg = dr.async_get(self.hass)
        device = device_reg.async_get(entity_entry.device_id)
        if not device:
            return None

        # Z2M device identifiers: ("mqtt", "zigbee2mqtt_<friendly_name>")
        for domain, identifier in device.identifiers:
            if domain == "mqtt":
                prefix = f"{self._base_topic}_"
                if identifier.startswith(prefix):
                    name = identifier[len(prefix):]
                    self._friendly_name_cache[entity_id] = name
                    return name

        # Fallback: use device name
        if device.name:
            self._friendly_name_cache[entity_id] = device.name
            return device.name

        return None

    async def async_write_attribute(
        self, entity_id, cluster_id, attribute_id, value, manufacturer=None
    ) -> None:
        # Check if this is a named property Z2M exposes natively
        property_name = Z2M_PROPERTY_MAP.get((cluster_id, attribute_id))
        if property_name:
            await self._publish_set(entity_id, {property_name: value})
        else:
            # Raw Zigbee write via Z2M's "write" key.
            # Z2M requires attribute NAMES here, not numeric IDs - numeric keys
            # fail with "Write for 'undefined' not available".
            cluster_name = Z2M_CLUSTER_NAMES.get(cluster_id, cluster_id)
            attr_key = Z2M_ATTRIBUTE_NAMES.get(
                (cluster_id, attribute_id), str(attribute_id)
            )
            payload: dict[str, Any] = {
                "cluster": cluster_name,
                "payload": {attr_key: value},
            }
            if manufacturer is not None:
                payload["options"] = {"manufacturerCode": manufacturer}
            await self._publish_set(entity_id, {"write": payload})

    async def async_read_attribute(
        self, entity_id, cluster_id, attribute_id, manufacturer=None
    ) -> Any:
        # Z2M doesn't support MQTT read-attribute returning values.
        # Read from HA entity state as fallback.
        state = self.hass.states.get(entity_id)
        if state is None:
            return None
        return state.attributes.get("load_estimate")

    async def async_send_cluster_command(
        self, entity_id, cluster_id, command_id, params=None, manufacturer=None
    ) -> None:
        """Send a cluster command via Z2M's 'command' key.

        Uses string cluster/command names when available for better Z2M compatibility.
        """
        cluster_name = Z2M_CLUSTER_NAMES.get(cluster_id, cluster_id)
        payload: dict[str, Any] = {
            "cluster": cluster_name,
            "command": command_id,
            "payload": params or {},
        }
        if manufacturer is not None:
            payload["options"] = {"manufacturerCode": manufacturer}
        await self._publish_set(entity_id, {"command": payload})

    # --- Danfoss-specific high-level methods ---

    async def async_set_danfoss_setpoint(
        self, entity_id: str, temperature: float, setpoint_type: int
    ) -> None:
        """Set temperature using Z2M's native Danfoss setpoint properties.

        setpoint_type 0 = schedule (smooth PID), 1 = user (aggressive).
        """
        if setpoint_type == 0:
            await self._publish_set(entity_id, {
                "occupied_heating_setpoint_scheduled": temperature,
            })
        else:
            await self._publish_set(entity_id, {
                "occupied_heating_setpoint": temperature,
            })

    async def async_set_weekly_schedule(
        self, entity_id: str, day_bitmap: int, transitions: list[tuple[int, int]]
    ) -> None:
        """Push a day schedule via the raw ZCL SetWeeklySchedule command.

        Z2M's Danfoss 014G2461 definition does NOT expose weekly_schedule as a
        toZigbee converter - publishing {"weekly_schedule": ...} is silently
        dropped. The raw cluster command path is the only way in.

        day_bitmap: ZCL day bitmap (bit0=Sun, bit1=Mon, ..., bit6=Sat)
        transitions: list of (minutes_from_midnight, temp_hundredths)
        heatSetpoint is in hundredths of a degree (2400 = 24°C).
        """
        await self._publish_set(entity_id, {
            "command": {
                "cluster": "hvacThermostat",
                "command": 1,  # SetWeeklySchedule
                "payload": {
                    "dayofweek": day_bitmap,
                    "numoftrans": len(transitions),
                    "mode": 1,  # heat
                    "transitions": [
                        {"transitionTime": minutes, "heatSetpoint": temp}
                        for minutes, temp in transitions
                    ],
                },
            },
        })

    async def async_clear_weekly_schedule(self, entity_id: str) -> None:
        """Clear the on-device schedule."""
        await self._publish_set(entity_id, {"clear_weekly_schedule": ""})

    async def async_set_programming_mode(self, entity_id: str, mode: str) -> None:
        """Set programming operation mode: 'setpoint', 'schedule', 'schedule_with_preheat'."""
        await self._publish_set(entity_id, {"programming_operation_mode": mode})

    async def _publish_set(self, entity_id: str, payload: dict) -> None:
        friendly_name = self._get_friendly_name(entity_id)
        if not friendly_name:
            raise ValueError(f"Cannot resolve Z2M friendly_name for {entity_id}")

        topic = f"{self._base_topic}/{friendly_name}/set"
        _LOGGER.debug("Z2M publish %s: %s", topic, payload)
        await self.hass.services.async_call(
            "mqtt", "publish",
            {"topic": topic, "payload": json.dumps(payload)},
            blocking=True,
        )
