"""Tests for scheduling a later start."""

from __future__ import annotations

from datetime import timedelta

from freezegun.api import FrozenDateTimeFactory
import pytest
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from homeassistant.const import STATE_OFF, STATE_ON, STATE_UNKNOWN
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError
from homeassistant.util import dt as dt_util

from .conftest import TARGET

NUMBER = "number.boiler_timer_duration"
STARTS = "sensor.boiler_timer_starts"
ENDS = "sensor.boiler_timer_ends"


async def _schedule(hass: HomeAssistant, **data) -> None:
    await hass.services.async_call(
        "hourly_timer", "schedule", {"entity_id": NUMBER, **data}, blocking=True
    )
    await hass.async_block_till_done()


async def _set(hass: HomeAssistant, minutes: float) -> None:
    await hass.services.async_call(
        "number", "set_value", {"entity_id": NUMBER, "value": minutes}, blocking=True
    )
    await hass.async_block_till_done()


async def _advance(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, minutes: float
) -> None:
    freezer.tick(timedelta(minutes=minutes))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()


async def _boiler(hass: HomeAssistant, service: str) -> None:
    await hass.services.async_call(
        "input_boolean", service, {"entity_id": TARGET}, blocking=True
    )
    await hass.async_block_till_done()


async def test_schedule_start_in(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """The target turns on at the start time and off after the duration."""
    await _schedule(hass, duration=30, start_in=60)

    number = hass.states.get(NUMBER)
    assert hass.states.get(TARGET).state == STATE_OFF
    assert number.state == "30"
    assert number.attributes["starts_at"] is not None
    assert hass.states.get(STARTS).state != STATE_UNKNOWN
    assert hass.states.get(ENDS).state != STATE_UNKNOWN

    await _advance(hass, freezer, 59)
    assert hass.states.get(TARGET).state == STATE_OFF

    await _advance(hass, freezer, 1.1)
    assert hass.states.get(TARGET).state == STATE_ON
    assert hass.states.get(NUMBER).attributes["starts_at"] is None
    assert hass.states.get(STARTS).state == STATE_UNKNOWN

    await _advance(hass, freezer, 30)
    assert hass.states.get(TARGET).state == STATE_OFF
    assert hass.states.get(NUMBER).state == "0"
    assert hass.states.get(ENDS).state == STATE_UNKNOWN


async def test_schedule_start_at(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """A local date and time works as the start."""
    start = dt_util.as_local(dt_util.utcnow() + timedelta(hours=2))
    await _schedule(hass, duration=15, start_at=start.strftime("%Y-%m-%d %H:%M:%S"))
    assert hass.states.get(TARGET).state == STATE_OFF

    await _advance(hass, freezer, 119)
    assert hass.states.get(TARGET).state == STATE_OFF
    await _advance(hass, freezer, 1.1)
    assert hass.states.get(TARGET).state == STATE_ON


async def test_start_in_zero_starts_now(hass: HomeAssistant, loaded_entry) -> None:
    """Without a start (or with 0) the timer starts right away."""
    await _schedule(hass, duration=10, start_in=0)
    assert hass.states.get(TARGET).state == STATE_ON
    assert hass.states.get(NUMBER).attributes["starts_at"] is None


async def test_start_in_and_start_at_are_exclusive(
    hass: HomeAssistant, loaded_entry
) -> None:
    """Giving both start options is rejected."""
    with pytest.raises(Exception):
        await _schedule(hass, duration=10, start_in=5, start_at="2030-01-01 10:00:00")


async def test_cancel_schedule_leaves_target_alone(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """Setting 0 cancels a schedule without turning a manually-on device off."""
    await _schedule(hass, duration=30, start_in=60)
    await _boiler(hass, "turn_on")

    await _set(hass, 0)
    assert hass.states.get(NUMBER).state == "0"
    assert hass.states.get(TARGET).state == STATE_ON

    await _advance(hass, freezer, 120)
    assert hass.states.get(TARGET).state == STATE_ON


async def test_manual_off_does_not_cancel_schedule(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """Turning the device off before the start keeps the schedule."""
    await _boiler(hass, "turn_on")
    await _schedule(hass, duration=30, start_in=60)
    await _boiler(hass, "turn_off")
    assert hass.states.get(NUMBER).state == "30"

    await _advance(hass, freezer, 60.1)
    assert hass.states.get(TARGET).state == STATE_ON


async def test_schedule_while_running_turns_off_until_start(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """Replacing a running timer with a later schedule turns the target off now."""
    await _set(hass, 30)
    assert hass.states.get(TARGET).state == STATE_ON

    await _schedule(hass, duration=10, start_in=60)
    assert hass.states.get(TARGET).state == STATE_OFF

    await _advance(hass, freezer, 60.1)
    assert hass.states.get(TARGET).state == STATE_ON
    await _advance(hass, freezer, 10)
    assert hass.states.get(TARGET).state == STATE_OFF


async def test_set_value_replaces_schedule(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """Starting now cancels a pending schedule."""
    await _schedule(hass, duration=30, start_in=60)
    await _set(hass, 5)
    assert hass.states.get(TARGET).state == STATE_ON
    await _advance(hass, freezer, 5.1)
    assert hass.states.get(TARGET).state == STATE_OFF

    # The old schedule must not fire.
    await _advance(hass, freezer, 60)
    assert hass.states.get(TARGET).state == STATE_OFF


async def test_schedule_survives_reload(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """A schedule is kept across a reload (same code path as a restart)."""
    await _schedule(hass, duration=20, start_in=30)
    assert await hass.config_entries.async_unload(loaded_entry.entry_id)
    await hass.async_block_till_done()
    await _advance(hass, freezer, 10)

    assert await hass.config_entries.async_setup(loaded_entry.entry_id)
    await hass.async_block_till_done()
    assert hass.states.get(NUMBER).attributes["starts_at"] is not None

    await _advance(hass, freezer, 20.1)
    assert hass.states.get(TARGET).state == STATE_ON
    await _advance(hass, freezer, 20)
    assert hass.states.get(TARGET).state == STATE_OFF


async def test_missed_start_turns_on_after_restart(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """If the start passed while stopped but the end didn't, it turns on until the end."""
    await _schedule(hass, duration=30, start_in=10)
    assert await hass.config_entries.async_unload(loaded_entry.entry_id)
    await hass.async_block_till_done()
    freezer.tick(timedelta(minutes=20))

    assert await hass.config_entries.async_setup(loaded_entry.entry_id)
    await hass.async_block_till_done()
    assert hass.states.get(TARGET).state == STATE_ON

    await _advance(hass, freezer, 20.1)
    assert hass.states.get(TARGET).state == STATE_OFF


async def test_whole_window_missed_does_nothing(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """If the whole window passed while stopped, the device is left alone."""
    await _schedule(hass, duration=10, start_in=10)
    assert await hass.config_entries.async_unload(loaded_entry.entry_id)
    await hass.async_block_till_done()
    await _boiler(hass, "turn_on")
    freezer.tick(timedelta(minutes=60))

    assert await hass.config_entries.async_setup(loaded_entry.entry_id)
    await hass.async_block_till_done()
    assert hass.states.get(TARGET).state == STATE_ON
    assert hass.states.get(NUMBER).state == "0"


async def test_failed_scheduled_start_resets(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """If the device can't be turned on at the start time, the timer is cleared."""
    await _schedule(hass, duration=10, start_in=5)
    hass.services.async_remove("input_boolean", "turn_on")

    async def _fail(call: ServiceCall) -> None:
        raise HomeAssistantError("device offline")

    hass.services.async_register("input_boolean", "turn_on", _fail)
    await _advance(hass, freezer, 5.1)
    assert hass.states.get(NUMBER).state == "0"
    assert hass.states.get(NUMBER).attributes["starts_at"] is None
