"""Config flow for Hourly Timer integration."""
from __future__ import annotations

import logging
from typing import Any

import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import selector
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import config_validation as cv

from .const import (
    DOMAIN,
    CONF_ENTITY_ID,
    CONF_DEVICE_NAME,
    SUPPORTED_DOMAINS,
    DEFAULT_DURATION,
    MIN_DURATION,
    MAX_DURATION,
    STEP,
)

_LOGGER = logging.getLogger(__name__)


class HourlyTimerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Hourly Timer."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.FlowResult:
        """Handle the initial step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            entity_id = user_input[CONF_ENTITY_ID]
            
            # Validate entity domain
            domain = entity_id.split(".")[0]
            if domain not in SUPPORTED_DOMAINS:
                errors["base"] = "invalid_entity"
            else:
                # Check if already configured
                await self.async_set_unique_id(entity_id)
                self._abort_if_unique_id_configured()
                
                # Extract device name from entity_id
                device_name = entity_id.split(".")[1] if "." in entity_id else "timer"
                
                # Create input_number only (logic handled by integration)
                await self._create_input_number(self.hass, device_name)
                
                return self.async_create_entry(
                    title=f"Timer - {device_name}",
                    data={
                        CONF_ENTITY_ID: entity_id,
                        CONF_DEVICE_NAME: device_name,
                    },
                )

        # Show form
        data_schema = vol.Schema(
            {
                vol.Required(CONF_ENTITY_ID): selector.EntitySelector(
                    selector.EntitySelectorConfig(
                        domain=SUPPORTED_DOMAINS,
                    )
                ),
            }
        )

        return self.async_show_form(
            step_id="user",
            data_schema=data_schema,
            errors=errors,
        )

    async def _create_input_number(self, hass: HomeAssistant, device_name: str) -> None:
        """Create an input_number entity for the timer duration."""
        input_number_id = f"{device_name}_duration"
        
        # Create input_number via service call
        try:
            await hass.services.async_call(
                "input_number",
                "create",
                {
                    "name": f"{device_name} Timer Duration",
                    "min": MIN_DURATION,
                    "max": MAX_DURATION,
                    "step": STEP,
                    "initial": DEFAULT_DURATION,
                    "unit_of_measurement": "minutes",
                    "mode": "slider",
                    "icon": "mdi:timer",
                },
                blocking=True,
            )
            _LOGGER.info(f"Created input_number.{input_number_id}")
        except Exception as err:
            _LOGGER.warning(f"Could not create input_number: {err}")
