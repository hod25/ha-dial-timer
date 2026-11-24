"""Number entity used to start, schedule, change and cancel the timer."""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

import voluptuous as vol

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.const import UnitOfTime
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv, entity_platform
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.util import dt as dt_util

from . import HourlyTimerConfigEntry
from .const import (
    ATTR_DURATION,
    ATTR_ENDS_AT,
    ATTR_START_AT,
    ATTR_START_IN,
    ATTR_STARTS_AT,
    ATTR_TARGET_ENTITY,
    MAX_DURATION,
    MIN_DURATION,
    SERVICE_SCHEDULE,
    STEP,
)
from .entity import HourlyTimerEntity

SCHEDULE_SCHEMA = {
    vol.Required(ATTR_DURATION): vol.All(
        vol.Coerce(int), vol.Range(min=1, max=MAX_DURATION)
    ),
    vol.Exclusive(ATTR_START_IN, "start"): vol.All(
        vol.Coerce(int), vol.Range(min=0, max=MAX_DURATION)
    ),
    vol.Exclusive(ATTR_START_AT, "start"): cv.datetime,
}


async def async_setup_entry(
    hass: HomeAssistant,
    entry: HourlyTimerConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the duration number and the schedule action."""
    async_add_entities([HourlyTimerDurationNumber(entry)])

    platform = entity_platform.async_get_current_platform()
    platform.async_register_entity_service(
        SERVICE_SCHEDULE, SCHEDULE_SCHEMA, "async_schedule"
    )


class HourlyTimerDurationNumber(HourlyTimerEntity, NumberEntity):
    """Setting a value turns the target on for that many minutes; 0 turns it off."""

    _attr_icon = "mdi:timer-outline"
    _attr_mode = NumberMode.SLIDER
    _attr_native_min_value = MIN_DURATION
    _attr_native_max_value = MAX_DURATION
    _attr_native_step = STEP
    _attr_native_unit_of_measurement = UnitOfTime.MINUTES

    def __init__(self, entry: HourlyTimerConfigEntry) -> None:
        """Initialize the number."""
        super().__init__(entry, "duration")

    @property
    def native_value(self) -> float:
        """Return the duration of the running or scheduled timer (0 when idle)."""
        return self.timer.duration

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Expose start and end times so cards can show a live countdown."""
        timer = self.timer
        return {
            ATTR_STARTS_AT: timer.starts_at.isoformat() if timer.starts_at else None,
            ATTR_ENDS_AT: timer.ends_at.isoformat() if timer.ends_at else None,
            ATTR_TARGET_ENTITY: timer.target_entity_id,
        }

    async def async_set_native_value(self, value: float) -> None:
        """Start, restart or cancel the timer."""
        await self.timer.async_start(round(value))

    async def async_schedule(
        self,
        duration: int,
        start_in: int | None = None,
        start_at: datetime | None = None,
    ) -> None:
        """Turn the target on later (or now) for `duration` minutes."""
        if start_at is not None:
            if start_at.tzinfo is None:
                start_at = start_at.replace(tzinfo=dt_util.get_default_time_zone())
            start = start_at
        else:
            start = dt_util.utcnow() + timedelta(minutes=start_in or 0)
        await self.timer.async_schedule(start, duration)
