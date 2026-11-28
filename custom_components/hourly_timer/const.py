"""Constants for the Dial Timer integration."""

from __future__ import annotations

from typing import Final

from homeassistant.const import Platform

DOMAIN: Final = "hourly_timer"

CONF_ENTITY_ID: Final = "entity_id"
CONF_DEVICE_NAME: Final = "device_name"

PLATFORMS: Final = [Platform.NUMBER, Platform.SENSOR]

# Entity domains that can be controlled by the timer.
SUPPORTED_DOMAINS: Final = ["switch", "light", "fan", "climate", "input_boolean"]

# Duration limits, in minutes.
MIN_DURATION: Final = 0
MAX_DURATION: Final = 1440  # 24 hours
STEP: Final = 1

# Frontend card, served from inside the integration.
CARD_FILENAME: Final = "hourly-timer-card.js"
CARD_URL_BASE: Final = f"/{DOMAIN}"

# Persistent storage for running timers (survives restarts).
STORAGE_VERSION: Final = 1

ATTR_ENDS_AT: Final = "ends_at"
ATTR_STARTS_AT: Final = "starts_at"
ATTR_TARGET_ENTITY: Final = "target_entity"

SERVICE_SCHEDULE: Final = "schedule"
SERVICE_EXTEND: Final = "extend"
ATTR_MINUTES: Final = "minutes"
ATTR_DURATION: Final = "duration"
ATTR_START_IN: Final = "start_in"
ATTR_START_AT: Final = "start_at"
