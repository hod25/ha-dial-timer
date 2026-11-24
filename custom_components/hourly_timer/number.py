"""Number entity used to start, change and cancel the timer."""

from __future__ import annotations

from typing import Any

from homeassistant.components.number import NumberEntity, NumberMode
from homeassistant.const import UnitOfTime
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import HourlyTimerConfigEntry
from .const import ATTR_ENDS_AT, ATTR_TARGET_ENTITY, MAX_DURATION, MIN_DURATION, STEP
from .entity import HourlyTimerEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: HourlyTimerConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the duration number."""
    async_add_entities([HourlyTimerDurationNumber(entry)])


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
        """Return the duration of the running timer (0 when idle)."""
        return self.timer.duration

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Expose the end time so cards can show a live countdown."""
        return {
            ATTR_ENDS_AT: self.timer.ends_at.isoformat() if self.timer.ends_at else None,
            ATTR_TARGET_ENTITY: self.timer.target_entity_id,
        }

    async def async_set_native_value(self, value: float) -> None:
        """Start, restart or cancel the timer."""
        await self.timer.async_start(round(value))
