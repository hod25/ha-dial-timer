"""Timer logic for Hourly Timer integration."""
from __future__ import annotations

import asyncio
import logging
from datetime import timedelta

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_state_change_event

_LOGGER = logging.getLogger(__name__)


class HourlyTimerLogic:
    """Class to handle timer logic."""

    def __init__(self, hass: HomeAssistant, entity_id: str, device_name: str) -> None:
        """Initialize the timer logic."""
        self.hass = hass
        self.entity_id = entity_id
        self.device_name = device_name
        self.input_number_entity = f"input_number.{device_name}_duration"
        self._cancel_timer = None
        self._cancel_listener = None
        self._timer_task = None

    async def async_start_timer(self, duration_minutes: int) -> None:
        """Start the timer."""
        if duration_minutes <= 0:
            _LOGGER.debug(f"Duration is {duration_minutes}, not starting timer")
            return

        _LOGGER.info(f"Starting timer for {self.entity_id} with duration {duration_minutes} minutes")

        # Cancel existing timer if any
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()
            try:
                await self._timer_task
            except asyncio.CancelledError:
                pass

        # Create new timer task
        self._timer_task = self.hass.async_create_task(
            self._run_timer(duration_minutes)
        )

    async def _run_timer(self, duration_minutes: int) -> None:
        """Run the actual timer logic."""
        try:
            # Turn on the entity
            await self.hass.services.async_call(
                "homeassistant",
                "turn_on",
                {"entity_id": self.entity_id},
                blocking=True,
            )
            
            _LOGGER.info(f"{self.entity_id} turned ON for {duration_minutes} minutes")

            # Wait for the duration
            await asyncio.sleep(duration_minutes * 60)

            # Turn off the entity
            await self.hass.services.async_call(
                "homeassistant",
                "turn_off",
                {"entity_id": self.entity_id},
                blocking=True,
            )
            
            _LOGGER.info(f"{self.entity_id} turned OFF after timer completed")

            # Reset the input_number to 0
            await self.hass.services.async_call(
                "input_number",
                "set_value",
                {
                    "entity_id": self.input_number_entity,
                    "value": 0,
                },
                blocking=True,
            )
            
            _LOGGER.info(f"Timer completed for {self.entity_id}")
            
        except asyncio.CancelledError:
            _LOGGER.info(f"Timer cancelled for {self.entity_id}")
            raise
        except Exception as err:
            _LOGGER.error(f"Error in timer for {self.entity_id}: {err}")

    async def async_stop_timer(self) -> None:
        """Stop the timer."""
        if self._timer_task and not self._timer_task.done():
            self._timer_task.cancel()
            try:
                await self._timer_task
            except asyncio.CancelledError:
                pass
            _LOGGER.info(f"Timer stopped for {self.entity_id}")
        
        if self._cancel_listener:
            self._cancel_listener()
            self._cancel_listener = None

    @callback
    def register_listener(self) -> None:
        """Register a listener for the input_number changes."""
        @callback
        def state_changed_listener(event):
            """Handle state changes of the input_number."""
            new_state = event.data.get("new_state")
            old_state = event.data.get("old_state")
            
            if new_state is None:
                return
            
            # Avoid triggering on same value
            if old_state and new_state.state == old_state.state:
                return

            try:
                duration = int(float(new_state.state))
                if duration > 0:
                    # Schedule the timer start
                    self.hass.async_create_task(
                        self.async_start_timer(duration)
                    )
                else:
                    # Stop timer if duration is 0
                    self.hass.async_create_task(
                        self.async_stop_timer()
                    )
            except (ValueError, TypeError) as err:
                _LOGGER.error(f"Error parsing duration: {err}")

        self._cancel_listener = async_track_state_change_event(
            self.hass,
            self.input_number_entity,
            state_changed_listener,
        )
