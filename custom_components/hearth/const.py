"""Constants for Hearth integration."""

DOMAIN = "hearth"
STORAGE_KEY = "hearth"
STORAGE_VERSION = 1

DEFAULT_HOME_TEMP = 21.0
DEFAULT_AWAY_TEMP = 17.0
DEFAULT_MIN_TEMP = 5.0
DEFAULT_MAX_TEMP = 28.0
DEFAULT_AUTO_AWAY_DELAY = 30

# Absolute temperature limits (hardware)
TEMP_ABS_MIN = 4.0
TEMP_ABS_MAX = 35.0

# Effective states - the only states the UI ever sees
STATE_HOME = "home"
STATE_AWAY = "away"
STATE_OFF = "off"
# Materialized entry sources
SOURCE_SCHEDULE = "schedule"
SOURCE_USER = "user"

DAYS_OF_WEEK = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
]
