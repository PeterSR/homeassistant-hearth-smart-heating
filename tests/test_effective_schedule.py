"""Tests for the coordinator's effective-schedule indirection.

Vacation mode is implemented entirely as schedule indirection in the
coordinator (vacation > group > area), not in the schedule engine. These
tests exercise that precedence chain directly. The coordinator methods only
touch `self.store`, so a duck-typed stand-in store is enough: no Home
Assistant harness needed.
"""

from __future__ import annotations

from types import SimpleNamespace

from custom_components.hearth.coordinator import HearthCoordinator
from custom_components.hearth.models import (
    AreaGroup,
    GlobalConfig,
    Schedule,
    WeeklySchedule,
)

from .conftest import make_area


def _coordinator_with(
    *,
    vacation_mode: bool = False,
    vacation_schedule_id: str | None = None,
    group: AreaGroup | None = None,
    schedule_ids: tuple[str, ...] = (),
) -> HearthCoordinator:
    """Build a bare coordinator around a duck-typed store."""
    store = SimpleNamespace(
        global_config=GlobalConfig(
            vacation_mode=vacation_mode,
            vacation_schedule_id=vacation_schedule_id,
        ),
        get_group_for_area=lambda area_id: group,
        schedules={
            sid: Schedule(schedule_id=sid, name=sid, schedule=WeeklySchedule())
            for sid in schedule_ids
        },
    )
    coordinator = object.__new__(HearthCoordinator)
    coordinator.store = store
    return coordinator


class TestEffectiveScheduleId:
    def test_area_schedule_when_no_group_and_no_vacation(self):
        coordinator = _coordinator_with()
        area = make_area(schedule_id="area_sched")
        assert coordinator._get_effective_schedule_id(area) == "area_sched"

    def test_group_schedule_beats_area_schedule(self):
        group = AreaGroup(
            group_id="g1", name="Upstairs",
            area_ids=["test_area"], schedule_id="group_sched",
        )
        coordinator = _coordinator_with(group=group)
        area = make_area(schedule_id="area_sched")
        assert coordinator._get_effective_schedule_id(area) == "group_sched"

    def test_group_without_schedule_falls_back_to_area(self):
        group = AreaGroup(
            group_id="g1", name="Upstairs",
            area_ids=["test_area"], schedule_id=None,
        )
        coordinator = _coordinator_with(group=group)
        area = make_area(schedule_id="area_sched")
        assert coordinator._get_effective_schedule_id(area) == "area_sched"

    def test_vacation_beats_group_and_area(self):
        group = AreaGroup(
            group_id="g1", name="Upstairs",
            area_ids=["test_area"], schedule_id="group_sched",
        )
        coordinator = _coordinator_with(
            vacation_mode=True,
            vacation_schedule_id="vacation_sched",
            group=group,
        )
        area = make_area(schedule_id="area_sched")
        assert coordinator._get_effective_schedule_id(area) == "vacation_sched"

    def test_vacation_mode_without_schedule_id_falls_through(self):
        coordinator = _coordinator_with(vacation_mode=True, vacation_schedule_id=None)
        area = make_area(schedule_id="area_sched")
        assert coordinator._get_effective_schedule_id(area) == "area_sched"

    def test_vacation_schedule_id_alone_is_not_enough(self):
        # vacation_schedule_id set but vacation_mode off: normal precedence
        coordinator = _coordinator_with(
            vacation_mode=False, vacation_schedule_id="vacation_sched"
        )
        area = make_area(schedule_id="area_sched")
        assert coordinator._get_effective_schedule_id(area) == "area_sched"


class TestEffectiveSchedule:
    def test_returns_template_for_winning_id(self):
        coordinator = _coordinator_with(
            vacation_mode=True,
            vacation_schedule_id="vacation_sched",
            schedule_ids=("vacation_sched", "area_sched"),
        )
        area = make_area(schedule_id="area_sched")
        template = coordinator._get_effective_schedule(area)
        assert template is coordinator.store.schedules["vacation_sched"].schedule

    def test_unknown_schedule_id_returns_none(self):
        coordinator = _coordinator_with(schedule_ids=())
        area = make_area(schedule_id="ghost_sched")
        assert coordinator._get_effective_schedule(area) is None

    def test_no_schedule_anywhere_returns_none(self):
        coordinator = _coordinator_with(schedule_ids=("some_sched",))
        area = make_area(schedule_id=None)
        assert coordinator._get_effective_schedule(area) is None
