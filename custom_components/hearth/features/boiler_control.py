"""Boiler control based on aggregate TRV heating demand.

UNTESTED: No boiler hardware available for testing.

Aggregates pi_heating_demand across all Danfoss TRVs. When demand exceeds
threshold, turns on the boiler entity and sets heat_available=true on all TRVs.
When demand drops to zero for 2 consecutive checks, turns off boiler and
sets heat_available=false.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from . import DanfossFeature
from ..danfoss_const import (
    ATTR_HEAT_AVAILABLE,
    CLUSTER_THERMOSTAT,
    DANFOSS_MFR_CODE,
)

_LOGGER = logging.getLogger(__name__)

# Check every 5 ticks = 5 minutes
BOILER_CHECK_INTERVAL_TICKS = 5

# Require 2 consecutive zero-demand checks before turning off (hysteresis)
ZERO_DEMAND_OFF_COUNT = 2


class BoilerControlFeature(DanfossFeature):
    """Aggregate heating demand and control boiler entity.

    UNTESTED: This feature has not been tested with real hardware.
    """

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._boiler_on: bool = False
        self._zero_demand_count: int = 0
        self._last_aggregate_demand: float = 0
        self._demand_per_device: dict[str, float] = {}

    async def async_tick(self, now: datetime, tick_count: int) -> None:
        if tick_count % BOILER_CHECK_INTERVAL_TICKS != 0:
            return

        boiler_entity = self.store.global_config.boiler_entity
        if not boiler_entity:
            return

        try:
            await self._evaluate(boiler_entity)
        except Exception:
            _LOGGER.exception("Boiler control error")

    async def _evaluate(self, boiler_entity: str) -> None:
        threshold = getattr(
            self.store.global_config, "boiler_demand_threshold", 5
        )

        # Read pi_heating_demand from all Danfoss TRVs
        demands: dict[str, float] = {}
        for area in self.store.areas.values():
            if not area.enabled:
                continue
            for entity_id in self._get_danfoss_entities(area):
                val = self._read_sibling_numeric(entity_id, "pi_heating_demand")
                if val is not None:
                    demands[entity_id] = val

        self._demand_per_device = demands
        aggregate = max(demands.values()) if demands else 0
        self._last_aggregate_demand = aggregate

        should_be_on = aggregate > threshold

        if should_be_on:
            self._zero_demand_count = 0
            if not self._boiler_on:
                await self._set_boiler(boiler_entity, True)
        else:
            self._zero_demand_count += 1
            if self._boiler_on and self._zero_demand_count >= ZERO_DEMAND_OFF_COUNT:
                await self._set_boiler(boiler_entity, False)

    async def _set_boiler(self, boiler_entity: str, on: bool) -> None:
        action = "turn_on" if on else "turn_off"
        try:
            await self.hass.services.async_call(
                "homeassistant", action,
                {"entity_id": boiler_entity},
                blocking=True,
            )
            self._boiler_on = on
            _LOGGER.info(
                "Boiler %s (demand=%.0f%%)", action, self._last_aggregate_demand
            )
        except Exception:
            _LOGGER.exception("Failed to %s boiler %s", action, boiler_entity)

        # Set heat_available on all Danfoss TRVs
        heat_val = True if on else False
        for area in self.store.areas.values():
            if not area.enabled:
                continue
            for entity_id in self._get_danfoss_entities(area):
                backend = self._get_backend(entity_id)
                if backend is None:
                    continue
                if not self._is_entity_available(entity_id):
                    continue
                try:
                    await backend.async_write_attribute(
                        entity_id,
                        CLUSTER_THERMOSTAT,
                        ATTR_HEAT_AVAILABLE,
                        heat_val,
                        manufacturer=DANFOSS_MFR_CODE,
                    )
                except Exception:
                    _LOGGER.debug(
                        "Failed to set heat_available on %s", entity_id
                    )

    def get_boiler_state(self) -> dict[str, Any] | None:
        """Return current boiler state, or None if no boiler configured."""
        if not self.store.global_config.boiler_entity:
            return None
        return {
            "boiler_on": self._boiler_on,
            "aggregate_demand": self._last_aggregate_demand,
            "demand_per_device": dict(self._demand_per_device),
        }
