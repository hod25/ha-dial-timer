"""The Dial Timer integration."""

from __future__ import annotations

from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from .const import CARD_FILENAME, CARD_URL_BASE, CONF_ENTITY_ID, DOMAIN, PLATFORMS
from .timer_logic import HourlyTimer

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)

type HourlyTimerConfigEntry = ConfigEntry[HourlyTimer]


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Serve the Lovelace card and load it on every dashboard."""
    integration = await async_get_integration(hass, DOMAIN)
    card_path = Path(__file__).parent / "frontend" / CARD_FILENAME
    url = f"{CARD_URL_BASE}/{CARD_FILENAME}"

    await hass.http.async_register_static_paths(
        [StaticPathConfig(url, str(card_path), cache_headers=False)]
    )
    # The version query string makes browsers fetch the new card after an update.
    add_extra_js_url(hass, f"{url}?v={integration.version}")
    return True


async def async_setup_entry(hass: HomeAssistant, entry: HourlyTimerConfigEntry) -> bool:
    """Set up a timer from a config entry."""
    timer = HourlyTimer(hass, entry.entry_id, entry.data[CONF_ENTITY_ID])
    await timer.async_setup()
    entry.async_on_unload(timer.async_shutdown)
    entry.runtime_data = timer

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: HourlyTimerConfigEntry) -> bool:
    """Unload a config entry. A running timer is kept and resumed on next load."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_entry(hass: HomeAssistant, entry: HourlyTimerConfigEntry) -> None:
    """Delete the persisted timer when the entry is deleted."""
    await HourlyTimer(hass, entry.entry_id, entry.data[CONF_ENTITY_ID]).async_remove()
