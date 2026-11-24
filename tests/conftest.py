"""Fixtures for Dial Timer tests."""

from __future__ import annotations

from unittest.mock import patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

from custom_components.hourly_timer.const import CONF_DEVICE_NAME, CONF_ENTITY_ID, DOMAIN

TARGET = "input_boolean.boiler"


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations):
    """Enable loading custom integrations in all tests."""
    return


@pytest.fixture(autouse=True)
def mock_frontend():
    """The frontend package is not installed in tests; skip loading it."""
    with (
        patch("homeassistant.components.frontend.async_setup", return_value=True),
        patch("custom_components.hourly_timer.add_extra_js_url") as add_js,
    ):
        yield add_js


@pytest.fixture
async def target(hass: HomeAssistant) -> str:
    """Create the entity the timer controls."""
    assert await async_setup_component(hass, "homeassistant", {})
    assert await async_setup_component(
        hass, "input_boolean", {"input_boolean": {"boiler": {"name": "Boiler"}}}
    )
    await hass.async_block_till_done()
    return TARGET


@pytest.fixture
def entry() -> MockConfigEntry:
    """Config entry for the boiler timer."""
    return MockConfigEntry(
        domain=DOMAIN,
        title="Boiler Timer",
        unique_id=TARGET,
        data={CONF_ENTITY_ID: TARGET, CONF_DEVICE_NAME: "boiler"},
    )


@pytest.fixture
async def loaded_entry(
    hass: HomeAssistant, target: str, entry: MockConfigEntry
) -> MockConfigEntry:
    """Set up the integration."""
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry
