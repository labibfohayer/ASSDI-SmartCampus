from typing import Optional

# Rating to Percentage Mapping (1=20, 2=40, 3=60, 4=80, 5=100)
RATING_PERCENTAGE_MAP = {
    1: 20,
    2: 40,
    3: 60,
    4: 80,
    5: 100,
}

BAND_0_20 = "band_0_20"
BAND_21_40 = "band_21_40"
BAND_41_60 = "band_41_60"
BAND_61_80 = "band_61_80"
BAND_81_100 = "band_81_100"

ALL_BANDS = [
    BAND_0_20,
    BAND_21_40,
    BAND_41_60,
    BAND_61_80,
    BAND_81_100,
]

RATING_TO_BAND = {
    1: BAND_0_20,
    2: BAND_21_40,
    3: BAND_41_60,
    4: BAND_61_80,
    5: BAND_81_100,
}


def rating_to_percentage(rating: Optional[int]) -> Optional[int]:
    """Maps rating 1-5 to percentage 20/40/60/80/100."""
    if rating is None:
        return None
    return RATING_PERCENTAGE_MAP.get(int(rating))


def get_understanding_band(rating: int) -> str:
    """Returns band string identifier for a rating."""
    return RATING_TO_BAND.get(int(rating), BAND_0_20)
