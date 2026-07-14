"""Binary sensor platform for Hearth: global and per-area boolean states."""

from __future__ import annotations

import logging
from typing import Callable

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN
from .coordinator import HearthCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Hearth binary sensors from a config entry."""
    data = hass.data[DOMAIN]
    coordinator: HearthCoordinator = data["coordinator"]
    store = data["store"]

    entities: list[BinarySensorEntity] = [
        HearthVacationModeSensor(coordinator),
        HearthAnyoneHomeSensor(coordinator),
    ]
    for area_id in store.areas:
        entities.append(HearthAreaOverrideSensor(coordinator, area_id))

    async_add_entities(entities)
    data["async_add_binary_sensor_entities"] = async_add_entities


def _create_area_binary_sensors(
    coordinator: HearthCoordinator, area_id: str
) -> list[BinarySensorEntity]:
    return [HearthAreaOverrideSensor(coordinator, area_id)]


class _HearthBinarySensorBase(BinarySensorEntity):
    """Base class for Hearth binary sensors."""

    _attr_should_poll = False

    def __init__(self, coordinator: HearthCoordinator) -> None:
        self._coordinator = coordinator
        self._unsub: Callable[[], None] | None = None

    async def async_added_to_hass(self) -> None:
        self._unsub = self._coordinator.add_listener(self._handle_update)
        self._update_from_coordinator()

    async def async_will_remove_from_hass(self) -> None:
        if self._unsub:
            self._unsub()
            self._unsub = None

    @callback
    def _handle_update(self) -> None:
        self._update_from_coordinator()
        self.async_write_ha_state()

    def _update_from_coordinator(self) -> None:
        """Override in subclasses."""


# --- Global sensors ---


class HearthVacationModeSensor(_HearthBinarySensorBase):
    """Whether vacation mode is active."""

    _attr_unique_id = "hearth_vacation_mode"
    _attr_icon = "mdi:beach"

    @property
    def name(self) -> str:
        return "Hearth Vacation Mode"

    def _update_from_coordinator(self) -> None:
        state = self._coordinator.get_full_state()
        self._attr_is_on = state["global"].get("vacation_mode", False)


class HearthAnyoneHomeSensor(_HearthBinarySensorBase):
    """Whether anyone is detected home (from presence tracking)."""

    _attr_unique_id = "hearth_anyone_home"
    _attr_device_class = BinarySensorDeviceClass.PRESENCE

    @property
    def name(self) -> str:
        return "Hearth Anyone Home"

    def _update_from_coordinator(self) -> None:
        state = self._coordinator.get_full_state()
        auto_away_active = state["global"].get("auto_away_active", False)
        # If auto-away is active, nobody is home. Otherwise, someone is.
        self._attr_is_on = not auto_away_active


# --- Per-area sensors ---


class HearthAreaOverrideSensor(_HearthBinarySensorBase):
    """Whether an area has an active temperature override."""

    def __init__(self, coordinator: HearthCoordinator, area_id: str) -> None:
        super().__init__(coordinator)
        self._area_id = area_id
        self._attr_unique_id = f"hearth_{area_id}_override_active"
        self.entity_id = f"binary_sensor.hearth_{area_id}_override_active"
        area_reg = ar.async_get(coordinator.hass)
        ha_area = area_reg.async_get_area(area_id)
        self._area_name = ha_area.name if ha_area else area_id

    @property
    def name(self) -> str:
        return f"Hearth {self._area_name} Override Active"

    def _update_from_coordinator(self) -> None:
        area_state = self._coordinator.get_area_state(self._area_id)
        self._attr_is_on = bool(area_state and area_state.get("override"))
