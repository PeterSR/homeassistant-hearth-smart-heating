"""Time synchronization for Danfoss Ally TRVs."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from homeassistant.util import dt as dt_util

from . import DanfossFeature
from ..danfoss_const import (
    ATTR_DST_END,
    ATTR_DST_SHIFT,
    ATTR_DST_START,
    ATTR_TIME,
    ATTR_TIME_STATUS,
    ATTR_TIME_ZONE,
    CLUSTER_TIME,
    TIME_STATUS_SYNCHRONIZED,
)

_LOGGER = logging.getLogger(__name__)

ZIGBEE_EPOCH = datetime(2000, 1, 1, tzinfo=timezone.utc)

# Daily re-sync fires on the first tick at/after this local wall-clock time.
# Deliberately far from any schedule transition (default schedule's earliest
# is 06:00), since a clock step landing adjacent to a transition can trigger
# it early (observed: a sync at 21:36 stepped a lagging clock across a
# missed 22:00 setback, firing it about 55s later).
SYNC_HOUR_LOCAL = 3
SYNC_MINUTE_LOCAL = 30


class TimeSyncFeature(DanfossFeature):
    """Synchronize time on Danfoss Ally TRVs."""

    def __init__(self, *args, **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._initial_sync_done = False
        self._last_sync_date = None
        # Entities skipped because they were unavailable - retried every tick
        # (cheap: gated on a state lookup) until they come back and sync.
        self._pending: set[str] = set()

    async def async_tick(self, now: datetime, tick_count: int) -> None:
        if not self._initial_sync_done:
            self._initial_sync_done = True
            self._last_sync_date = now.date()
            await self._sync_all(now)
            return

        if self._pending:
            await self._retry_pending()

        if (
            now.date() != self._last_sync_date
            and now.hour == SYNC_HOUR_LOCAL
            and now.minute >= SYNC_MINUTE_LOCAL
        ):
            self._last_sync_date = now.date()
            await self._sync_all(now)

    async def async_sync_device(self, entity_id: str) -> None:
        """Sync time to a specific device (on rejoin / E10 error)."""
        await self._sync_one(entity_id, datetime.now(timezone.utc))

    async def _sync_all(self, now: datetime) -> None:
        for area in self.store.areas.values():
            for entity_id in self._get_danfoss_entities(area):
                try:
                    await self._sync_one(entity_id, now)
                except Exception as exc:
                    self._log_command(entity_id, "time_sync", False, str(exc))
                    _LOGGER.exception("Failed to sync time to %s", entity_id)

    async def _retry_pending(self) -> None:
        now = datetime.now(timezone.utc)
        for entity_id in list(self._pending):
            try:
                await self._sync_one(entity_id, now)
            except Exception as exc:
                self._log_command(entity_id, "time_sync", False, str(exc))
                _LOGGER.exception("Failed to sync time to %s", entity_id)

    async def _sync_one(self, entity_id: str, now: datetime) -> None:
        """Write all 6 time attributes to a single device."""
        backend = self._get_backend(entity_id)
        if backend is None:
            return
        if not self._is_entity_available(entity_id):
            self._pending.add(entity_id)
            return
        self._pending.discard(entity_id)

        now_utc = now.astimezone(timezone.utc)

        # Zigbee time: seconds since 2000-01-01 UTC
        time_val = int((now_utc - ZIGBEE_EPOCH).total_seconds())

        # ZCL Time cluster: TimeZone must be the STANDARD (non-DST) offset:
        # the device adds DstShift itself while within [DstStart, DstEnd].
        # Sending the DST-inclusive utcoffset() here double-applies the shift
        # and runs device clocks (and therefore on-device schedules) 1h fast
        # for the whole DST period.
        local_tz = self._get_local_tz()
        utc_offset = local_tz.utcoffset(now_utc) or timedelta(0)
        dst_offset = local_tz.dst(now_utc) or timedelta(0)
        std_offset = utc_offset - dst_offset
        tz_offset = int(std_offset.total_seconds())

        # DST boundaries
        dst_start, dst_end, dst_shift = self._calculate_dst(now_utc.year, local_tz)

        attrs = [
            (ATTR_TIME, time_val),
            (ATTR_TIME_STATUS, TIME_STATUS_SYNCHRONIZED),
            (ATTR_TIME_ZONE, tz_offset),
            (ATTR_DST_START, dst_start),
            (ATTR_DST_END, dst_end),
            (ATTR_DST_SHIFT, dst_shift),
        ]

        for attr_id, value in attrs:
            await backend.async_write_attribute(
                entity_id, CLUSTER_TIME, attr_id, value
            )

        self._log_command(
            entity_id, "time_sync", True,
            f"time={time_val}, std_tz={tz_offset}, dst_shift={dst_shift}",
        )
        _LOGGER.info(
            "Time synced to %s (time=%d, std_tz=%d, dst_shift=%d)",
            entity_id, time_val, tz_offset, dst_shift,
        )

    def _get_local_tz(self) -> ZoneInfo:
        """Get the HA configured timezone."""
        tz = dt_util.get_default_time_zone()
        if isinstance(tz, ZoneInfo):
            return tz
        return ZoneInfo(self.hass.config.time_zone)

    def _calculate_dst(
        self, year: int, tz: ZoneInfo
    ) -> tuple[int, int, int]:
        """Calculate DST start/end/shift for a given year.

        Returns (dst_start, dst_end, dst_shift) as Zigbee time values
        (seconds since 2000-01-01 UTC). dst_shift in seconds (typically 3600).
        """
        dst_start = 0
        dst_end = 0
        dst_shift = 0

        dt = datetime(year, 1, 1, tzinfo=timezone.utc)
        prev_dst = tz.dst(dt) or timedelta(0)

        for day in range(1, 366):
            dt = datetime(year, 1, 1, tzinfo=timezone.utc) + timedelta(days=day)
            try:
                current_dst = tz.dst(dt) or timedelta(0)
            except Exception:
                continue

            if current_dst != prev_dst:
                zigbee_time = int((dt - ZIGBEE_EPOCH).total_seconds())
                if current_dst > prev_dst:
                    dst_start = zigbee_time
                    dst_shift = int(current_dst.total_seconds())
                else:
                    dst_end = zigbee_time

            prev_dst = current_dst

        return (dst_start, dst_end, dst_shift)
