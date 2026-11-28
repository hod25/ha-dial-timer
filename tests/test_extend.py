"""Tests for the extend action (add or take away minutes)."""

from __future__ import annotations

from datetime import timedelta

from freezegun.api import FrozenDateTimeFactory
from pytest_homeassistant_custom_component.common import async_fire_time_changed

from homeassistant.const import STATE_OFF, STATE_ON
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .conftest import TARGET

NUMBER = "number.boiler_timer_duration"


async def _extend(hass: HomeAssistant, minutes: int) -> None:
    await hass.services.async_call(
        "hourly_timer", "extend", {"entity_id": NUMBER, "minutes": minutes}, blocking=True
    )
    await hass.async_block_till_done()


async def _set(hass: HomeAssistant, minutes: float) -> None:
    await hass.services.async_call(
        "number", "set_value", {"entity_id": NUMBER, "value": minutes}, blocking=True
    )
    await hass.async_block_till_done()


async def _schedule(hass: HomeAssistant, **data) -> None:
    await hass.services.async_call(
        "hourly_timer", "schedule", {"entity_id": NUMBER, **data}, blocking=True
    )
    await hass.async_block_till_done()


async def _advance(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, seconds: float
) -> None:
    freezer.tick(timedelta(seconds=seconds))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()


def _ends_at(hass: HomeAssistant):
    return dt_util.parse_datetime(hass.states.get(NUMBER).attributes["ends_at"])


async def test_extend_keeps_the_seconds(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """Adding 5 minutes to 35:35 left gives exactly 40:35 left."""
    await _set(hass, 40)
    await _advance(hass, freezer, 4 * 60 + 25)  # 35:35 left
    end_before = _ends_at(hass)

    await _extend(hass, 5)

    assert _ends_at(hass) - end_before == timedelta(minutes=5)
    left = _ends_at(hass) - dt_util.utcnow()
    assert left == timedelta(minutes=40, seconds=35)
    assert hass.states.get(TARGET).state == STATE_ON
    assert hass.states.get(NUMBER).state == "45"

    # It turns off at the new end, not the old one.
    await _advance(hass, freezer, 40 * 60 + 30)
    assert hass.states.get(TARGET).state == STATE_ON
    await _advance(hass, freezer, 10)
    assert hass.states.get(TARGET).state == STATE_OFF


async def test_shorten_running_timer(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """Negative minutes move the end earlier."""
    await _set(hass, 30)
    end_before = _ends_at(hass)

    await _extend(hass, -10)

    assert end_before - _ends_at(hass) == timedelta(minutes=10)
    await _advance(hass, freezer, 19 * 60 + 50)
    assert hass.states.get(TARGET).state == STATE_ON
    await _advance(hass, freezer, 20)
    assert hass.states.get(TARGET).state == STATE_OFF


async def test_shorten_past_zero_turns_off(
    hass: HomeAssistant, loaded_entry
) -> None:
    """Taking away more time than is left turns the target off now."""
    await _set(hass, 3)
    await _extend(hass, -5)

    assert hass.states.get(TARGET).state == STATE_OFF
    assert hass.states.get(NUMBER).state == "0"
    assert hass.states.get(NUMBER).attributes["ends_at"] is None


async def test_extend_is_capped_at_24_hours(
    hass: HomeAssistant, loaded_entry
) -> None:
    """A timer never runs longer than 24 hours from now."""
    await _set(hass, 1400)
    await _extend(hass, 600)

    left = _ends_at(hass) - dt_util.utcnow()
    assert left <= timedelta(minutes=1440)
    assert left > timedelta(minutes=1439)


async def test_extend_schedule_keeps_the_start(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """On a schedule, only the end moves and the target stays off until the start."""
    await _schedule(hass, duration=30, start_in=60)
    starts_before = hass.states.get(NUMBER).attributes["starts_at"]
    end_before = _ends_at(hass)

    await _extend(hass, 15)

    assert hass.states.get(NUMBER).attributes["starts_at"] == starts_before
    assert _ends_at(hass) - end_before == timedelta(minutes=15)
    assert hass.states.get(TARGET).state == STATE_OFF

    await _advance(hass, freezer, 60 * 60 + 5)
    assert hass.states.get(TARGET).state == STATE_ON
    await _advance(hass, freezer, 44 * 60)
    assert hass.states.get(TARGET).state == STATE_ON
    await _advance(hass, freezer, 60)
    assert hass.states.get(TARGET).state == STATE_OFF


async def test_shorten_schedule_to_nothing_cancels_it(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """A schedule left with no time is cancelled, and the target is left alone."""
    await _schedule(hass, duration=10, start_in=60)
    await _extend(hass, -10)

    assert hass.states.get(NUMBER).attributes["starts_at"] is None
    assert hass.states.get(NUMBER).attributes["ends_at"] is None

    await _advance(hass, freezer, 61 * 60)
    assert hass.states.get(TARGET).state == STATE_OFF


async def test_extend_without_timer(hass: HomeAssistant, loaded_entry) -> None:
    """Positive minutes start a timer; negative minutes do nothing."""
    await _extend(hass, -5)
    assert hass.states.get(TARGET).state == STATE_OFF
    assert hass.states.get(NUMBER).state == "0"

    await _extend(hass, 10)
    assert hass.states.get(TARGET).state == STATE_ON
    assert hass.states.get(NUMBER).state == "10"
