"""Timer logic for the Hourly Timer integration."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta
import logging
from typing import Any

from homeassistant.const import (
    ATTR_ENTITY_ID,
    SERVICE_TURN_OFF,
    SERVICE_TURN_ON,
    STATE_OFF,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
)
from homeassistant.core import (
    CALLBACK_TYPE,
    Event,
    EventStateChangedData,
    HomeAssistant,
    callback,
    split_entity_id,
)
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers.event import (
    async_call_later,
    async_track_point_in_utc_time,
    async_track_state_change_event,
)
from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN, MAX_DURATION, STORAGE_VERSION

_LOGGER = logging.getLogger(__name__)

# Seconds between attempts to turn off a target whose "off" didn't go through.
RETRY_OFF_DELAY = 30


class HourlyTimer:
    """Turns a target entity on for a number of minutes, then off again.

    The end time is persisted, so a running timer survives a Home Assistant
    restart. When the timer ends but the target can't be turned off (it isn't
    loaded yet after a restart, or it is unavailable), a pending "off" is
    persisted and retried as soon as the target reports a state again.
    """

    def __init__(self, hass: HomeAssistant, entry_id: str, target_entity_id: str) -> None:
        """Initialize the timer."""
        self.hass = hass
        self.target_entity_id = target_entity_id
        self.duration: int = 0
        self.ends_at: datetime | None = None
        self._pending_off = False

        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}.{entry_id}"
        )
        self._unsub_expire: CALLBACK_TYPE | None = None
        self._unsub_target: CALLBACK_TYPE | None = None
        self._unsub_retry: CALLBACK_TYPE | None = None
        self._listeners: list[Callable[[], None]] = []

    @property
    def is_running(self) -> bool:
        """Return True while a timer is counting down."""
        return self.ends_at is not None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    async def async_setup(self) -> None:
        """Restore a persisted timer and start watching the target entity."""
        self._unsub_target = async_track_state_change_event(
            self.hass, self.target_entity_id, self._async_target_changed
        )

        data = await self._store.async_load() or {}
        self._pending_off = bool(data.get("pending_off", False))
        ends_at = dt_util.parse_datetime(data["ends_at"]) if data.get("ends_at") else None

        if ends_at is not None and ends_at > dt_util.utcnow():
            self.duration = int(data.get("duration", 0))
            self.ends_at = ends_at
            self._schedule_expiry()
            _LOGGER.debug(
                "Restored timer for %s, ends at %s", self.target_entity_id, ends_at
            )
        elif ends_at is not None:
            _LOGGER.info(
                "Timer for %s ended while Home Assistant was stopped, turning it off",
                self.target_entity_id,
            )
            await self._async_reset()
            await self._async_request_off()
        elif self._pending_off:
            await self._async_try_off()

    @callback
    def async_shutdown(self) -> None:
        """Stop all listeners. The persisted timer is kept for the next start."""
        self._cancel_expiry()
        self._cancel_retry()
        if self._unsub_target:
            self._unsub_target()
            self._unsub_target = None
        self._listeners.clear()

    async def async_remove(self) -> None:
        """Delete persisted data (the config entry is being removed)."""
        await self._store.async_remove()

    @callback
    def async_add_listener(self, update_callback: Callable[[], None]) -> CALLBACK_TYPE:
        """Register a callback that runs whenever the timer changes."""
        self._listeners.append(update_callback)

        @callback
        def remove_listener() -> None:
            if update_callback in self._listeners:
                self._listeners.remove(update_callback)

        return remove_listener

    # ------------------------------------------------------------------
    # Public actions
    # ------------------------------------------------------------------

    async def async_start(self, duration: int) -> None:
        """Turn the target on and turn it off again after `duration` minutes.

        A duration of 0 cancels the timer and turns the target off.
        Starting while a timer is running restarts it with the new duration.
        """
        duration = int(duration)
        if duration <= 0:
            await self.async_cancel(turn_off=True)
            return
        duration = min(duration, MAX_DURATION)

        previous = (self.duration, self.ends_at)
        self._cancel_expiry()
        self.duration = duration
        self.ends_at = dt_util.utcnow() + timedelta(minutes=duration)

        try:
            await self._async_call(SERVICE_TURN_ON)
        except HomeAssistantError:
            # Leave everything as it was before the failed attempt.
            self.duration, self.ends_at = previous
            if self.ends_at is not None:
                self._schedule_expiry()
            self._notify()
            raise

        self._pending_off = False
        self._cancel_retry()
        self._schedule_expiry()
        await self._async_save()
        self._notify()
        _LOGGER.debug(
            "%s turned on for %s minutes (until %s)",
            self.target_entity_id,
            duration,
            self.ends_at,
        )

    async def async_cancel(self, turn_off: bool) -> None:
        """Cancel the timer, optionally turning the target off."""
        await self._async_reset()
        if turn_off:
            await self._async_call(SERVICE_TURN_OFF)

    # ------------------------------------------------------------------
    # Internals
    # ------------------------------------------------------------------

    def _schedule_expiry(self) -> None:
        assert self.ends_at is not None
        self._cancel_expiry()
        self._unsub_expire = async_track_point_in_utc_time(
            self.hass, self._async_expired, self.ends_at
        )

    def _cancel_expiry(self) -> None:
        if self._unsub_expire:
            self._unsub_expire()
            self._unsub_expire = None

    async def _async_expired(self, _now: datetime) -> None:
        """Handle the end of the countdown."""
        self._unsub_expire = None
        _LOGGER.debug("Timer for %s finished", self.target_entity_id)
        await self._async_reset()
        await self._async_request_off()

    async def _async_reset(self) -> None:
        """Clear the running timer and persist that."""
        self._cancel_expiry()
        changed = self.is_running or self.duration != 0
        self.duration = 0
        self.ends_at = None
        if changed:
            await self._async_save()
            self._notify()

    async def _async_request_off(self) -> None:
        """Remember that the target must be turned off, then try to do it."""
        self._pending_off = True
        await self._async_save()
        await self._async_try_off()

    async def _async_try_off(self) -> None:
        """Turn the target off if it is reachable; clear the pending flag once off."""
        state = self.hass.states.get(self.target_entity_id)
        if state is None or state.state == STATE_UNAVAILABLE:
            _LOGGER.debug(
                "%s is not available, will turn it off when it comes back",
                self.target_entity_id,
            )
            return
        if state.state != STATE_OFF:
            try:
                await self._async_call(SERVICE_TURN_OFF)
            except HomeAssistantError as err:
                _LOGGER.warning(
                    "Could not turn off %s, will retry in %s seconds: %s",
                    self.target_entity_id,
                    RETRY_OFF_DELAY,
                    err,
                )
                self._schedule_retry()
                return
            state = self.hass.states.get(self.target_entity_id)
        if state is not None and state.state == STATE_OFF:
            await self._async_clear_pending_off()

    def _schedule_retry(self) -> None:
        if self._unsub_retry is None:
            self._unsub_retry = async_call_later(
                self.hass, RETRY_OFF_DELAY, self._async_retry_off
            )

    def _cancel_retry(self) -> None:
        if self._unsub_retry:
            self._unsub_retry()
            self._unsub_retry = None

    async def _async_retry_off(self, _now: datetime) -> None:
        self._unsub_retry = None
        if self._pending_off:
            await self._async_try_off()

    async def _async_clear_pending_off(self) -> None:
        self._cancel_retry()
        if self._pending_off:
            self._pending_off = False
            await self._async_save()

    async def _async_call(self, service: str) -> None:
        # Call the entity's own domain (e.g. switch.turn_off) rather than
        # homeassistant.turn_off: the latter only logs a warning when the
        # domain isn't loaded yet, while this raises so we can retry.
        await self.hass.services.async_call(
            split_entity_id(self.target_entity_id)[0],
            service,
            {ATTR_ENTITY_ID: self.target_entity_id},
            blocking=True,
        )

    async def _async_save(self) -> None:
        await self._store.async_save(
            {
                "duration": self.duration,
                "ends_at": self.ends_at.isoformat() if self.ends_at else None,
                "pending_off": self._pending_off,
            }
        )

    @callback
    def _notify(self) -> None:
        for update_callback in list(self._listeners):
            update_callback()

    async def _async_target_changed(self, event: Event[EventStateChangedData]) -> None:
        """React to the target's state changes."""
        new_state = event.data["new_state"]
        if new_state is None:
            return

        if self._pending_off:
            # A previous "off" didn't go through. Finish it now that the
            # target is back (or confirm it is off).
            if new_state.state == STATE_OFF:
                await self._async_clear_pending_off()
            elif new_state.state != STATE_UNAVAILABLE:
                await self._async_try_off()
            return

        # Cancel a running timer if the target is turned off by something else.
        if not self.is_running or new_state.state != STATE_OFF:
            return
        old_state = event.data["old_state"]
        if old_state is not None and old_state.state in (
            STATE_OFF,
            STATE_UNAVAILABLE,
            STATE_UNKNOWN,
        ):
            # Not a real on -> off transition (e.g. coming back from unavailable).
            return
        _LOGGER.debug(
            "%s was turned off externally, cancelling its timer", self.target_entity_id
        )
        await self._async_reset()
