"""Config flow for the Hourly Timer integration."""

from __future__ import annotations

from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.core import split_entity_id
from homeassistant.helpers import selector

from .const import CONF_DEVICE_NAME, CONF_ENTITY_ID, DOMAIN, SUPPORTED_DOMAINS

DATA_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_ENTITY_ID): selector.EntitySelector(
            selector.EntitySelectorConfig(domain=SUPPORTED_DOMAINS)
        ),
    }
)


class HourlyTimerConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a config flow for Hourly Timer."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Let the user pick the entity to control."""
        errors: dict[str, str] = {}

        if user_input is not None:
            entity_id: str = user_input[CONF_ENTITY_ID]
            domain, object_id = split_entity_id(entity_id)

            if domain not in SUPPORTED_DOMAINS:
                errors["base"] = "invalid_entity"
            else:
                await self.async_set_unique_id(entity_id)
                self._abort_if_unique_id_configured()

                state = self.hass.states.get(entity_id)
                name = state.name if state else object_id
                return self.async_create_entry(
                    title=f"{name} Timer",
                    data={CONF_ENTITY_ID: entity_id, CONF_DEVICE_NAME: object_id},
                )

        return self.async_show_form(
            step_id="user",
            data_schema=self.add_suggested_values_to_schema(DATA_SCHEMA, user_input),
            errors=errors,
        )
