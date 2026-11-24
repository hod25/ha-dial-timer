"""Config flow tests."""

from __future__ import annotations

from homeassistant.config_entries import SOURCE_USER
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from custom_components.hourly_timer.const import CONF_ENTITY_ID, DOMAIN

from .conftest import TARGET


async def test_user_flow_creates_entry(hass: HomeAssistant, target: str) -> None:
    """Picking an entity creates an entry named after it."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_ENTITY_ID: TARGET}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Boiler Timer"
    assert result["data"][CONF_ENTITY_ID] == TARGET
    assert result["result"].unique_id == TARGET


async def test_duplicate_entity_aborts(
    hass: HomeAssistant, target: str, loaded_entry
) -> None:
    """The same entity can only have one timer."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_ENTITY_ID: TARGET}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"
