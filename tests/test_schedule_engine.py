"""Tests for the schedule engine.

The engine works on *materialized* schedules (concrete datetimes derived from
a weekly template) rather than evaluating the weekly template directly. There
is no per-area "mode" field anymore: an area is either enabled (state comes
from its materialized schedule plus an optional temperature override) or
disabled (fixed at min_temp). Vacation mode is not implemented here at all;
the coordinator swaps in a different weekly template before materializing,
so from the engine's point of view a vacation schedule is just a schedule.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

import pytest

from custom_components.hearth.const import STATE_AWAY, STATE_HOME, STATE_OFF
from custom_components.hearth.models import Override
from custom_components.hearth.schedule_engine import ScheduleEngine

from .conftest import make_area, make_schedule

# A typical weekday schedule:
# 06:30 home, 08:00 away, 16:00 home, 22:30 away
WEEKDAY_ENTRIES = [("06:30", "home"), ("08:00", "away"), ("16:00", "home"), ("22:30", "away")]

WEEKDAY_SCHEDULE = make_schedule(
    monday=WEEKDAY_ENTRIES,
    tuesday=WEEKDAY_ENTRIES,
    wednesday=WEEKDAY_ENTRIES,
    thursday=WEEKDAY_ENTRIES,
    friday=WEEKDAY_ENTRIES,
    saturday=[("08:00", "home"), ("23:00", "away")],
    sunday=[("09:00", "home"), ("22:00", "away")],
)


@pytest.fixture
def engine() -> ScheduleEngine:
    return ScheduleEngine()


def _area_at(engine, now, schedule=WEEKDAY_SCHEDULE, **kwargs):
    """Build an AreaConfig with a materialized schedule generated at `now`."""
    area = make_area(**kwargs)
    area.materialized_schedule = engine.materialize_schedule(schedule, "test_schedule", now)
    return area


def _target_temp(engine, area, global_config, now):
    return engine.compute_area_state(area, global_config, now)["target_temp"]


class TestComputeAreaStateBasic:
    """Test schedule evaluation at various times of day, via compute_area_state."""

    def test_morning_home_period(self, engine, global_config):
        now = datetime(2026, 3, 9, 7, 0, tzinfo=timezone.utc)  # Monday
        area = _area_at(engine, now)
        assert _target_temp(engine, area, global_config, now) == 21.0

    def test_midday_away_period(self, engine, global_config):
        now = datetime(2026, 3, 9, 12, 0, tzinfo=timezone.utc)
        area = _area_at(engine, now)
        assert _target_temp(engine, area, global_config, now) == 17.0

    def test_evening_home_period(self, engine, global_config):
        now = datetime(2026, 3, 9, 20, 0, tzinfo=timezone.utc)
        area = _area_at(engine, now)
        assert _target_temp(engine, area, global_config, now) == 21.0

    def test_night_away_period(self, engine, global_config):
        now = datetime(2026, 3, 9, 23, 0, tzinfo=timezone.utc)
        area = _area_at(engine, now)
        assert _target_temp(engine, area, global_config, now) == 17.0

    def test_before_first_entry_carries_over_from_previous_day(self, engine, global_config):
        # Monday 05:00 -> before first entry, carries Sunday's last entry (away)
        now = datetime(2026, 3, 9, 5, 0, tzinfo=timezone.utc)
        area = _area_at(engine, now)
        assert _target_temp(engine, area, global_config, now) == 17.0


class TestMidnightCrossing:
    """Test schedule logic across midnight boundaries."""

    def test_sunday_last_entry_carries_to_monday_early(self, engine, global_config):
        # Monday 03:00 -> Sunday's last entry (22:00 away) carries over
        now = datetime(2026, 3, 9, 3, 0, tzinfo=timezone.utc)
        area = _area_at(engine, now)
        assert _target_temp(engine, area, global_config, now) == 17.0

    def test_saturday_night_carries(self, engine, global_config):
        # Sunday 02:00 -> Saturday's last entry (23:00 away) carries over
        now = datetime(2026, 3, 15, 2, 0, tzinfo=timezone.utc)
        area = _area_at(engine, now)
        assert _target_temp(engine, area, global_config, now) == 17.0


class TestDisabledArea:
    """An area with enabled=False is fully independent of any schedule."""

    def test_disabled_area_uses_min_temp(self, engine, global_config):
        area = make_area(enabled=False, min_temp=5.0)
        now = datetime(2026, 3, 9, 12, 0, tzinfo=timezone.utc)
        state = engine.compute_area_state(area, global_config, now)
        assert state["effective_state"] == STATE_OFF
        assert state["target_temp"] == 5.0
        assert state["schedule_state"] is None
        assert state["following_schedule"] is False

    def test_disabled_area_ignores_global_config(self, engine, global_config):
        # Vacation mode (or anything else on global_config) has no bearing on
        # a disabled area; disabled always wins.
        global_config.vacation_mode = True
        area = make_area(enabled=False, min_temp=5.0)
        now = datetime(2026, 3, 9, 12, 0, tzinfo=timezone.utc)
        assert _target_temp(engine, area, global_config, now) == 5.0


class TestOverrides:
    """Test temperature override handling."""

    def test_override_next_transition_active(self, engine, global_config):
        """Override until next transition should be active when no transition has passed."""
        now = datetime(2026, 3, 9, 19, 0, tzinfo=timezone.utc)  # Monday 19:00
        area = _area_at(engine, now)
        area.override = Override(
            temp=22.0,
            until="next_transition",
            created_at="2026-03-09T18:00:00+00:00",
        )
        # Next transition (22:30) has not happened yet -> override still active
        assert _target_temp(engine, area, global_config, now) == 22.0

    def test_override_next_transition_expired(self, engine, global_config):
        """Override until next transition should expire once a transition passes."""
        now = datetime(2026, 3, 9, 23, 0, tzinfo=timezone.utc)
        area = _area_at(engine, now)
        area.override = Override(
            temp=22.0,
            until="next_transition",
            created_at="2026-03-09T18:00:00+00:00",
        )
        # Transition at 22:30 has passed -> override expired, schedule value (away) applies
        assert _target_temp(engine, area, global_config, now) == 17.0

    def test_override_timed(self, engine, global_config):
        """Override until a specific time should expire at that time."""
        area = _area_at(engine, datetime(2026, 3, 9, 20, 0, tzinfo=timezone.utc))
        area.override = Override(
            temp=23.0,
            until="2026-03-09T21:00:00+00:00",
            created_at="2026-03-09T18:00:00+00:00",
        )

        # Before expiry -> override active
        now = datetime(2026, 3, 9, 20, 0, tzinfo=timezone.utc)
        assert _target_temp(engine, area, global_config, now) == 23.0

        # After expiry -> schedule resumes (16:00 home period)
        now = datetime(2026, 3, 9, 21, 30, tzinfo=timezone.utc)
        assert _target_temp(engine, area, global_config, now) == 21.0

    def test_override_indefinite(self, engine, global_config):
        """Override with until=None should never expire."""
        area = _area_at(engine, datetime(2026, 3, 9, 10, 0, tzinfo=timezone.utc))
        area.override = Override(
            temp=24.0,
            until=None,
            created_at="2026-03-09T10:00:00+00:00",
        )
        # Way in the future -> still active
        now = datetime(2026, 3, 15, 10, 0, tzinfo=timezone.utc)
        assert _target_temp(engine, area, global_config, now) == 24.0

    def test_is_override_expired_helper(self, engine):
        area = make_area()
        assert engine.is_override_expired(area, datetime(2026, 3, 9, tzinfo=timezone.utc)) is True

        area.override = Override(temp=20.0, until=None, created_at="2026-03-09T10:00:00+00:00")
        assert engine.is_override_expired(area, datetime(2026, 3, 15, tzinfo=timezone.utc)) is False


class TestUserChop:
    """Test the 'chop' mechanism: user taps Home/Away, forcing a state until the
    next scheduled transition (replaces the old per-area mode field)."""

    def test_chop_to_home_during_scheduled_away_period(self, engine, global_config):
        now = datetime(2026, 3, 9, 11, 0, tzinfo=timezone.utc)  # Monday, scheduled away
        area = _area_at(engine, now)
        area.materialized_schedule = engine.insert_user_entry(
            area.materialized_schedule, STATE_HOME, now
        )
        later = datetime(2026, 3, 9, 12, 0, tzinfo=timezone.utc)
        state = engine.compute_area_state(area, global_config, later)
        assert state["effective_state"] == STATE_HOME
        assert state["target_temp"] == 21.0
        assert state["following_schedule"] is False

    def test_chop_to_away_during_scheduled_home_period(self, engine, global_config):
        now = datetime(2026, 3, 9, 17, 0, tzinfo=timezone.utc)  # Monday, scheduled home
        area = _area_at(engine, now)
        area.materialized_schedule = engine.insert_user_entry(
            area.materialized_schedule, STATE_AWAY, now
        )
        later = datetime(2026, 3, 9, 18, 0, tzinfo=timezone.utc)
        state = engine.compute_area_state(area, global_config, later)
        assert state["effective_state"] == STATE_AWAY
        assert state["target_temp"] == 17.0

    def test_no_chop_and_no_override_is_following_schedule(self, engine, global_config):
        now = datetime(2026, 3, 9, 12, 0, tzinfo=timezone.utc)
        area = _area_at(engine, now)
        state = engine.compute_area_state(area, global_config, now)
        assert state["following_schedule"] is True

    def test_chop_superseded_by_next_scheduled_transition(self, engine, global_config):
        # Chop away at 07:00 during the 06:30 home period. The chop holds only
        # until the next scheduled transition; at 16:30 the 16:00 home entry
        # has taken over.
        now = datetime(2026, 3, 9, 7, 0, tzinfo=timezone.utc)
        area = _area_at(engine, now)
        area.materialized_schedule = engine.insert_user_entry(
            area.materialized_schedule, STATE_AWAY, now
        )
        during = datetime(2026, 3, 9, 7, 30, tzinfo=timezone.utc)
        assert engine.compute_area_state(area, global_config, during)["effective_state"] == STATE_AWAY

        after = datetime(2026, 3, 9, 16, 30, tzinfo=timezone.utc)
        assert engine.compute_area_state(area, global_config, after)["effective_state"] == STATE_HOME

    def test_following_schedule_stays_false_after_chop_superseded(self, engine, global_config):
        # Pins current behavior: any user entry earlier today keeps
        # following_schedule False for the rest of the day, even after a later
        # scheduled transition has superseded the chop and the area is back on
        # its scheduled state. If chop-supersession semantics are ever
        # revisited (arguably this should flip back to True), update this test
        # deliberately.
        now = datetime(2026, 3, 9, 7, 0, tzinfo=timezone.utc)
        area = _area_at(engine, now)
        area.materialized_schedule = engine.insert_user_entry(
            area.materialized_schedule, STATE_AWAY, now
        )
        after = datetime(2026, 3, 9, 16, 30, tzinfo=timezone.utc)
        state = engine.compute_area_state(area, global_config, after)
        assert state["effective_state"] == STATE_HOME  # back on schedule
        assert state["following_schedule"] is False  # but still flagged as chopped


class TestNoSchedule:
    """Test behavior with no materialized schedule at all."""

    def test_no_schedule_defaults_to_home_temp(self, engine, global_config):
        area = make_area()  # materialized_schedule is None
        now = datetime(2026, 3, 9, 12, 0, tzinfo=timezone.utc)
        assert _target_temp(engine, area, global_config, now) == 21.0


class TestNextTransition:
    """Test next transition calculation over a materialized schedule."""

    def test_next_transition_same_day(self, engine):
        # Monday 10:00 -> next is 16:00 home
        now = datetime(2026, 3, 9, 10, 0, tzinfo=timezone.utc)
        materialized = engine.materialize_schedule(WEEKDAY_SCHEDULE, "test_schedule", now)
        result = engine.get_next_transition(materialized, now)
        assert result is not None
        dt, state = result
        assert dt.hour == 16
        assert dt.minute == 0
        assert state == STATE_HOME

    def test_next_transition_crosses_day(self, engine):
        # Monday 23:00 -> next is Tuesday 06:30
        now = datetime(2026, 3, 9, 23, 0, tzinfo=timezone.utc)
        materialized = engine.materialize_schedule(WEEKDAY_SCHEDULE, "test_schedule", now)
        result = engine.get_next_transition(materialized, now)
        assert result is not None
        dt, state = result
        assert dt.day == 10  # Tuesday
        assert dt.hour == 6
        assert dt.minute == 30
        assert state == STATE_HOME

    def test_no_schedule_returns_none(self, engine):
        now = datetime(2026, 3, 9, 10, 0, tzinfo=timezone.utc)
        assert engine.get_next_transition(None, now) is None


class TestScheduledTargets:
    """Test the schedule-only lookups used for preheat (ignore overrides)."""

    def test_get_scheduled_target_temp_ignores_override(self, engine):
        now = datetime(2026, 3, 9, 19, 0, tzinfo=timezone.utc)  # Monday, scheduled home
        area = _area_at(engine, now)
        area.override = Override(temp=30.0, until=None, created_at=now.isoformat())
        # Scheduled temp is unaffected by the override
        assert engine.get_scheduled_target_temp(area.materialized_schedule, area, now) == 21.0

    def test_get_next_scheduled_target(self, engine):
        now = datetime(2026, 3, 9, 10, 0, tzinfo=timezone.utc)
        area = _area_at(engine, now)
        result = engine.get_next_scheduled_target(area.materialized_schedule, area, now)
        assert result is not None
        temp, when = result
        assert temp == 21.0
        assert when.hour == 16


class TestCurrentState:
    """Test current state identification (inclusive of the transition instant)."""

    def test_at_exact_transition_time(self, engine):
        # Monday exactly 16:00 -> the 16:00 "home" entry is already active
        now = datetime(2026, 3, 9, 16, 0, tzinfo=timezone.utc)
        materialized = engine.materialize_schedule(WEEKDAY_SCHEDULE, "test_schedule", now)
        assert engine.get_current_state(materialized, now) == STATE_HOME


class TestOverrideWithNoSchedule:
    """Documents the current contract for 'next_transition' overrides on an
    area that has no materialized schedule yet: with no transitions to expire
    at, the override stays active indefinitely (until a schedule is
    materialized and a transition passes, or the override is cleared)."""

    def test_next_transition_override_never_expires_without_schedule(self, engine, global_config):
        area = make_area()  # materialized_schedule is None
        area.override = Override(
            temp=23.0,
            until="next_transition",
            created_at="2026-03-09T10:00:00+00:00",
        )
        much_later = datetime(2026, 3, 20, 10, 0, tzinfo=timezone.utc)
        assert engine.is_override_expired(area, much_later) is False
        assert _target_temp(engine, area, global_config, much_later) == 23.0


class TestDstCrossing:
    """Materialize/evaluate cycles across the EU DST boundaries with a real
    IANA timezone, matching production (the coordinator always passes
    dt_util.now(), which is HA-local and DST-observing).

    Entries at the ambiguous/skipped wall-clock hours themselves are out of
    scope: the engine orders entries by ISO-string comparison, which does not
    totally order mixed UTC offsets within the repeated fall-back hour.
    Schedule transitions at such times (02:00-03:00 on a switch night) are
    not supported.
    """

    def test_spring_forward_carry_over_and_evaluation(self, engine, global_config):
        cph = ZoneInfo("Europe/Copenhagen")
        # Sunday 2026-03-29: clocks jump 02:00 CET -> 03:00 CEST
        now = datetime(2026, 3, 29, 8, 0, tzinfo=cph)  # 08:00 CEST
        area = _area_at(engine, now)
        # Before Sunday's 09:00 home entry: Saturday's 23:00 away carries
        # over across the DST jump
        assert _target_temp(engine, area, global_config, now) == 17.0
        # After 09:00: home
        noon = datetime(2026, 3, 29, 12, 0, tzinfo=cph)
        assert _target_temp(engine, area, global_config, noon) == 21.0

    def test_spring_forward_next_transition_offset_changes(self, engine):
        cph = ZoneInfo("Europe/Copenhagen")
        # Saturday 23:30 CET (+01:00), before the switch
        now = datetime(2026, 3, 28, 23, 30, tzinfo=cph)
        materialized = engine.materialize_schedule(WEEKDAY_SCHEDULE, "test_schedule", now)
        result = engine.get_next_transition(materialized, now)
        assert result is not None
        dt, state = result
        # Next transition is Sunday 09:00 local, now in CEST (+02:00)
        assert (dt.year, dt.month, dt.day, dt.hour, dt.minute) == (2026, 3, 29, 9, 0)
        assert state == STATE_HOME
        assert now.utcoffset() == timedelta(hours=1)
        assert dt.utcoffset() == timedelta(hours=2)

    def test_fall_back_evaluation(self, engine, global_config):
        cph = ZoneInfo("Europe/Copenhagen")
        # Sunday 2026-10-25: clocks fall back 03:00 CEST -> 02:00 CET
        morning = datetime(2026, 10, 25, 8, 0, tzinfo=cph)  # 08:00 CET
        area = _area_at(engine, morning)
        # Saturday's 23:00 away still carries over past the repeated hour
        assert _target_temp(engine, area, global_config, morning) == 17.0
        evening = datetime(2026, 10, 25, 23, 0, tzinfo=cph)
        # Sunday 22:00 away entry is active
        assert _target_temp(engine, area, global_config, evening) == 17.0
        midday = datetime(2026, 10, 25, 12, 0, tzinfo=cph)
        assert _target_temp(engine, area, global_config, midday) == 21.0


class TestGapDay:
    """A weekly template with a day that has no entries at all: the previous
    day's last entry must carry across the whole gap day."""

    GAPPY_SCHEDULE = make_schedule(
        monday=WEEKDAY_ENTRIES,
        wednesday=WEEKDAY_ENTRIES,
        # tuesday intentionally absent
    )

    def test_gap_day_carries_previous_days_last_entry(self, engine, global_config):
        now = datetime(2026, 3, 10, 12, 0, tzinfo=timezone.utc)  # Tuesday
        area = _area_at(engine, now, schedule=self.GAPPY_SCHEDULE)
        # Monday's last entry (22:30 away) holds all of Tuesday
        assert _target_temp(engine, area, global_config, now) == 17.0

    def test_gap_day_next_transition_is_next_scheduled_day(self, engine):
        now = datetime(2026, 3, 10, 12, 0, tzinfo=timezone.utc)  # Tuesday
        materialized = engine.materialize_schedule(self.GAPPY_SCHEDULE, "test_schedule", now)
        result = engine.get_next_transition(materialized, now)
        assert result is not None
        dt, state = result
        assert (dt.day, dt.hour, dt.minute) == (11, 6, 30)  # Wednesday 06:30
        assert state == STATE_HOME

    def test_gap_day_today_entries_is_only_the_carry_over(self, engine):
        now = datetime(2026, 3, 10, 12, 0, tzinfo=timezone.utc)  # Tuesday
        materialized = engine.materialize_schedule(self.GAPPY_SCHEDULE, "test_schedule", now)
        entries = engine.get_today_entries(materialized, now)
        assert len(entries) == 1
        assert entries[0]["state"] == STATE_AWAY
        assert entries[0]["time"].startswith("2026-03-10T00:00:00")


