"""Service handlers for Hearth integration."""

from __future__ import annotations

import logging

import voluptuous as vol

from homeassistant.core import HomeAssistant, ServiceCall

from .const import DOMAIN, STATE_AWAY, STATE_HOME, TEMP_ABS_MAX, TEMP_ABS_MIN

_LOGGER = logging.getLogger(__name__)

SERVICE_SET_AREA_OVERRIDE = "set_area_override"
SERVICE_CLEAR_AREA_OVERRIDE = "clear_area_override"
SERVICE_SET_AREA_STATE = "set_area_state"
SERVICE_SET_AREA_ENABLED = "set_area_enabled"
SERVICE_RESUME_SCHEDULE = "resume_schedule"
SERVICE_SYNC_SCHEDULE = "sync_schedule"
SERVICE_SET_VACATION = "set_vacation"
SERVICE_TRIGGER_HOME = "trigger_home"
SERVICE_TRIGGER_AWAY = "trigger_away"

TEMP_RANGE = vol.All(vol.Coerce(float), vol.Range(min=TEMP_ABS_MIN, max=TEMP_ABS_MAX))

SCHEMA_SET_AREA_OVERRIDE = vol.Schema(
    {
        vol.Required("area_id"): str,
        vol.Required("temperature"): TEMP_RANGE,
        vol.Optional("until", default="next_transition"): str,
    }
)

SCHEMA_CLEAR_AREA_OVERRIDE = vol.Schema(
    {
        vol.Required("area_id"): str,
    }
)

SCHEMA_SET_AREA_STATE = vol.Schema(
    {
        vol.Required("area_id"): str,
        vol.Required("state"): vol.In([STATE_HOME, STATE_AWAY]),
    }
)

SCHEMA_SET_AREA_ENABLED = vol.Schema(
    {
        vol.Required("area_id"): str,
        vol.Required("enabled"): bool,
    }
)

SCHEMA_RESUME_SCHEDULE = vol.Schema(
    {
        vol.Required("area_id"): str,
    }
)

SCHEMA_SET_VACATION = vol.Schema(
    {
        vol.Required("enabled"): bool,
        vol.Optional("temperature"): TEMP_RANGE,
    }
)


def _get_coordinator(hass: HomeAssistant):
    """Get the coordinator from hass.data."""
    data = hass.data.get(DOMAIN)
    if data is None:
        raise ValueError("Hearth is not set up")
    return data["coordinator"]


async def async_setup_services(hass: HomeAssistant) -> None:
    """Set up Hearth services."""

    async def handle_set_area_override(call: ServiceCall) -> None:
        coordinator = _get_coordinator(hass)
        await coordinator.async_set_override(
            area_id=call.data["area_id"],
            temp=call.data["temperature"],
            until=call.data.get("until", "next_transition"),
        )

    async def handle_clear_area_override(call: ServiceCall) -> None:
        coordinator = _get_coordinator(hass)
        await coordinator.async_clear_override(area_id=call.data["area_id"])

    async def handle_set_area_state(call: ServiceCall) -> None:
        coordinator = _get_coordinator(hass)
        await coordinator.async_set_area_state(
            area_id=call.data["area_id"],
            state=call.data["state"],
        )

    async def handle_set_area_enabled(call: ServiceCall) -> None:
        coordinator = _get_coordinator(hass)
        await coordinator.async_set_area_enabled(
            area_id=call.data["area_id"],
            enabled=call.data["enabled"],
        )

    async def handle_resume_schedule(call: ServiceCall) -> None:
        coordinator = _get_coordinator(hass)
        await coordinator.async_resume_schedule(area_id=call.data["area_id"])

    async def handle_sync_schedule(call: ServiceCall) -> None:
        coordinator = _get_coordinator(hass)
        await coordinator.async_sync_schedule(area_id=call.data["area_id"])

    async def handle_set_vacation(call: ServiceCall) -> None:
        coordinator = _get_coordinator(hass)
        await coordinator.async_set_vacation(
            enabled=call.data["enabled"],
            temp=call.data.get("temperature"),
        )

    async def handle_trigger_home(call: ServiceCall) -> None:
        coordinator = _get_coordinator(hass)
        await coordinator.async_trigger_home()

    async def handle_trigger_away(call: ServiceCall) -> None:
        coordinator = _get_coordinator(hass)
        await coordinator.async_trigger_away()

    hass.services.async_register(
        DOMAIN, SERVICE_SET_AREA_OVERRIDE, handle_set_area_override,
        schema=SCHEMA_SET_AREA_OVERRIDE,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_CLEAR_AREA_OVERRIDE, handle_clear_area_override,
        schema=SCHEMA_CLEAR_AREA_OVERRIDE,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_SET_AREA_STATE, handle_set_area_state,
        schema=SCHEMA_SET_AREA_STATE,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_SET_AREA_ENABLED, handle_set_area_enabled,
        schema=SCHEMA_SET_AREA_ENABLED,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_RESUME_SCHEDULE, handle_resume_schedule,
        schema=SCHEMA_RESUME_SCHEDULE,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_SYNC_SCHEDULE, handle_sync_schedule,
        schema=SCHEMA_RESUME_SCHEDULE,  # same schema (just area_id)
    )
    hass.services.async_register(
        DOMAIN, SERVICE_SET_VACATION, handle_set_vacation,
        schema=SCHEMA_SET_VACATION,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_TRIGGER_HOME, handle_trigger_home,
    )
    hass.services.async_register(
        DOMAIN, SERVICE_TRIGGER_AWAY, handle_trigger_away,
    )


async def async_unload_services(hass: HomeAssistant) -> None:
    """Unload Hearth services."""
    for service in (
        SERVICE_SET_AREA_OVERRIDE,
        SERVICE_CLEAR_AREA_OVERRIDE,
        SERVICE_SET_AREA_STATE,
        SERVICE_SET_AREA_ENABLED,
        SERVICE_RESUME_SCHEDULE,
        SERVICE_SYNC_SCHEDULE,
        SERVICE_SET_VACATION,
        SERVICE_TRIGGER_HOME,
        SERVICE_TRIGGER_AWAY,
    ):
        hass.services.async_remove(DOMAIN, service)
