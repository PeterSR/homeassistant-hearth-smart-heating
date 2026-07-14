"""WebSocket API for Hearth frontend."""

from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import area_registry as ar, device_registry as dr, entity_registry as er
from homeassistant.util import dt as dt_util

from .const import (
    DAYS_OF_WEEK,
    DOMAIN,
    STATE_AWAY,
    STATE_HOME,
    TEMP_ABS_MAX,
    TEMP_ABS_MIN,
)

TEMP_RANGE = vol.All(vol.Coerce(float), vol.Range(min=TEMP_ABS_MIN, max=TEMP_ABS_MAX))
from .models import (
    AreaConfig,
    AreaGroup,
    DaySchedule,
    Schedule,
    ScheduleEntry,
    WeeklySchedule,
)

_LOGGER = logging.getLogger(__name__)


def async_register_websocket_api(hass: HomeAssistant) -> None:
    """Register all WebSocket commands."""
    websocket_api.async_register_command(hass, ws_get_config)
    websocket_api.async_register_command(hass, ws_get_state)
    websocket_api.async_register_command(hass, ws_discover_areas)
    websocket_api.async_register_command(hass, ws_add_area)
    websocket_api.async_register_command(hass, ws_update_area)
    websocket_api.async_register_command(hass, ws_remove_area)
    websocket_api.async_register_command(hass, ws_set_override)
    websocket_api.async_register_command(hass, ws_clear_override)
    websocket_api.async_register_command(hass, ws_set_area_state)
    websocket_api.async_register_command(hass, ws_set_area_enabled)
    websocket_api.async_register_command(hass, ws_resume_schedule)
    websocket_api.async_register_command(hass, ws_sync_schedule)
    websocket_api.async_register_command(hass, ws_set_vacation)
    websocket_api.async_register_command(hass, ws_add_schedule)
    websocket_api.async_register_command(hass, ws_update_schedule)
    websocket_api.async_register_command(hass, ws_remove_schedule)
    websocket_api.async_register_command(hass, ws_duplicate_schedule)
    websocket_api.async_register_command(hass, ws_add_group)
    websocket_api.async_register_command(hass, ws_update_group)
    websocket_api.async_register_command(hass, ws_remove_group)
    websocket_api.async_register_command(hass, ws_reorder_groups)
    websocket_api.async_register_command(hass, ws_update_global_config)
    websocket_api.async_register_command(hass, ws_subscribe)
    websocket_api.async_register_command(hass, ws_get_diagnostics)
    websocket_api.async_register_command(hass, ws_device_action)
    websocket_api.async_register_command(hass, ws_get_command_log)


def _get_data(hass: HomeAssistant) -> dict[str, Any]:
    return hass.data[DOMAIN]


# --- Get Config ---

