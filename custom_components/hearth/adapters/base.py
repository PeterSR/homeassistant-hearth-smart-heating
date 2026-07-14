"""Abstract base class for device adapters."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from homeassistant.core import HomeAssistant


class DeviceAdapter(ABC):
    """Abstract adapter for controlling a climate device."""

    def __init__(self, hass: HomeAssistant, entity_id: str) -> None:
        self.hass = hass
        self.entity_id = entity_id

    @abstractmethod
    async def async_set_temperature(self, temperature: float, **kwargs: Any) -> None:
        """Set the target temperature on the device."""

    def is_available(self) -> bool:
        """Return False when the underlying entity is unavailable/unknown.

        Callers use this to suppress commands during Zigbee outages, avoiding
        the every-minute retry storm observed during a ZHA outage.
        """
        state = self.hass.states.get(self.entity_id)
        return state is not None and state.state not in ("unavailable", "unknown")

    def get_current_temperature(self) -> float | None:
        """Get the current measured temperature."""
        state = self.hass.states.get(self.entity_id)
        if state is None:
            return None
        return state.attributes.get("current_temperature")

    def get_target_temperature(self) -> float | None:
        """Get the current target/setpoint temperature."""
        state = self.hass.states.get(self.entity_id)
        if state is None:
            return None
        return state.attributes.get("temperature")

    def get_battery_level(self) -> int | None:
        """Get the battery level if available.

        Checks the climate entity attributes first, then looks for a
        sibling battery sensor on the same device.
        """
        state = self.hass.states.get(self.entity_id)
        if state is not None:
            battery = state.attributes.get("battery")
            if battery is not None:
                try:
                    return int(battery)
                except (ValueError, TypeError):
                    pass

        # Look for a sibling battery sensor on the same device
        from homeassistant.helpers import device_registry as dr, entity_registry as er

        entity_reg = er.async_get(self.hass)
        entity_entry = entity_reg.async_get(self.entity_id)
        if not entity_entry or not entity_entry.device_id:
            return None

        for entry in entity_reg.entities.values():
            if (
                entry.device_id == entity_entry.device_id
                and entry.domain == "sensor"
                and entry.original_device_class == "battery"
                and not entry.disabled
            ):
                sensor_state = self.hass.states.get(entry.entity_id)
                if sensor_state and sensor_state.state not in ("unknown", "unavailable"):
                    try:
                        return int(float(sensor_state.state))
                    except (ValueError, TypeError):
                        pass

        return None

    def get_device_info(self) -> dict[str, Any]:
        """Get device metadata."""
        state = self.hass.states.get(self.entity_id)
        if state is None:
            return {"entity_id": self.entity_id, "adapter_type": "generic"}
        return {
            "entity_id": self.entity_id,
            "friendly_name": state.attributes.get("friendly_name", self.entity_id),
            "adapter_type": "generic",
        }
