"""Load balancing for multi-TRV areas with Danfoss Ally devices."""

from __future__ import annotations

import logging
from datetime import datetime

from . import DanfossFeature
from ..danfoss_const import (
    ATTR_LOAD_ROOM_MEAN,
    CLUSTER_THERMOSTAT,
    DANFOSS_MFR_CODE,
)

_LOGGER = logging.getLogger(__name__)

# Run every 15 ticks = 15 minutes
LOAD_BALANCE_INTERVAL_TICKS = 15

# Staleness threshold: discard readings older than 90 minutes
MAX_READING_AGE_SECONDS = 5400

# Minimum valid load value (below this = inactive/disabled)
MIN_VALID_LOAD = -500


class LoadBalancingFeature(DanfossFeature):
    """Calculate and distribute room load mean for multi-TRV areas."""

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        # entity_id -> (load_value, timestamp)
        self._load_cache: dict[str, tuple[int, datetime]] = {}

    async def async_tick(self, now: datetime, tick_count: int) -> None:
        if tick_count % LOAD_BALANCE_INTERVAL_TICKS != 0:
            return

        for area in self.store.areas.values():
            if not area.enabled:
                continue
            try:
                await self._update_area(area, now)
            except Exception:
                _LOGGER.exception(
                    "Load balancing error for area %s", area.area_id
                )

    async def _update_area(self, area, now: datetime) -> None:
        danfoss_entities = self._get_danfoss_entities(area)

        if len(danfoss_entities) < 2:
            return  # Load balancing requires 2+ TRVs

        # Read load_estimate from sibling HA entities
        for entity_id in danfoss_entities:
            val = self._read_sibling_numeric(entity_id, "load_estimate")
            if val is not None:
                self._load_cache[entity_id] = (int(val), now)

        # Calculate average, discarding invalid/stale values
        valid_loads = []
        for entity_id in danfoss_entities:
            if entity_id not in self._load_cache:
                continue
            load, timestamp = self._load_cache[entity_id]
            age = (now - timestamp).total_seconds()
            if load >= MIN_VALID_LOAD and age < MAX_READING_AGE_SECONDS:
                valid_loads.append(load)

        if not valid_loads:
            return

        room_mean = int(sum(valid_loads) / len(valid_loads))

        # Write room_mean to ALL TRVs in the area
        for entity_id in danfoss_entities:
            backend = self._get_backend(entity_id)
            if backend is None:
                continue
            if not self._is_entity_available(entity_id):
                continue
            try:
                await backend.async_write_attribute(
                    entity_id,
                    CLUSTER_THERMOSTAT,
                    ATTR_LOAD_ROOM_MEAN,
                    room_mean,
                    manufacturer=DANFOSS_MFR_CODE,
                )
                self._log_command(
                    entity_id, "load_balance", True, f"room_mean={room_mean}",
                )
            except Exception as exc:
                self._log_command(entity_id, "load_balance", False, str(exc))
                _LOGGER.exception("Failed to write load mean to %s", entity_id)

        _LOGGER.debug(
            "Load balancing area %s: loads=%s mean=%d written to %d TRVs",
            area.area_id, valid_loads, room_mean, len(danfoss_entities),
        )
