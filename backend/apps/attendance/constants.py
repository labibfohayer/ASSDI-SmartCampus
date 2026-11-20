from typing import Optional
from django.conf import settings

# Default threshold constants
DEFAULT_QR_TOKEN_VALIDITY_SECONDS = 45
DEFAULT_QR_WINDOW_MINUTES = 15
DEFAULT_LATE_THRESHOLD_MINUTES = 10
DEFAULT_ATTENDANCE_CORRECTION_WINDOW_HOURS = 48
DEFAULT_REPEATED_ABSENCE_CONSECUTIVE = 3
DEFAULT_REPEATED_ABSENCE_TOTAL = 5


def get_qr_token_validity_seconds() -> int:
    """Returns dynamic QR token validity duration in seconds (supports @override_settings)."""
    return getattr(settings, "QR_TOKEN_VALIDITY_SECONDS", DEFAULT_QR_TOKEN_VALIDITY_SECONDS)


def get_qr_window_minutes() -> int:
    """Returns dynamic QR session window duration in minutes (supports @override_settings)."""
    return getattr(settings, "QR_WINDOW_MINUTES", DEFAULT_QR_WINDOW_MINUTES)


def get_late_threshold_minutes() -> int:
    """Returns dynamic late scan threshold duration in minutes (supports @override_settings)."""
    return getattr(settings, "LATE_THRESHOLD_MINUTES", DEFAULT_LATE_THRESHOLD_MINUTES)


def get_attendance_correction_window_hours() -> int:
    """Returns dynamic teacher attendance correction window in hours (supports @override_settings)."""
    return getattr(settings, "ATTENDANCE_CORRECTION_WINDOW_HOURS", DEFAULT_ATTENDANCE_CORRECTION_WINDOW_HOURS)


def get_repeated_absence_consecutive() -> int:
    """Returns consecutive absences threshold for flagging (supports @override_settings)."""
    return getattr(settings, "REPEATED_ABSENCE_CONSECUTIVE", DEFAULT_REPEATED_ABSENCE_CONSECUTIVE)


def get_repeated_absence_total() -> int:
    """Returns total absences threshold for flagging (supports @override_settings)."""
    return getattr(settings, "REPEATED_ABSENCE_TOTAL", DEFAULT_REPEATED_ABSENCE_TOTAL)


def calculate_attendance_percentage(
    present_count: int,
    late_count: int,
    total_count: int,
    approved_leave_count: int,
) -> Optional[float]:
    """
    Computes attendance percentage according to ASSDI policy:
    Formula: (Present + Late) / (Total - Approved Leave) * 100
    Returns None if denominator is zero (e.g. total=0 or all records are approved leave).
    Never divides by zero.
    """
    effective_total = total_count - approved_leave_count
    if effective_total <= 0:
        return None
    pct = ((present_count + late_count) / effective_total) * 100.0
    return round(pct, 2)
