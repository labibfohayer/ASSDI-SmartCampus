from datetime import date

# Day of week mapping for ASSDI (Bangladesh academic week starts on Sunday)
SUNDAY = 0
MONDAY = 1
TUESDAY = 2
WEDNESDAY = 3
THURSDAY = 4
FRIDAY = 5
SATURDAY = 6

DAY_OF_WEEK_CHOICES = [
    (SUNDAY, "Sunday"),
    (MONDAY, "Monday"),
    (TUESDAY, "Tuesday"),
    (WEDNESDAY, "Wednesday"),
    (THURSDAY, "Thursday"),
    (FRIDAY, "Friday"),
    (SATURDAY, "Saturday"),
]

DAY_NAME_TO_INT = {
    "sunday": SUNDAY,
    "monday": MONDAY,
    "tuesday": TUESDAY,
    "wednesday": WEDNESDAY,
    "thursday": THURSDAY,
    "friday": FRIDAY,
    "saturday": SATURDAY,
}

INT_TO_DAY_NAME = {v: k for k, v in DAY_NAME_TO_INT.items()}


def date_to_day_of_week(d: date) -> int:
    """
    Converts standard Python date to ASSDI day_of_week integer.
    Python date.weekday(): Monday is 0, Sunday is 6.
    ASSDI convention: Sunday is 0, Monday is 1, ..., Saturday is 6.
    Formula: (d.weekday() + 1) % 7
    """
    return (d.weekday() + 1) % 7


def day_of_week_to_python_weekday(dow: int) -> int:
    """
    Converts ASSDI day_of_week integer to Python date.weekday() integer.
    Sunday (0) -> 6
    Monday (1) -> 0
    ...
    Saturday (6) -> 5
    """
    return (dow - 1) % 7
