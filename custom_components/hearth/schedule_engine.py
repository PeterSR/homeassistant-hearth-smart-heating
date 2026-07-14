"""Schedule evaluation engine: pure logic, no side effects."""

from __future__ import annotations

from datetime import datetime, time, timedelta
from typing import Any

from .const import (
    DAYS_OF_WEEK,
    SOURCE_SCHEDULE,
    SOURCE_USER,
    STATE_AWAY,
    STATE_HOME,
    STATE_OFF,
)
from .models import (
    AreaConfig,
    DaySchedule,
    GlobalConfig,
    MaterializedEntry,
    MaterializedSchedule,
    Override,
    ScheduleEntry,
    WeeklySchedule,
)


class ScheduleEngine:
    """Evaluates materialized schedules and determines area state."""

    # --- Core state computation ---

    def compute_area_state(
        self,
        area: AreaConfig,
        global_config: GlobalConfig,
        now: datetime,
    ) -> dict[str, Any]:
        """Compute the effective state for an area.

        Returns dict with: effective_state, target_temp, schedule_state, following_schedule
        """
        if not area.enabled:
            return {
                "effective_state": STATE_OFF,
                "target_temp": area.min_temp,
                "schedule_state": None,
                "following_schedule": False,
            }

        # Get current state from materialized schedule
        schedule_state = self.get_current_state(area.materialized_schedule, now)
        effective_state = schedule_state or STATE_HOME

        # Resolve target temp from state
        target_temp = self._resolve_state_temp(effective_state, area)

        # Check override
        if area.override and not self.is_override_expired(area, now):
            target_temp = area.override.temp

        # Determine if following schedule (no user chops today, no active override)
        following_schedule = self._is_following_schedule(area, now)

        return {
            "effective_state": effective_state,
            "target_temp": target_temp,
            "schedule_state": schedule_state,
            "following_schedule": following_schedule,
        }

    # --- Materialized schedule operations ---

    def materialize_schedule(
        self,
        schedule: WeeklySchedule,
        schedule_id: str | None,
        now: datetime,
    ) -> MaterializedSchedule:
        """Generate a materialized schedule from a weekly template.

        Creates entries for yesterday + today + tomorrow + day-after-tomorrow.
        Yesterday is included so the last entry (e.g. 22:00 away) carries over
        through midnight when the schedule is regenerated at day boundaries.
        """
        entries: list[MaterializedEntry] = []
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        for day_offset in range(-1, 3):  # yesterday, today, tomorrow, day after
            day_dt = today + timedelta(days=day_offset)
            day_name = DAYS_OF_WEEK[day_dt.weekday()]
            day_sched = schedule.days.get(day_name)
            if not day_sched:
                continue

            for entry in day_sched.entries:
                entry_time = _parse_time(entry.time)
                entry_dt = day_dt.replace(
                    hour=entry_time.hour,
                    minute=entry_time.minute,
                    second=0,
                    microsecond=0,
                    tzinfo=now.tzinfo,
                )
                state = STATE_HOME if entry.temp == "home" else STATE_AWAY
                entries.append(
                    MaterializedEntry(
                        time=entry_dt.isoformat(),
                        state=state,
                        source=SOURCE_SCHEDULE,
                    )
                )

        entries.sort(key=lambda e: e.time)

        return MaterializedSchedule(
            entries=entries,
            template_schedule_id=schedule_id,
            generated_at=now.isoformat(),
        )

    def insert_user_entry(
        self,
        materialized: MaterializedSchedule,
        state: str,
        now: datetime,
    ) -> MaterializedSchedule:
        """Insert a user chop into the materialized schedule."""
        new_entry = MaterializedEntry(
            time=now.isoformat(),
            state=state,
            source=SOURCE_USER,
        )
        entries = list(materialized.entries)
        entries.append(new_entry)
        entries.sort(key=lambda e: e.time)

        return MaterializedSchedule(
            entries=entries,
            template_schedule_id=materialized.template_schedule_id,
            generated_at=materialized.generated_at,
        )

    def needs_rematerialization(
        self,
        materialized: MaterializedSchedule | None,
        now: datetime,
    ) -> bool:
        """Check if the materialized schedule needs to be regenerated."""
        if materialized is None or not materialized.entries:
            return True

        # Check if we have entries covering tomorrow
        tomorrow_start = now.replace(
            hour=0, minute=0, second=0, microsecond=0
        ) + timedelta(days=1)
        last_entry_time = datetime.fromisoformat(materialized.entries[-1].time)
        return last_entry_time < tomorrow_start

    # --- Query helpers ---

    def get_current_state(
        self,
        materialized: MaterializedSchedule | None,
        now: datetime,
    ) -> str | None:
        """Get the current state from the materialized schedule."""
        if not materialized or not materialized.entries:
            return None

        now_iso = now.isoformat()
        active_state = None
        for entry in materialized.entries:
            if entry.time <= now_iso:
                active_state = entry.state
            else:
                break

        return active_state

    def get_next_transition(
        self,
        materialized: MaterializedSchedule | None,
        now: datetime,
    ) -> tuple[datetime, str] | None:
        """Find the next transition after now.

        Returns (transition_datetime, state) or None.
        """
        if not materialized or not materialized.entries:
            return None

        now_iso = now.isoformat()
        for entry in materialized.entries:
            if entry.time > now_iso:
                return (datetime.fromisoformat(entry.time), entry.state)

        return None

    def get_scheduled_target_temp(
        self,
        materialized: MaterializedSchedule | None,
        area: AreaConfig,
        now: datetime,
    ) -> float | None:
        """Resolve the current scheduled target temp for an area, ignoring overrides."""
        state = self.get_current_state(materialized, now)
        if state is None:
            return None
        return self._resolve_state_temp(state, area)

    def get_next_scheduled_target(
        self,
        materialized: MaterializedSchedule | None,
        area: AreaConfig,
        now: datetime,
    ) -> tuple[float, datetime] | None:
        """Get the upcoming scheduled target temp and when it transitions."""
        next_trans = self.get_next_transition(materialized, now)
        if next_trans is None:
            return None
        when, state = next_trans
        return (self._resolve_state_temp(state, area), when)

    def get_today_entries(
        self,
        materialized: MaterializedSchedule | None,
        now: datetime,
    ) -> list[dict]:
        """Get today's materialized entries for the schedule bar display."""
        if not materialized or not materialized.entries:
            return []

        today_start = now.replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        tomorrow_start = today_start + timedelta(days=1)

        today_start_iso = today_start.isoformat()
        tomorrow_start_iso = tomorrow_start.isoformat()

        result = []

        # Include the carry-over entry (last entry before today)
        carry_over = None
        for entry in materialized.entries:
            if entry.time < today_start_iso:
                carry_over = entry
            else:
                break

        if carry_over:
            result.append({
                "time": today_start_iso,
                "state": carry_over.state,
                "source": carry_over.source,
            })

        # Include all entries within today
        for entry in materialized.entries:
            if today_start_iso <= entry.time < tomorrow_start_iso:
                result.append(entry.to_dict())

        return result

    # --- Override expiry ---

    def is_override_expired(self, area: AreaConfig, now: datetime) -> bool:
        """Check if an area's override has expired."""
        if area.override is None:
            return True

        if area.override.until is None:
            return False

        if area.override.until == "next_transition":
            created = datetime.fromisoformat(area.override.created_at)
            return self._has_transition_since(area.materialized_schedule, created, now)

        # ISO datetime string
        until_dt = datetime.fromisoformat(area.override.until)
        return now >= until_dt

    # --- Private helpers ---

    def _resolve_state_temp(self, state: str, area: AreaConfig) -> float:
        """Get the default temperature for a state."""
        if state == STATE_HOME:
            return area.home_temp
        return area.away_temp

    def _is_following_schedule(self, area: AreaConfig, now: datetime) -> bool:
        """Check if the area is purely following the template schedule."""
        # Has active override → not following
        if area.override and not self.is_override_expired(area, now):
            return False

        # Has user-sourced entries today → not following
        if area.materialized_schedule:
            today_start = now.replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            today_iso = today_start.isoformat()
            for entry in area.materialized_schedule.entries:
                if entry.time >= today_iso and entry.source == SOURCE_USER:
                    return False

        return True

    def _has_transition_since(
        self,
        materialized: MaterializedSchedule | None,
        since: datetime,
        now: datetime,
    ) -> bool:
        """Check if any materialized transition occurred between since and now."""
        if not materialized or not materialized.entries:
            return False

        for entry in materialized.entries:
            entry_dt = datetime.fromisoformat(entry.time)
            if since < entry_dt <= now:
                return True

        return False


def _parse_time(time_str: str) -> time:
    """Parse 'HH:MM' string to time object."""
    parts = time_str.split(":")
    return time(int(parts[0]), int(parts[1]))
