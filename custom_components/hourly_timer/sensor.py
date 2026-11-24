"""Sensor showing when the running timer ends."""

from __future__ import annotations

from datetime import datetime

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import HourlyTimerConfigEntry
from .entity import HourlyTimerEntity


async def async_setup_entry(
    hass: HomeAssistant,
    entry: HourlyTimerConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up the end time sensor."""
    async_add_entities([HourlyTimerEndsAtSensor(entry)])


class HourlyTimerEndsAtSensor(HourlyTimerEntity, SensorEntity):
    """Timestamp of when the target will be turned off (unknown when idle)."""

    _attr_device_class = SensorDeviceClass.TIMESTAMP
    _attr_icon = "mdi:timer-sand"

    def __init__(self, entry: HourlyTimerConfigEntry) -> None:
        """Initialize the sensor."""
        super().__init__(entry, "ends_at")

    @property
    def native_value(self) -> datetime | None:
        """Return the end time of the running timer."""
        return self.timer.ends_at
