"""Persistent storage for Hearth integration."""

from __future__ import annotations

import logging
from typing import Any

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.storage import Store

from .const import STORAGE_KEY, STORAGE_VERSION
from .models import AreaConfig, AreaGroup, GlobalConfig, Schedule, WeeklySchedule

_LOGGER = logging.getLogger(__name__)

SAVE_DELAY = 10
COMMAND_LOG_STORAGE_KEY = "hearth_command_logs"


class HearthStore:
    """Manages persistent storage for areas, schedules, and global config."""

    def __init__(self, hass: HomeAssistant) -> None:
        self._hass = hass
        self._store: Store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._log_store: Store = Store(hass, 1, COMMAND_LOG_STORAGE_KEY)
        self._command_logs_cache: dict[str, list[dict]] | None = None
        self.areas: dict[str, AreaConfig] = {}
        self.schedules: dict[str, Schedule] = {}
        self.groups: dict[str, AreaGroup] = {}
        self.global_config: GlobalConfig = GlobalConfig()

    async def async_load(self) -> None:
        """Load data from disk."""
        data = await self._store.async_load()
        if data is None:
            _LOGGER.debug("No existing storage data, using defaults")
        else:
            # Load areas
            for area_id, area_data in data.get("areas", {}).items():
                area_data.setdefault("area_id", area_id)
                self.areas[area_id] = AreaConfig.from_dict(area_data)

            # Load schedules
            schedules_data = data.get("schedules", {})
            for sched_id, sched_data in schedules_data.items():
                sched_data.setdefault("schedule_id", sched_id)
                self.schedules[sched_id] = Schedule.from_dict(sched_data)

            # Load groups
            for group_id, group_data in data.get("groups", {}).items():
                group_data.setdefault("group_id", group_id)
                self.groups[group_id] = AreaGroup.from_dict(group_data)

            # Load global config
            global_data = data.get("global", {})
            if global_data:
                self.global_config = GlobalConfig.from_dict(global_data)

        # Load command logs (separate storage)
        log_data = await self._log_store.async_load()
        self._command_logs_cache = log_data if isinstance(log_data, dict) else {}

        _LOGGER.debug(
            "Loaded %d areas, %d schedules, %d groups, command logs for %d areas",
            len(self.areas),
            len(self.schedules),
            len(self.groups),
            len(self._command_logs_cache),
        )

    @callback
    def _data_to_save(self) -> dict[str, Any]:
        """Return data to save."""
        return {
            "areas": {aid: area.to_dict() for aid, area in self.areas.items()},
            "schedules": {
                sid: sched.to_dict() for sid, sched in self.schedules.items()
            },
            "groups": {
                gid: group.to_dict() for gid, group in self.groups.items()
            },
            "global": self.global_config.to_dict(),
        }

    def async_save(self) -> None:
        """Schedule a debounced save."""
        self._store.async_delay_save(self._data_to_save, SAVE_DELAY)

    # Area CRUD

    def add_area(self, area: AreaConfig) -> None:
        """Add an area."""
        self.areas[area.area_id] = area
        self.async_save()

    def update_area(self, area_id: str, **kwargs: Any) -> AreaConfig:
        """Update fields on an existing area."""
        area = self.areas[area_id]
        for key, value in kwargs.items():
            if hasattr(area, key):
                setattr(area, key, value)
        self.async_save()
        return area

    def remove_area(self, area_id: str) -> None:
        """Remove an area and clean up group membership."""
        self.areas.pop(area_id, None)
        for group in self.groups.values():
            if area_id in group.area_ids:
                group.area_ids.remove(area_id)
        self.async_save()

    # Schedule CRUD

    def add_schedule(self, schedule: Schedule) -> None:
        """Add a schedule."""
        self.schedules[schedule.schedule_id] = schedule
        self.async_save()

    def update_schedule(self, schedule_id: str, **kwargs: Any) -> Schedule:
        """Update fields on an existing schedule."""
        schedule = self.schedules[schedule_id]
        for key, value in kwargs.items():
            if hasattr(schedule, key):
                setattr(schedule, key, value)
        self.async_save()
        return schedule

    def remove_schedule(self, schedule_id: str) -> None:
        """Remove a schedule and unlink areas and groups."""
        self.schedules.pop(schedule_id, None)
        for area in self.areas.values():
            if area.schedule_id == schedule_id:
                area.schedule_id = None
        for group in self.groups.values():
            if group.schedule_id == schedule_id:
                group.schedule_id = None
        self.async_save()

    # Group CRUD

    def add_group(self, group: AreaGroup) -> None:
        """Add an area group."""
        self.groups[group.group_id] = group
        self.async_save()

    def update_group(self, group_id: str, **kwargs: Any) -> AreaGroup:
        """Update fields on an existing group."""
        group = self.groups[group_id]
        for key, value in kwargs.items():
            if hasattr(group, key):
                setattr(group, key, value)
        self.async_save()
        return group

    def remove_group(self, group_id: str) -> None:
        """Remove a group. Does not remove the areas."""
        self.groups.pop(group_id, None)
        self.async_save()

    def get_group_for_area(self, area_id: str) -> AreaGroup | None:
        """Find which group (if any) contains an area."""
        for group in self.groups.values():
            if area_id in group.area_ids:
                return group
        return None

    # Global config

    def update_global_config(self, **kwargs: Any) -> GlobalConfig:
        """Update global config fields."""
        for key, value in kwargs.items():
            if hasattr(self.global_config, key):
                setattr(self.global_config, key, value)
        self.async_save()
        return self.global_config

    def get_area_schedule(self, area: AreaConfig) -> WeeklySchedule | None:
        """Get the template weekly schedule for an area."""
        if area.schedule_id and area.schedule_id in self.schedules:
            return self.schedules[area.schedule_id].schedule
        return None

    # Command logs (separate storage file, saved less frequently)

    def load_command_logs(self) -> dict[str, list[dict]]:
        """Load command logs synchronously from cache (async_load must be called first)."""
        return self._command_logs_cache or {}

    def save_command_logs(self, logs: dict[str, list[dict]]) -> None:
        """Persist command logs to disk."""
        self._command_logs_cache = logs
        self._log_store.async_delay_save(lambda: logs, SAVE_DELAY)