class TestScheduleEntryNormalization:
    """Legacy stored schedules could carry numeric temps; loading normalizes
    them to the current "home"/"away" contract with unchanged semantics
    (anything but "home" was always materialized as away)."""

    def test_legacy_numeric_temp_normalizes_to_away(self):
        from custom_components.hearth.models import ScheduleEntry

        entry = ScheduleEntry.from_dict({"time": "06:30", "temp": 19.5})
        assert entry.temp == "away"

    def test_home_and_away_pass_through(self):
        from custom_components.hearth.models import ScheduleEntry

        assert ScheduleEntry.from_dict({"time": "06:30", "temp": "home"}).temp == "home"
        assert ScheduleEntry.from_dict({"time": "06:30", "temp": "away"}).temp == "away"


class TestNeedsRematerialization:
    def test_none_needs_rematerialization(self, engine):
        assert engine.needs_rematerialization(None, datetime(2026, 3, 9, tzinfo=timezone.utc)) is True

    def test_fresh_materialization_does_not_need_rematerialization(self, engine):
        now = datetime(2026, 3, 9, 10, 0, tzinfo=timezone.utc)
        materialized = engine.materialize_schedule(WEEKDAY_SCHEDULE, "test_schedule", now)
        # Still Monday -> the materialized window already covers through Wednesday
        assert engine.needs_rematerialization(materialized, now) is False

    def test_stale_materialization_needs_rematerialization(self, engine):
        now = datetime(2026, 3, 9, 10, 0, tzinfo=timezone.utc)
        materialized = engine.materialize_schedule(WEEKDAY_SCHEDULE, "test_schedule", now)
        # Three days later, the window no longer reaches tomorrow
        later = datetime(2026, 3, 12, 23, 0, tzinfo=timezone.utc)
        assert engine.needs_rematerialization(materialized, later) is True


class TestTodayEntries:
    def test_includes_carry_over_and_todays_entries(self, engine):
        now = datetime(2026, 3, 9, 12, 0, tzinfo=timezone.utc)  # Monday
        materialized = engine.materialize_schedule(WEEKDAY_SCHEDULE, "test_schedule", now)
        entries = engine.get_today_entries(materialized, now)

        # First entry is the carry-over from Sunday, pinned to today's midnight
        assert entries[0]["state"] == STATE_AWAY
        assert entries[0]["time"].startswith("2026-03-09T00:00:00")

        # Followed by Monday's own transitions
        times = [e["time"][11:16] for e in entries[1:]]
        assert times == ["06:30", "08:00", "16:00", "22:30"]
