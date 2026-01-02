"""Constants for the Hourly Timer integration."""

DOMAIN = "hourly_timer"
CONF_ENTITY_ID = "entity_id"
CONF_DEVICE_NAME = "device_name"

# Supported domains
SUPPORTED_DOMAINS = ["switch", "light", "fan", "climate"]

# Default values
DEFAULT_DURATION = 0
MIN_DURATION = 0
MAX_DURATION = 1440  # 24 hours in minutes
STEP = 1
