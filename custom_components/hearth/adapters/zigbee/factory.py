"""Factory for creating the appropriate Zigbee backend."""

from __future__ import annotations

from homeassistant.core import HomeAssistant

from .base import ZigbeeBackend


def create_zigbee_backend(
    hass: HomeAssistant, backend_type: str
) -> ZigbeeBackend | None:
    """Create a ZigbeeBackend instance based on the detected type."""
    if backend_type == "zha":
        from .zha_backend import ZHABackend

        return ZHABackend(hass)
    if backend_type == "z2m":
        from .z2m_backend import Z2MBackend

        return Z2MBackend(hass)
    return None
