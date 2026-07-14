"""Abstract Zigbee backend."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from homeassistant.core import HomeAssistant


class ZigbeeBackend(ABC):
    """Abstract interface for sending raw Zigbee commands."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    @abstractmethod
    async def async_write_attribute(
        self,
        entity_id: str,
        cluster_id: int,
        attribute_id: int,
        value: Any,
        manufacturer: int | None = None,
    ) -> None:
        """Write a single attribute to a device."""

    @abstractmethod
    async def async_read_attribute(
        self,
        entity_id: str,
        cluster_id: int,
        attribute_id: int,
        manufacturer: int | None = None,
    ) -> Any:
        """Read a single attribute from a device."""

    @abstractmethod
    async def async_send_cluster_command(
        self,
        entity_id: str,
        cluster_id: int,
        command_id: int,
        params: dict | None = None,
        manufacturer: int | None = None,
    ) -> None:
        """Send a cluster command to a device.

        params: dict of named ZCL command parameters (e.g. {"identify_time": 10}).
        """

    @abstractmethod
    def get_device_ieee(self, entity_id: str) -> str | None:
        """Resolve an entity_id to its IEEE address (ZHA) or friendly name (Z2M)."""