@websocket_api.websocket_command(
    {vol.Required("type"): "hearth/get_config"}
)
@websocket_api.async_response
async def ws_get_config(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    store = data["store"]
    connection.send_result(
        msg["id"],
        {
            "areas": {aid: a.to_dict() for aid, a in store.areas.items()},
            "schedules": {
                sid: s.to_dict() for sid, s in store.schedules.items()
            },
            "global": store.global_config.to_dict(),
        },
    )


# --- Get State ---

@websocket_api.websocket_command(
    {vol.Required("type"): "hearth/get_state"}
)
@websocket_api.async_response
async def ws_get_state(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    coordinator = data["coordinator"]
    connection.send_result(msg["id"], coordinator.get_full_state())


# --- Discover Areas ---

@websocket_api.websocket_command(
    {vol.Required("type"): "hearth/discover_areas"}
)
@websocket_api.async_response
async def ws_discover_areas(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    area_reg = ar.async_get(hass)
    entity_reg = er.async_get(hass)
    device_reg = dr.async_get(hass)

    store = _get_data(hass)["store"]
    configured_areas = set(store.areas.keys())

    discovered = []
    for area in area_reg.async_list_areas():
        climate_entities = []
        climate_device_ids: set[str] = set()
        temperature_sensors = []

        for entity in entity_reg.entities.values():
            device = None
            if entity.device_id:
                device = device_reg.async_get(entity.device_id)

            entity_area = entity.area_id or (device.area_id if device else None)
            if entity_area != area.id:
                continue

            if entity.domain == "climate" and not entity.disabled:
                climate_entities.append(entity.entity_id)
                if entity.device_id:
                    climate_device_ids.add(entity.device_id)

        for entity in entity_reg.entities.values():
            device = None
            if entity.device_id:
                device = device_reg.async_get(entity.device_id)

            entity_area = entity.area_id or (device.area_id if device else None)
            if entity_area != area.id:
                continue

            if (
                entity.domain == "sensor"
                and entity.original_device_class == "temperature"
                and not entity.disabled
                and entity.device_id not in climate_device_ids
            ):
                temperature_sensors.append(entity.entity_id)

        if climate_entities:
            discovered.append(
                {
                    "area_id": area.id,
                    "area_name": area.name,
                    "climate_entities": climate_entities,
                    "temperature_sensors": temperature_sensors,
                    "already_configured": area.id in configured_areas,
                }
            )

    connection.send_result(msg["id"], {"discovered": discovered})


# --- Add Area ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/add_area",
        vol.Required("area_id"): str,
        vol.Required("climate_entities"): [str],
        vol.Optional("temperature_sensors"): [str],
        vol.Optional("covered_entities"): [str],
        vol.Optional("window_sensors"): [str],
        vol.Optional("home_temp"): TEMP_RANGE,
        vol.Optional("away_temp"): TEMP_RANGE,
        vol.Optional("schedule_id"): str,
    }
)
@websocket_api.async_response
async def ws_add_area(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    store = data["store"]
    coordinator = data["coordinator"]

    schedule_id = msg.get("schedule_id")
    if not schedule_id and store.schedules:
        schedule_id = next(iter(store.schedules))

    area = AreaConfig(
        area_id=msg["area_id"],
        climate_entities=msg["climate_entities"],
        temperature_sensors=msg.get("temperature_sensors", []),
        covered_entities=msg.get("covered_entities", []),
        window_sensors=msg.get("window_sensors", []),
        home_temp=msg.get("home_temp", store.global_config.default_home_temp),
        away_temp=msg.get("away_temp", store.global_config.default_away_temp),
        min_temp=store.global_config.default_min_temp,
        max_temp=store.global_config.default_max_temp,
        schedule_id=schedule_id,
    )
    store.add_area(area)
    coordinator.rebuild_adapters_for_area(area)

    # Write radiator_covered to Danfoss TRVs if any are marked covered
    if area.covered_entities:
        await coordinator.async_on_covered_entities_changed(area)

    # Generate initial materialized schedule
    now = dt_util.now()
    coordinator._ensure_materialized(area, now)

    # Create HA sensor/binary_sensor entities for the new area
    async_add_sensors = data.get("async_add_sensor_entities")
    if async_add_sensors:
        from .sensor import _create_area_sensors
        async_add_sensors(_create_area_sensors(coordinator, area.area_id))
    async_add_binary = data.get("async_add_binary_sensor_entities")
    if async_add_binary:
        from .binary_sensor import _create_area_binary_sensors
        async_add_binary(_create_area_binary_sensors(coordinator, area.area_id))

    connection.send_result(msg["id"], {"area_id": area.area_id, "area": area.to_dict()})
    coordinator._notify_listeners()


# --- Update Area ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/update_area",
        vol.Required("area_id"): str,
        vol.Optional("climate_entities"): [str],
        vol.Optional("temperature_sensors"): vol.Any([str], None),
        vol.Optional("home_temp"): TEMP_RANGE,
        vol.Optional("away_temp"): TEMP_RANGE,
        vol.Optional("min_temp"): TEMP_RANGE,
        vol.Optional("max_temp"): TEMP_RANGE,
        vol.Optional("covered_entities"): [str],
        vol.Optional("window_sensors"): vol.Any([str], None),
        vol.Optional("schedule_id"): vol.Any(str, None),
    }
)
@websocket_api.async_response
async def ws_update_area(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    store = data["store"]
    coordinator = data["coordinator"]

    area_id = msg["area_id"]
    if area_id not in store.areas:
        connection.send_error(msg["id"], "not_found", f"Area {area_id} not found")
        return

    update_fields = {
        k: v for k, v in msg.items() if k not in ("id", "type", "area_id")
    }
    area = store.update_area(area_id, **update_fields)

    if "climate_entities" in update_fields:
        coordinator.rebuild_adapters_for_area(area)

    # Re-push schedule to TRVs if temps changed (they're baked into the on-device schedule)
    if "home_temp" in update_fields or "away_temp" in update_fields:
        await coordinator.async_on_area_temps_changed(area_id)

    # Write radiator_covered Zigbee attribute to affected TRVs
    if "covered_entities" in update_fields:
        await coordinator.async_on_covered_entities_changed(area)

    connection.send_result(msg["id"], {"area": area.to_dict()})
    coordinator._notify_listeners()


# --- Remove Area ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/remove_area",
        vol.Required("area_id"): str,
    }
)
@websocket_api.async_response
async def ws_remove_area(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    store = data["store"]
    coordinator = data["coordinator"]

    area_id = msg["area_id"]
    store.remove_area(area_id)
    coordinator.command_logs.pop(area_id, None)
    connection.send_result(msg["id"], {"success": True})
    coordinator._notify_listeners()


# --- Set Override (temp-only) ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/set_override",
        vol.Required("area_id"): str,
        vol.Required("temperature"): TEMP_RANGE,
        vol.Optional("until", default="next_transition"): str,
    }
)
@websocket_api.async_response
async def ws_set_override(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    coordinator = data["coordinator"]

    await coordinator.async_set_override(
        area_id=msg["area_id"],
        temp=msg["temperature"],
        until=msg.get("until", "next_transition"),
    )

    area_state = coordinator.get_area_state(msg["area_id"])
    connection.send_result(msg["id"], {"area": area_state})


# --- Clear Override ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/clear_override",
        vol.Required("area_id"): str,
    }
)
@websocket_api.async_response
async def ws_clear_override(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    coordinator = data["coordinator"]

    await coordinator.async_clear_override(area_id=msg["area_id"])

    area_state = coordinator.get_area_state(msg["area_id"])
    connection.send_result(msg["id"], {"area": area_state})


# --- Set Area State (chop schedule) ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/set_area_state",
        vol.Required("area_id"): str,
        vol.Required("state"): vol.In([STATE_HOME, STATE_AWAY]),
    }
)
@websocket_api.async_response
async def ws_set_area_state(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    coordinator = data["coordinator"]

    await coordinator.async_set_area_state(
        area_id=msg["area_id"], state=msg["state"]
    )

    area_state = coordinator.get_area_state(msg["area_id"])
    connection.send_result(msg["id"], {"area": area_state})


# --- Set Area Enabled ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/set_area_enabled",
        vol.Required("area_id"): str,
        vol.Required("enabled"): bool,
    }
)
@websocket_api.async_response
async def ws_set_area_enabled(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    coordinator = data["coordinator"]

    await coordinator.async_set_area_enabled(
        area_id=msg["area_id"], enabled=msg["enabled"]
    )

    area_state = coordinator.get_area_state(msg["area_id"])
    connection.send_result(msg["id"], {"area": area_state})


# --- Resume Schedule ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/resume_schedule",
        vol.Required("area_id"): str,
    }
)
@websocket_api.async_response
async def ws_resume_schedule(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    coordinator = data["coordinator"]

    await coordinator.async_resume_schedule(area_id=msg["area_id"])

    area_state = coordinator.get_area_state(msg["area_id"])
    connection.send_result(msg["id"], {"area": area_state})


# --- Sync Schedule ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/sync_schedule",
        vol.Required("area_id"): str,
    }
)
@websocket_api.async_response
async def ws_sync_schedule(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    coordinator = data["coordinator"]

    await coordinator.async_sync_schedule(area_id=msg["area_id"])

    area_state = coordinator.get_area_state(msg["area_id"])
    connection.send_result(msg["id"], {"area": area_state})


# --- Set Vacation ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/set_vacation",
        vol.Required("enabled"): bool,
        vol.Optional("schedule_id"): str,
    }
)
@websocket_api.async_response
async def ws_set_vacation(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    coordinator = data["coordinator"]

    await coordinator.async_set_vacation(
        enabled=msg["enabled"], schedule_id=msg.get("schedule_id")
    )

    gc = data["store"].global_config
    connection.send_result(
        msg["id"],
        {
            "global": {
                "vacation_mode": gc.vacation_mode,
                "vacation_schedule_id": gc.vacation_schedule_id,
            }
        },
    )


# --- Add Schedule ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/add_schedule",
        vol.Required("schedule_id"): str,
        vol.Required("name"): str,
        vol.Optional("schedule"): dict,
        vol.Optional("area_ids"): [str],
    }
)
@websocket_api.async_response
async def ws_add_schedule(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    store = data["store"]
    coordinator = data["coordinator"]

    schedule_id = msg["schedule_id"]
    if schedule_id in store.schedules:
        connection.send_error(msg["id"], "already_exists", f"Schedule {schedule_id} already exists")
        return

    if "schedule" in msg:
        weekly = WeeklySchedule.from_dict(msg["schedule"])
    else:
        # Default: always home - user taps clock ring to add away periods
        all_home = DaySchedule(entries=[ScheduleEntry(time="00:00", temp="home")])
        weekly = WeeklySchedule(
            days={day: all_home for day in DAYS_OF_WEEK}
        )

    sched = Schedule(
        schedule_id=msg["schedule_id"],
        name=msg["name"],
        schedule=weekly,
    )
    store.add_schedule(sched)

    for area_id in msg.get("area_ids", []):
        if area_id in store.areas:
            store.areas[area_id].schedule_id = sched.schedule_id
    store.async_save()

    connection.send_result(msg["id"], {"schedule": sched.to_dict()})
    coordinator._notify_listeners()


# --- Update Schedule ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/update_schedule",
        vol.Required("schedule_id"): str,
        vol.Optional("name"): str,
        vol.Optional("schedule"): dict,
    }
)
@websocket_api.async_response
async def ws_update_schedule(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    store = data["store"]
    coordinator = data["coordinator"]

    schedule_id = msg["schedule_id"]
    if schedule_id not in store.schedules:
        connection.send_error(msg["id"], "not_found", f"Schedule {schedule_id} not found")
        return

    updates = {}
    if "name" in msg:
        updates["name"] = msg["name"]
    if "schedule" in msg:
        updates["schedule"] = WeeklySchedule.from_dict(msg["schedule"])

    sched = store.update_schedule(schedule_id, **updates)

    connection.send_result(msg["id"], {"schedule": sched.to_dict()})
    coordinator._notify_listeners()

    # Re-push schedule to Danfoss TRVs in background (store already saved)
    if "schedule" in updates:
        hass.async_create_task(coordinator.async_on_schedule_changed(schedule_id))


# --- Remove Schedule ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/remove_schedule",
        vol.Required("schedule_id"): str,
    }
)
@websocket_api.async_response
async def ws_remove_schedule(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    store = data["store"]
    coordinator = data["coordinator"]

    schedule_id = msg["schedule_id"]

    # Check if schedule is referenced anywhere
    ref_areas = [a.area_id for a in store.areas.values() if a.schedule_id == schedule_id]
    ref_groups = [g.group_id for g in store.groups.values() if g.schedule_id == schedule_id]
    is_vacation = store.global_config.vacation_schedule_id == schedule_id

    if ref_areas or ref_groups or is_vacation:
        parts = []
        if ref_areas:
            parts.append(f"{len(ref_areas)} area(s)")
        if ref_groups:
            parts.append(f"{len(ref_groups)} group(s)")
        if is_vacation:
            parts.append("vacation mode")
        connection.send_error(
            msg["id"], "in_use",
            f"Schedule is in use by {', '.join(parts)}. Reassign them first.",
        )
        return

    store.remove_schedule(schedule_id)
    connection.send_result(msg["id"], {"success": True})
    coordinator._notify_listeners()


# --- Duplicate Schedule ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/duplicate_schedule",
        vol.Required("source_schedule_id"): str,
        vol.Required("new_schedule_id"): str,
        vol.Required("new_name"): str,
        vol.Optional("area_id"): str,
    }
)
@websocket_api.async_response
async def ws_duplicate_schedule(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Duplicate a schedule, optionally assigning an area to the copy."""
    data = _get_data(hass)
    store = data["store"]
    coordinator = data["coordinator"]

    source_id = msg["source_schedule_id"]
    if source_id not in store.schedules:
        connection.send_error(msg["id"], "not_found", f"Schedule {source_id} not found")
        return

    source = store.schedules[source_id]
    new_sched = Schedule(
        schedule_id=msg["new_schedule_id"],
        name=msg["new_name"],
        schedule=WeeklySchedule.from_dict(source.schedule.to_dict()),
    )
    store.add_schedule(new_sched)

    if "area_id" in msg and msg["area_id"] in store.areas:
        store.areas[msg["area_id"]].schedule_id = new_sched.schedule_id
        store.async_save()

    connection.send_result(msg["id"], {"schedule": new_sched.to_dict()})
    coordinator._notify_listeners()


# --- Update Global Config ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/update_global_config",
        vol.Optional("vacation_mode"): bool,
        vol.Optional("vacation_schedule_id"): vol.Any(str, None),
        vol.Optional("presence_entities"): [str],
        vol.Optional("auto_away_enabled"): bool,
        vol.Optional("auto_away_delay_minutes"): vol.All(vol.Coerce(int), vol.Range(min=0, max=120)),
        vol.Optional("boiler_entity"): vol.Any(str, None),
        vol.Optional("boiler_demand_threshold"): vol.All(vol.Coerce(int), vol.Range(min=0, max=100)),
        vol.Optional("default_home_temp"): TEMP_RANGE,
        vol.Optional("default_away_temp"): TEMP_RANGE,
        vol.Optional("default_min_temp"): TEMP_RANGE,
        vol.Optional("default_max_temp"): TEMP_RANGE,
        vol.Optional("low_battery_threshold"): vol.All(vol.Coerce(int), vol.Range(min=0, max=100)),
    }
)
@websocket_api.async_response
async def ws_update_global_config(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    store = data["store"]
    coordinator = data["coordinator"]

    update_fields = {
        k: v for k, v in msg.items() if k not in ("id", "type")
    }
    config = store.update_global_config(**update_fields)
    await coordinator.async_on_global_config_changed(set(update_fields.keys()))

    connection.send_result(msg["id"], {"global": config.to_dict()})
    coordinator._notify_listeners()


# --- Diagnostics ---

@websocket_api.websocket_command(
    {vol.Required("type"): "hearth/get_diagnostics"}
)
@websocket_api.async_response
async def ws_get_diagnostics(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Return diagnostic info for all configured devices."""
    from .adapters.danfoss_ally import DanfossAllyAdapter

    data = _get_data(hass)
    coordinator = data["coordinator"]
    health = coordinator._get_health_feature()

    devices = []
    for area in data["store"].areas.values():
        for entity_id in area.climate_entities:
            adapter = coordinator._adapters.get(entity_id)
            is_danfoss = isinstance(adapter, DanfossAllyAdapter)

            state = hass.states.get(entity_id)
            zigbee_backend = None
            if is_danfoss and adapter.backend:
                from .adapters.zigbee.zha_backend import ZHABackend
                from .adapters.zigbee.z2m_backend import Z2MBackend
                if isinstance(adapter.backend, ZHABackend):
                    zigbee_backend = "zha"
                elif isinstance(adapter.backend, Z2MBackend):
                    zigbee_backend = "z2m"

            device_info = {
                "entity_id": entity_id,
                "area_id": area.area_id,
                "adapter_type": "danfoss_ally" if is_danfoss else "generic",
                "zigbee_backend": zigbee_backend,
                "current_temp": adapter.get_current_temperature() if adapter else None,
                "target_temp": adapter.get_target_temperature() if adapter else None,
                "battery": adapter.get_battery_level() if adapter else None,
                "state": state.state if state else "unknown",
                "friendly_name": state.attributes.get("friendly_name", entity_id) if state else entity_id,
            }

            if is_danfoss:
                if adapter.backend:
                    device_info["ieee"] = adapter.backend.get_device_ieee(entity_id)
                if health:
                    device_info["diagnostics"] = health.get_device_diagnostics(entity_id)

            devices.append(device_info)

    connection.send_result(msg["id"], {"devices": devices})


# --- Device Action ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/device_action",
        vol.Required("entity_id"): str,
        vol.Required("action"): vol.In(["identify", "time_sync", "close_mounting_mode", "resync"]),
    }
)
@websocket_api.async_response
async def ws_device_action(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Perform a diagnostic action on a device."""
    from .adapters.danfoss_ally import DanfossAllyAdapter
    from .danfoss_const import (
        ATTR_MOUNTING_MODE_CONTROL,
        CLUSTER_IDENTIFY,
        CLUSTER_THERMOSTAT,
        CMD_IDENTIFY,
        DANFOSS_MFR_CODE,
    )

    data = _get_data(hass)
    coordinator = data["coordinator"]
    entity_id = msg["entity_id"]
    action = msg["action"]

    adapter = coordinator._adapters.get(entity_id)
    if adapter is None:
        connection.send_error(msg["id"], "not_found", f"No adapter for {entity_id}")
        return

    is_danfoss = isinstance(adapter, DanfossAllyAdapter)

    try:
        if action == "identify":
            if is_danfoss and adapter.backend:
                # Send Identify command (cluster 0x0003, cmd 0x00, duration 10 seconds)
                await adapter.backend.async_send_cluster_command(
                    entity_id, CLUSTER_IDENTIFY, CMD_IDENTIFY,
                    params={"identify_time": 10},
                )
                connection.send_result(msg["id"], {"success": True, "action": action})
            else:
                connection.send_error(msg["id"], "not_supported", "Identify requires Danfoss adapter")

        elif action == "time_sync":
            if is_danfoss:
                for feature in coordinator._danfoss_features:
                    if hasattr(feature, "async_sync_device"):
                        await feature.async_sync_device(entity_id)
                        break
                connection.send_result(msg["id"], {"success": True, "action": action})
            else:
                connection.send_error(msg["id"], "not_supported", "Time sync requires Danfoss adapter")

        elif action == "close_mounting_mode":
            if is_danfoss and adapter.backend:
                await adapter.backend.async_write_attribute(
                    entity_id, CLUSTER_THERMOSTAT, ATTR_MOUNTING_MODE_CONTROL,
                    0, manufacturer=DANFOSS_MFR_CODE,
                )
                connection.send_result(msg["id"], {"success": True, "action": action})
            else:
                connection.send_error(msg["id"], "not_supported", "Requires Danfoss adapter")

        elif action == "resync":
            await coordinator.async_on_device_error_recovery(entity_id)
            connection.send_result(msg["id"], {"success": True, "action": action})

    except Exception as exc:
        _LOGGER.exception("Device action %s failed for %s", action, entity_id)
        connection.send_error(msg["id"], "action_failed", str(exc))


# --- Command Log ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/get_command_log",
        vol.Optional("entity_id"): str,
        vol.Optional("area_id"): str,
    }
)
@websocket_api.async_response
async def ws_get_command_log(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    """Return the Danfoss command audit log."""
    data = _get_data(hass)
    coordinator = data["coordinator"]

    if "area_id" in msg:
        log = list(coordinator.command_logs.get(msg["area_id"], []))
    elif "entity_id" in msg:
        # Search all area logs for this entity
        log = []
        for area_log in coordinator.command_logs.values():
            log.extend(e for e in area_log if e["entity_id"] == msg["entity_id"])
        log.sort(key=lambda e: e["timestamp"])
    else:
        # Return all logs merged
        log = []
        for area_id, area_log in coordinator.command_logs.items():
            for e in area_log:
                log.append({**e, "area_id": area_id})
        log.sort(key=lambda e: e["timestamp"])

    connection.send_result(msg["id"], {"log": log})


# --- Area Groups ---

@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/add_group",
        vol.Required("group_id"): str,
        vol.Required("name"): str,
        vol.Optional("schedule_id"): vol.Any(str, None),
        vol.Optional("area_ids", default=[]): [str],
        vol.Optional("order", default=0): int,
    }
)
@websocket_api.async_response
async def ws_add_group(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    store = data["store"]
    coordinator = data["coordinator"]

    group_id = msg["group_id"]
    if group_id in store.groups:
        connection.send_error(msg["id"], "already_exists", f"Group {group_id} already exists")
        return

    # Remove areas from any existing groups
    for area_id in msg["area_ids"]:
        for existing_group in store.groups.values():
            if area_id in existing_group.area_ids:
                existing_group.area_ids.remove(area_id)

    group = AreaGroup(
        group_id=group_id,
        name=msg["name"],
        schedule_id=msg.get("schedule_id"),
        area_ids=msg["area_ids"],
        order=msg["order"],
    )
    store.add_group(group)

    # Rematerialize areas that now follow the group schedule
    if group.schedule_id:
        await coordinator.async_on_group_schedule_changed(group_id)

    connection.send_result(msg["id"], {"group": group.to_dict()})
    coordinator._notify_listeners()


@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/update_group",
        vol.Required("group_id"): str,
        vol.Optional("name"): str,
        vol.Optional("schedule_id"): vol.Any(str, None),
        vol.Optional("area_ids"): [str],
        vol.Optional("order"): int,
    }
)
@websocket_api.async_response
async def ws_update_group(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    store = data["store"]
    coordinator = data["coordinator"]

    group_id = msg["group_id"]
    if group_id not in store.groups:
        connection.send_error(msg["id"], "not_found", f"Group {group_id} not found")
        return

    old_group = store.groups[group_id]
    old_schedule_id = old_group.schedule_id
    old_area_ids = set(old_group.area_ids)

    # If area_ids is changing, remove those areas from other groups first
    if "area_ids" in msg:
        for area_id in msg["area_ids"]:
            for other_group in store.groups.values():
                if other_group.group_id != group_id and area_id in other_group.area_ids:
                    other_group.area_ids.remove(area_id)

    updates = {}
    for key in ("name", "schedule_id", "area_ids", "order"):
        if key in msg:
            updates[key] = msg[key]

    group = store.update_group(group_id, **updates)

    # Rematerialize if schedule or membership changed
    schedule_changed = "schedule_id" in updates and updates["schedule_id"] != old_schedule_id
    areas_changed = "area_ids" in updates and set(updates["area_ids"]) != old_area_ids

    if schedule_changed or areas_changed:
        # Rematerialize current group areas
        await coordinator.async_on_group_schedule_changed(group_id)
        # Also rematerialize areas that were removed from this group (they revert to own schedule)
        if areas_changed:
            removed = old_area_ids - set(group.area_ids)
            now = dt_util.now()
            for area_id in removed:
                area = store.areas.get(area_id)
                if area:
                    template = coordinator._get_effective_schedule(area)
                    if template:
                        area.materialized_schedule = coordinator.engine.materialize_schedule(
                            template, coordinator._get_effective_schedule_id(area), now
                        )
            store.async_save()

    connection.send_result(msg["id"], {"group": group.to_dict()})
    coordinator._notify_listeners()


@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/remove_group",
        vol.Required("group_id"): str,
    }
)
@websocket_api.async_response
async def ws_remove_group(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    store = data["store"]
    coordinator = data["coordinator"]

    group_id = msg["group_id"]
    group = store.groups.get(group_id)
    if not group:
        connection.send_error(msg["id"], "not_found", f"Group {group_id} not found")
        return

    had_schedule = group.schedule_id is not None
    affected_area_ids = list(group.area_ids)

    store.remove_group(group_id)

    # Rematerialize affected areas (they revert to their own schedule)
    if had_schedule and affected_area_ids:
        now = __import__("homeassistant.util.dt", fromlist=["dt"]).now()
        for area_id in affected_area_ids:
            area = store.areas.get(area_id)
            if area:
                template = coordinator._get_effective_schedule(area)
                if template:
                    area.materialized_schedule = coordinator.engine.materialize_schedule(
                        template, coordinator._get_effective_schedule_id(area), now
                    )
        store.async_save()
        coordinator.hass.async_create_task(coordinator._apply_all_areas_now())

    connection.send_result(msg["id"], {"success": True})
    coordinator._notify_listeners()


@websocket_api.websocket_command(
    {
        vol.Required("type"): "hearth/reorder_groups",
        vol.Required("group_ids"): [str],
    }
)
@callback
def ws_reorder_groups(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    store = data["store"]
    coordinator = data["coordinator"]

    for idx, group_id in enumerate(msg["group_ids"]):
        if group_id in store.groups:
            store.groups[group_id].order = idx
    store.async_save()

    connection.send_result(msg["id"], {"success": True})
    coordinator._notify_listeners()


# --- Subscribe ---

@websocket_api.websocket_command(
    {vol.Required("type"): "hearth/subscribe"}
)
@callback
def ws_subscribe(
    hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict
) -> None:
    data = _get_data(hass)
    coordinator = data["coordinator"]

    connection.send_result(msg["id"])
    state = coordinator.get_full_state()
    connection.send_message(websocket_api.event_message(msg["id"], state))

    @callback
    def on_update() -> None:
        state = coordinator.get_full_state()
        connection.send_message(websocket_api.event_message(msg["id"], state))

    unsub = coordinator.add_listener(on_update)
    connection.subscriptions[msg["id"]] = unsub
