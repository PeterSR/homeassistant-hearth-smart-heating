"""Generic climate entity adapter."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant

from .base import DeviceAdapter

_LOGGER = logging.getLogger(__name__)


class GenericClimateAdapter(DeviceAdapter):
    """Adapter for any climate entity that supports set_temperature."""

    def __init__(self, hass: HomeAssistant, entity_id: str) -> None:
        super().__init__(hass, entity_id)

    async def async_set_temperature(self, temperature: float, **kwargs: Any) -> None:
        """Set the target temperature via the climate.set_temperature service."""
        _LOGGER.debug("Setting %s to %.1f", self.entity_id, temperature)
        await self.hass.services.async_call(
            "climate",
            "set_temperature",
            {"entity_id": self.entity_id, "temperature": temperature},
            blocking=True,
        )
