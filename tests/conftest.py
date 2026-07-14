"""Shared test fixtures for Hearth."""

from __future__ import annotations

import pytest

from custom_components.hearth.models import (
    AreaConfig,
    DaySchedule,
    GlobalConfig,
    Override,
    ScheduleEntry,
    WeeklySchedule,
)
from custom_components.hearth.schedule_engine import ScheduleEngine


@pytest.fixture
def engine() -> ScheduleEngine:
    return ScheduleEngine()


@pytest.fixture
def global_config() -> GlobalConfig:
    return GlobalConfig()


def make_schedule(**day_entries: list[tuple[str, str | float]]) -> WeeklySchedule:
    """Helper to build a WeeklySchedule from day -> [(time, temp), ...] mapping."""
    days = {}
    for day, entries in day_entries.items():
        days[day] = DaySchedule(
            entries=[ScheduleEntry(time=t, temp=tmp) for t, tmp in entries]
        )
    return WeeklySchedule(days=days)


def make_area(
    area_id: str = "test_area",
    home_temp: float = 21.0,
    away_temp: float = 17.0,
    override: Override | None = None,
    schedule_id: str | None = None,
    **kwargs,
) -> AreaConfig:
    """Helper to build an AreaConfig."""
    return AreaConfig(
        area_id=area_id,
        home_temp=home_temp,
        away_temp=away_temp,
        override=override,
        schedule_id=schedule_id,
        **kwargs,
    )
