"""Sensor platform for Hearth: exposes area metrics to HA recorder."""

from __future__ import annotations

import logging
from typing import Callable

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorStateClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfTemperature
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from homeassistant.helpers import area_registry as ar

from .const import DOMAIN
from .coordinator import HearthCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Hearth sensors from a config entry."""
    data = hass.data[DOMAIN]
    coordinator: HearthCoordinator = data["coordinator"]
    store = data["store"]

    entities: list[SensorEntity] = [
        HearthLowBatteryCountSensor(coordinator),
    ]
    for area_id in store.areas:
        entities.extend(_create_area_sensors(coordinator, area_id))

    async_add_entities(entities)

    # Store callback so we can add sensors for newly created areas
    data["async_add_sensor_entities"] = async_add_entities


def _create_area_sensors(
    coordinator: HearthCoordinator, area_id: str
) -> list[SensorEntity]:
    """Create the three sensor entities for an area."""
    return [
        HearthAreaCurrentTemperatureSensor(coordinator, area_id),
        HearthAreaTargetTemperatureSensor(coordinator, area_id),
        HearthAreaStateSensor(coordinator, area_id),
    ]


class _HearthAreaSensorBase(SensorEntity):
    """Base class for Hearth area sensors."""

    _attr_should_poll = False
    def __init__(self, coordinator: HearthCoordinator, area_id: str) -> None:
        self._coordinator = coordinator
        self._area_id = area_id
        self._unsub: Callable[[], None] | None = None
        # Resolve area display name from HA area registry (stable, available at init)
        area_reg = ar.async_get(coordinator.hass)
        ha_area = area_reg.async_get_area(area_id)
        self._area_name = ha_area.name if ha_area else area_id

    @property
    def _area_state(self) -> dict | None:
        return self._coordinator.get_area_state(self._area_id)

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
        """Pull current values from coordinator. Override in subclasses."""


class HearthAreaCurrentTemperatureSensor(_HearthAreaSensorBase):
    """Current room temperature for a Hearth area."""

    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_suggested_display_precision = 1

    def __init__(self, coordinator: HearthCoordinator, area_id: str) -> None:
        super().__init__(coordinator, area_id)
        self._attr_unique_id = f"hearth_{area_id}_current_temperature"
        self.entity_id = f"sensor.hearth_{area_id}_current_temperature"

    @property
    def name(self) -> str:
        return f"Hearth {self._area_name} Current Temperature"

    def _update_from_coordinator(self) -> None:
        state = self._area_state
        self._attr_native_value = state["current_temp"] if state else None


class HearthAreaTargetTemperatureSensor(_HearthAreaSensorBase):
    """Target temperature for a Hearth area."""

    _attr_device_class = SensorDeviceClass.TEMPERATURE
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfTemperature.CELSIUS
    _attr_suggested_display_precision = 1

    def __init__(self, coordinator: HearthCoordinator, area_id: str) -> None:
        super().__init__(coordinator, area_id)
        self._attr_unique_id = f"hearth_{area_id}_target_temperature"
        self.entity_id = f"sensor.hearth_{area_id}_target_temperature"

    @property
    def name(self) -> str:
        return f"Hearth {self._area_name} Target Temperature"

    def _update_from_coordinator(self) -> None:
        state = self._area_state
        self._attr_native_value = state["target_temp"] if state else None


class HearthLowBatteryCountSensor(SensorEntity):
    """Number of devices with battery below threshold."""

    _attr_should_poll = False
    _attr_unique_id = "hearth_low_battery_count"
    _attr_icon = "mdi:battery-alert"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: HearthCoordinator) -> None:
        self._coordinator = coordinator
        self._unsub: Callable[[], None] | None = None

    @property
    def name(self) -> str:
        return "Hearth Low Battery Devices"

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
        state = self._coordinator.get_full_state()
        threshold = state["global"].get("low_battery_threshold", 10)
        count = 0
        for area in state["areas"].values():
            for device in area.get("devices", []):
                battery = device.get("battery")
                if battery is not None and battery < threshold:
                    count += 1
        self._attr_native_value = count


class HearthAreaStateSensor(_HearthAreaSensorBase):
    """Effective state (home/away/off) for a Hearth area."""

    _attr_device_class = SensorDeviceClass.ENUM

    def __init__(self, coordinator: HearthCoordinator, area_id: str) -> None:
        super().__init__(coordinator, area_id)
        self._attr_unique_id = f"hearth_{area_id}_state"
        self.entity_id = f"sensor.hearth_{area_id}_state"
        self._attr_options = ["home", "away", "off"]

    @property
    def name(self) -> str:
        return f"Hearth {self._area_name} State"

    def _update_from_coordinator(self) -> None:
        state = self._area_state
        self._attr_native_value = state["effective_state"] if state else None
