"""Data models for Hearth integration."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone

from .const import (
    DAYS_OF_WEEK,
    DEFAULT_AUTO_AWAY_DELAY,
    DEFAULT_AWAY_TEMP,
    DEFAULT_HOME_TEMP,
    DEFAULT_MAX_TEMP,
    DEFAULT_MIN_TEMP,
    SOURCE_SCHEDULE,
)


@dataclass
class GlobalConfig:
    """Global integration configuration."""

    vacation_mode: bool = False
    vacation_schedule_id: str | None = None
    presence_entities: list[str] = field(default_factory=list)
    auto_away_enabled: bool = False
    auto_away_delay_minutes: int = DEFAULT_AUTO_AWAY_DELAY
    boiler_entity: str | None = None
    boiler_demand_threshold: int = 5  # percent - UNTESTED
    default_home_temp: float = DEFAULT_HOME_TEMP
    default_away_temp: float = DEFAULT_AWAY_TEMP
    default_min_temp: float = DEFAULT_MIN_TEMP
    default_max_temp: float = DEFAULT_MAX_TEMP
    low_battery_threshold: int = 10
    ungrouped_position: str = "top"  # "top" or "bottom"

    def to_dict(self) -> dict:
        return {
            "vacation_mode": self.vacation_mode,
            "vacation_schedule_id": self.vacation_schedule_id,
            "presence_entities": self.presence_entities,
            "auto_away_enabled": self.auto_away_enabled,
            "auto_away_delay_minutes": self.auto_away_delay_minutes,
            "boiler_entity": self.boiler_entity,
            "boiler_demand_threshold": self.boiler_demand_threshold,
            "default_home_temp": self.default_home_temp,
            "default_away_temp": self.default_away_temp,
            "default_min_temp": self.default_min_temp,
            "default_max_temp": self.default_max_temp,
            "low_battery_threshold": self.low_battery_threshold,
            "ungrouped_position": self.ungrouped_position,
        }

    @classmethod
    def from_dict(cls, data: dict) -> GlobalConfig:
        return cls(
            vacation_mode=data.get("vacation_mode", False),
            vacation_schedule_id=data.get("vacation_schedule_id"),
            presence_entities=data.get("presence_entities", []),
            auto_away_enabled=data.get("auto_away_enabled", False),
            auto_away_delay_minutes=data.get(
                "auto_away_delay_minutes", DEFAULT_AUTO_AWAY_DELAY
            ),
            boiler_entity=data.get("boiler_entity"),
            boiler_demand_threshold=data.get("boiler_demand_threshold", 5),
            default_home_temp=data.get("default_home_temp", DEFAULT_HOME_TEMP),
            default_away_temp=data.get("default_away_temp", DEFAULT_AWAY_TEMP),
            default_min_temp=data.get("default_min_temp", DEFAULT_MIN_TEMP),
            default_max_temp=data.get("default_max_temp", DEFAULT_MAX_TEMP),
            low_battery_threshold=data.get("low_battery_threshold", 10),
            ungrouped_position=data.get("ungrouped_position", "top"),
        )


@dataclass
class ScheduleEntry:
    """A single time/temp entry in a day schedule (template)."""

    time: str  # "HH:MM"
    temp: str  # "home" or "away"

    def to_dict(self) -> dict:
        return {"time": self.time, "temp": self.temp}

    @classmethod
    def from_dict(cls, data: dict) -> ScheduleEntry:
        temp = data["temp"]
        # Early versions allowed numeric temps here; the engine has always
        # materialized anything but "home" as away. Normalize on load so the
        # stored data matches the "home"/"away" contract.
        if temp not in ("home", "away"):
            temp = "away"
        return cls(time=data["time"], temp=temp)


@dataclass
class DaySchedule:
    """Schedule entries for a single day."""

    entries: list[ScheduleEntry] = field(default_factory=list)

    def to_dict(self) -> list[dict]:
        return [e.to_dict() for e in self.entries]

    @classmethod
    def from_dict(cls, data: list[dict]) -> DaySchedule:
        return cls(entries=[ScheduleEntry.from_dict(e) for e in data])


@dataclass
class WeeklySchedule:
    """Full weekly schedule, keyed by day name."""

    days: dict[str, DaySchedule] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {day: sched.to_dict() for day, sched in self.days.items()}

    @classmethod
    def from_dict(cls, data: dict) -> WeeklySchedule:
        days = {}
        for day in DAYS_OF_WEEK:
            if day in data:
                days[day] = DaySchedule.from_dict(data[day])
        return cls(days=days)


@dataclass
class Schedule:
    """A named schedule shared by multiple areas."""

    schedule_id: str
    name: str
    schedule: WeeklySchedule = field(default_factory=WeeklySchedule)

    def to_dict(self) -> dict:
        return {
            "schedule_id": self.schedule_id,
            "name": self.name,
            "schedule": self.schedule.to_dict(),
        }

    @classmethod
    def from_dict(cls, data: dict) -> Schedule:
        return cls(
            schedule_id=data.get("schedule_id", data.get("group_id", "")),
            name=data["name"],
            schedule=WeeklySchedule.from_dict(data.get("schedule", {})),
        )


# --- Materialized schedule (per-area, concrete datetimes) ---


@dataclass
class MaterializedEntry:
    """A single entry in a materialized schedule."""

    time: str  # ISO datetime string (timezone-aware)
    state: str  # "home" or "away"
    source: str = SOURCE_SCHEDULE  # "schedule" or "user"

    def to_dict(self) -> dict:
        return {"time": self.time, "state": self.state, "source": self.source}

    @classmethod
    def from_dict(cls, data: dict) -> MaterializedEntry:
        return cls(
            time=data["time"],
            state=data["state"],
            source=data.get("source", SOURCE_SCHEDULE),
        )


@dataclass
class MaterializedSchedule:
    """Concrete schedule for an area - full datetimes, user chops included."""

    entries: list[MaterializedEntry] = field(default_factory=list)
    template_schedule_id: str | None = None
    generated_at: str | None = None

    def to_dict(self) -> dict:
        return {
            "entries": [e.to_dict() for e in self.entries],
            "template_schedule_id": self.template_schedule_id,
            "generated_at": self.generated_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> MaterializedSchedule:
        return cls(
            entries=[MaterializedEntry.from_dict(e) for e in data.get("entries", [])],
            template_schedule_id=data.get("template_schedule_id"),
            generated_at=data.get("generated_at"),
        )


# --- Override (temp-only) ---


@dataclass
class Override:
    """Temperature override for an area."""

    temp: float
    until: str | None = "next_transition"  # "next_transition", ISO datetime, or None
    created_at: str = ""

    def __post_init__(self) -> None:
        if not self.created_at:
            self.created_at = datetime.now(timezone.utc).isoformat()

    def to_dict(self) -> dict:
        return {
            "temp": self.temp,
            "until": self.until,
            "created_at": self.created_at,
        }

    @classmethod
    def from_dict(cls, data: dict) -> Override:
        return cls(
            temp=data["temp"],
            until=data.get("until", "next_transition"),
            created_at=data.get("created_at", ""),
        )


# --- Area group ---


@dataclass
class AreaGroup:
    """Named group of areas with optional shared schedule."""

    group_id: str
    name: str
    area_ids: list[str] = field(default_factory=list)  # ordered
    schedule_id: str | None = None  # overrides per-area schedule when set
    order: int = 0  # display order among groups

    def to_dict(self) -> dict:
        return {
            "group_id": self.group_id,
            "name": self.name,
            "area_ids": self.area_ids,
            "schedule_id": self.schedule_id,
            "order": self.order,
        }

    @classmethod
    def from_dict(cls, data: dict) -> AreaGroup:
        return cls(
            group_id=data.get("group_id", ""),
            name=data.get("name", ""),
            area_ids=data.get("area_ids", []),
            schedule_id=data.get("schedule_id"),
            order=data.get("order", 0),
        )


# --- Area config ---


@dataclass
class AreaConfig:
    """Configuration for a heating area."""

    area_id: str  # HA area ID - primary key
    climate_entities: list[str] = field(default_factory=list)
    temperature_sensors: list[str] = field(default_factory=list)
    window_sensors: list[str] = field(default_factory=list)
    home_temp: float = DEFAULT_HOME_TEMP
    away_temp: float = DEFAULT_AWAY_TEMP
    min_temp: float = DEFAULT_MIN_TEMP
    max_temp: float = DEFAULT_MAX_TEMP
    covered_entities: list[str] = field(default_factory=list)
    schedule_id: str | None = None
    enabled: bool = True
    override: Override | None = None
    materialized_schedule: MaterializedSchedule | None = None

    def to_dict(self) -> dict:
        return {
            "area_id": self.area_id,
            "climate_entities": self.climate_entities,
            "temperature_sensors": self.temperature_sensors,
            "window_sensors": self.window_sensors,
            "home_temp": self.home_temp,
            "away_temp": self.away_temp,
            "min_temp": self.min_temp,
            "max_temp": self.max_temp,
            "covered_entities": self.covered_entities,
            "schedule_id": self.schedule_id,
            "enabled": self.enabled,
            "override": self.override.to_dict() if self.override else None,
            "materialized_schedule": (
                self.materialized_schedule.to_dict()
                if self.materialized_schedule
                else None
            ),
        }

    @classmethod
    def from_dict(cls, data: dict) -> AreaConfig:
        override_data = data.get("override")
        mat_data = data.get("materialized_schedule")
        return cls(
            area_id=data.get("area_id", ""),
            climate_entities=data.get("climate_entities", []),
            temperature_sensors=data.get("temperature_sensors", []),
            window_sensors=data.get("window_sensors", []),
            home_temp=data.get("home_temp", DEFAULT_HOME_TEMP),
            away_temp=data.get("away_temp", DEFAULT_AWAY_TEMP),
            min_temp=data.get("min_temp", DEFAULT_MIN_TEMP),
            max_temp=data.get("max_temp", DEFAULT_MAX_TEMP),
            covered_entities=data.get("covered_entities", []),
            schedule_id=data.get("schedule_id"),
            enabled=data.get("enabled", True),
            override=Override.from_dict(override_data) if override_data else None,
            materialized_schedule=(
                MaterializedSchedule.from_dict(mat_data) if mat_data else None
            ),
        )
