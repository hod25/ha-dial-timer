"""Base entity for the Dial Timer integration."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import split_entity_id
from homeassistant.helpers.device import async_entity_id_to_device
from homeassistant.helpers.device_registry import DeviceInfo
from homeassistant.helpers.entity import Entity

from .const import CONF_DEVICE_NAME, DOMAIN
from .timer_logic import HourlyTimer


class HourlyTimerEntity(Entity):
    """Entity that mirrors the state of an HourlyTimer."""

    _attr_has_entity_name = True
    _attr_should_poll = False

    def __init__(self, entry: ConfigEntry[HourlyTimer], key: str) -> None:
        """Initialize the entity."""
        self.timer = entry.runtime_data
        self._attr_unique_id = f"{entry.entry_id}_{key}"
        self._attr_translation_key = key

        hass = self.timer.hass
        target = self.timer.target_entity_id

        # Show the timer on the controlled device's page when it has one.
        # Otherwise create a device named after the controlled entity, so the
        # entities get names like "Boiler Timer duration" either way.
        if (device := async_entity_id_to_device(hass, target)) is not None:
            self.device_entry = device
        else:
            state = hass.states.get(target)
            name = (
                state.name
                if state
                else entry.data.get(CONF_DEVICE_NAME) or split_entity_id(target)[1]
            )
            self._attr_device_info = DeviceInfo(
                identifiers={(DOMAIN, entry.entry_id)},
                name=name,
            )

    async def async_added_to_hass(self) -> None:
        """Update whenever the timer changes."""
        await super().async_added_to_hass()
        self.async_on_remove(self.timer.async_add_listener(self.async_write_ha_state))
