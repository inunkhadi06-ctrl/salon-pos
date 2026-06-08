"""Date utilities for consistent timezone-aware filtering.

The salon operates in Asia/Jakarta (WIB, UTC+7). All transaction.created_at
is stored as UTC ISO strings (e.g., "2026-06-02T11:02:04.544677+00:00").

These helpers convert Jakarta calendar dates to UTC ISO ranges that align
with how data is stored, so dashboard/reports/commission queries always
use the same source of truth.
"""
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from typing import Tuple, Optional

JAKARTA_TZ = ZoneInfo("Asia/Jakarta")


def jakarta_now() -> datetime:
    """Current datetime in Jakarta timezone."""
    return datetime.now(JAKARTA_TZ)


def jakarta_today():
    """Today's date in Jakarta timezone."""
    return jakarta_now().date()


def day_range_utc_iso(date_obj) -> Tuple[str, str]:
    """Given a date in Jakarta TZ, return (start_utc_iso, end_utc_iso).

    The range covers the entire day in Jakarta (00:00:00.000000 to
    23:59:59.999999), converted to UTC ISO format that string-compares
    correctly against stored datetimes.
    """
    start_local = datetime.combine(date_obj, datetime.min.time(), tzinfo=JAKARTA_TZ)
    end_local = datetime.combine(date_obj, datetime.max.time(), tzinfo=JAKARTA_TZ)
    return (
        start_local.astimezone(timezone.utc).isoformat(),
        end_local.astimezone(timezone.utc).isoformat(),
    )


def today_range_utc_iso() -> Tuple[str, str]:
    """UTC ISO range covering today in Jakarta."""
    return day_range_utc_iso(jakarta_today())


def month_range_utc_iso() -> Tuple[str, str]:
    """UTC ISO range covering current month in Jakarta."""
    today = jakarta_today()
    first_day = today.replace(day=1)
    # Compute last day of month
    if today.month == 12:
        next_month = today.replace(year=today.year + 1, month=1, day=1)
    else:
        next_month = today.replace(month=today.month + 1, day=1)
    last_day = next_month - timedelta(days=1)
    start, _ = day_range_utc_iso(first_day)
    _, end = day_range_utc_iso(last_day)
    return start, end


def parse_date_range_utc_iso(
    start_date_str: Optional[str], end_date_str: Optional[str]
) -> Optional[Tuple[str, str]]:
    """Convert YYYY-MM-DD strings (Jakarta dates) to UTC ISO range.

    Returns None if either input is missing. Range is INCLUSIVE on both ends
    and covers the full day from 00:00:00 to 23:59:59.999999 Jakarta time.
    """
    if not start_date_str or not end_date_str:
        return None
    start_date = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    end_date = datetime.strptime(end_date_str, "%Y-%m-%d").date()
    start_utc, _ = day_range_utc_iso(start_date)
    _, end_utc = day_range_utc_iso(end_date)
    return start_utc, end_utc


def jakarta_today_iso() -> str:
    """Today's date as YYYY-MM-DD string in Jakarta."""
    return jakarta_today().isoformat()
