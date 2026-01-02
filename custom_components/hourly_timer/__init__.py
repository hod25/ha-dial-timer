"""The Hourly Timer integration."""
from __future__ import annotations

import logging
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant

from .const import DOMAIN, CONF_ENTITY_ID, CONF_DEVICE_NAME
from .timer_logic import HourlyTimerLogic

_LOGGER = logging.getLogger(__name__)

PLATFORMS: list[Platform] = []


async def async_setup(hass: HomeAssistant, config: dict[str, Any]) -> bool:
    """Set up the Hourly Timer component."""
    hass.data.setdefault(DOMAIN, {})
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Hourly Timer from a config entry."""
    hass.data.setdefault(DOMAIN, {})
    
    entity_id = entry.data.get(CONF_ENTITY_ID)
    device_name = entry.data.get(CONF_DEVICE_NAME)
    
    _LOGGER.info(f"Setting up Hourly Timer for {entity_id}")
    
    # Create timer logic instance
    timer_logic = HourlyTimerLogic(hass, entity_id, device_name)
    
    # Register listener for input_number changes
    timer_logic.register_listener()
    
    # Store instance
    hass.data[DOMAIN][entry.entry_id] = {
        "data": entry.data,
        "timer_logic": timer_logic,
    }
    
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry."""
    # Stop timer if running
    if entry.entry_id in hass.data[DOMAIN]:
        timer_logic = hass.data[DOMAIN][entry.entry_id].get("timer_logic")
        if timer_logic:
            await timer_logic.async_stop_timer()
    
    hass.data[DOMAIN].pop(entry.entry_id)
    return True


async def async_remove_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle removal of an entry."""
    device_name = entry.data.get(CONF_DEVICE_NAME, "")
    input_number_entity = f"input_number.{device_name}_duration"
    
    _LOGGER.info(f"Removing Hourly Timer setup for {input_number_entity}")
