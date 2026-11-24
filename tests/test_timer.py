"""Timer behaviour tests."""

from __future__ import annotations

from datetime import timedelta

from freezegun.api import FrozenDateTimeFactory
import pytest
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import STATE_OFF, STATE_ON, STATE_UNKNOWN
from homeassistant.core import HomeAssistant, ServiceCall
from homeassistant.exceptions import HomeAssistantError

from .conftest import TARGET

NUMBER = "number.boiler_timer_duration"
SENSOR = "sensor.boiler_timer_ends"


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


async def test_entities_created(hass: HomeAssistant, loaded_entry) -> None:
    """A number and a sensor are created and idle."""
    number = hass.states.get(NUMBER)
    assert number is not None
    assert number.state == "0"
    assert number.attributes["max"] == 1440
    assert number.attributes["ends_at"] is None
    assert number.attributes["target_entity"] == TARGET
    assert hass.states.get(SENSOR).state == STATE_UNKNOWN


async def test_full_cycle_twice(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """Timer turns on, turns off when done, and keeps working afterwards."""
    for _ in range(2):
        await _set(hass, 10)
        assert hass.states.get(TARGET).state == STATE_ON
        assert hass.states.get(NUMBER).state == "10"
        assert hass.states.get(NUMBER).attributes["ends_at"] is not None
        assert hass.states.get(SENSOR).state != STATE_UNKNOWN

        await _advance(hass, freezer, 9)
        assert hass.states.get(TARGET).state == STATE_ON

        await _advance(hass, freezer, 1.1)
        assert hass.states.get(TARGET).state == STATE_OFF
        assert hass.states.get(NUMBER).state == "0"
        assert hass.states.get(SENSOR).state == STATE_UNKNOWN


async def test_set_zero_turns_off(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """Setting 0 cancels the timer and turns the target off; it still works after."""
    await _set(hass, 30)
    await _set(hass, 0)
    assert hass.states.get(TARGET).state == STATE_OFF
    assert hass.states.get(NUMBER).state == "0"

    await _set(hass, 5)
    assert hass.states.get(TARGET).state == STATE_ON
    await _advance(hass, freezer, 5.1)
    assert hass.states.get(TARGET).state == STATE_OFF


async def test_restart_with_new_duration(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """Setting a new value while running restarts the countdown."""
    await _set(hass, 10)
    await _advance(hass, freezer, 8)
    await _set(hass, 10)
    await _advance(hass, freezer, 8)
    assert hass.states.get(TARGET).state == STATE_ON
    await _advance(hass, freezer, 2.1)
    assert hass.states.get(TARGET).state == STATE_OFF


async def test_manual_off_cancels_timer(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """Turning the target off by hand cancels the timer."""
    await _set(hass, 10)
    await hass.services.async_call(
        "input_boolean", "turn_off", {"entity_id": TARGET}, blocking=True
    )
    await hass.async_block_till_done()
    assert hass.states.get(NUMBER).state == "0"

    # Turning it on by hand later must not be undone by the old timer.
    await hass.services.async_call(
        "input_boolean", "turn_on", {"entity_id": TARGET}, blocking=True
    )
    await _advance(hass, freezer, 11)
    assert hass.states.get(TARGET).state == STATE_ON


async def test_failed_turn_on_raises(hass: HomeAssistant, loaded_entry) -> None:
    """If the target can't be turned on, the error is shown and nothing is scheduled."""
    hass.services.async_remove("input_boolean", "turn_on")

    async def _fail(call: ServiceCall) -> None:
        raise HomeAssistantError("device offline")

    hass.services.async_register("input_boolean", "turn_on", _fail)
    with pytest.raises(HomeAssistantError):
        await _set(hass, 10)
    assert hass.states.get(NUMBER).state == "0"
    assert hass.states.get(NUMBER).attributes["ends_at"] is None


async def test_unload_and_reload_keeps_timer(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """A running timer survives a reload (same code path as a restart)."""
    await _set(hass, 10)
    assert await hass.config_entries.async_unload(loaded_entry.entry_id)
    await hass.async_block_till_done()
    assert loaded_entry.state is ConfigEntryState.NOT_LOADED

    await _advance(hass, freezer, 3)
    assert hass.states.get(TARGET).state == STATE_ON

    assert await hass.config_entries.async_setup(loaded_entry.entry_id)
    await hass.async_block_till_done()
    assert hass.states.get(NUMBER).state == "10"

    await _advance(hass, freezer, 7.1)
    assert hass.states.get(TARGET).state == STATE_OFF
    assert hass.states.get(NUMBER).state == "0"


async def test_expired_while_stopped_turns_off(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """If the end time passed while stopped, the target is turned off on start."""
    await _set(hass, 10)
    assert await hass.config_entries.async_unload(loaded_entry.entry_id)
    await hass.async_block_till_done()

    freezer.tick(timedelta(minutes=30))
    assert await hass.config_entries.async_setup(loaded_entry.entry_id)
    await hass.async_block_till_done()
    assert hass.states.get(TARGET).state == STATE_OFF
    assert hass.states.get(NUMBER).state == "0"


async def test_remove_entry_deletes_storage(
    hass: HomeAssistant, loaded_entry: MockConfigEntry, hass_storage
) -> None:
    """Removing the entry removes its stored timer."""
    await _set(hass, 10)
    await hass.config_entries.async_remove(loaded_entry.entry_id)
    await hass.async_block_till_done()
    assert f"hourly_timer.{loaded_entry.entry_id}" not in hass_storage


async def test_card_is_registered(hass: HomeAssistant, loaded_entry, mock_frontend) -> None:
    """The card is added to the frontend with a cache-busting version."""
    mock_frontend.assert_called_once()
    url = mock_frontend.call_args.args[1]
    assert url.startswith("/hourly_timer/hourly-timer-card.js?v=")


async def test_linked_to_target_device(hass: HomeAssistant, target: str) -> None:
    """When the target belongs to a device, the timer entities join that device."""
    from homeassistant.helpers import device_registry as dr, entity_registry as er

    from custom_components.hourly_timer.const import CONF_ENTITY_ID, DOMAIN

    source = MockConfigEntry(domain="test")
    source.add_to_hass(hass)
    device = dr.async_get(hass).async_get_or_create(
        config_entry_id=source.entry_id,
        identifiers={("test", "heater")},
        name="Heater",
    )
    er.async_get(hass).async_get_or_create(
        "switch", "test", "heater", device_id=device.id, suggested_object_id="heater"
    )
    hass.states.async_set("switch.heater", STATE_OFF)

    entry = MockConfigEntry(
        domain=DOMAIN, unique_id="switch.heater", data={CONF_ENTITY_ID: "switch.heater"}
    )
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    reg_entry = er.async_get(hass).async_get("number.heater_timer_duration")
    assert reg_entry is not None
    assert reg_entry.device_id == device.id


async def test_ended_while_stopped_target_loads_later(
    hass: HomeAssistant,
    entry: MockConfigEntry,
    hass_storage,
    freezer: FrozenDateTimeFactory,
) -> None:
    """After a restart the target may load after us; it must still be turned off."""
    from homeassistant.setup import async_setup_component
    from homeassistant.util import dt as dt_util

    entry.add_to_hass(hass)
    hass_storage[f"hourly_timer.{entry.entry_id}"] = {
        "version": 1,
        "minor_version": 1,
        "key": f"hourly_timer.{entry.entry_id}",
        "data": {
            "duration": 10,
            "ends_at": (dt_util.utcnow() - timedelta(minutes=5)).isoformat(),
        },
    }
    assert await async_setup_component(hass, "homeassistant", {})
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()

    # The controlled device only shows up now, still on from before the restart.
    assert await async_setup_component(
        hass, "input_boolean", {"input_boolean": {"boiler": {"initial": True}}}
    )
    await hass.async_block_till_done()
    # Its services may register just after its state appears; a retry follows.
    freezer.tick(timedelta(seconds=31))
    async_fire_time_changed(hass)
    await hass.async_block_till_done()
    assert hass.states.get(TARGET).state == STATE_OFF

    # Once it's off, turning it on by hand is left alone.
    await hass.services.async_call(
        "input_boolean", "turn_on", {"entity_id": TARGET}, blocking=True
    )
    await hass.async_block_till_done()
    assert hass.states.get(TARGET).state == STATE_ON


async def test_unavailable_at_expiry_turns_off_when_back(
    hass: HomeAssistant, loaded_entry, freezer: FrozenDateTimeFactory
) -> None:
    """If the target is unavailable when the timer ends, it's turned off when it returns."""
    from homeassistant.const import STATE_UNAVAILABLE

    await _set(hass, 10)
    hass.states.async_set(TARGET, STATE_UNAVAILABLE)
    await _advance(hass, freezer, 10.1)
    assert hass.states.get(NUMBER).state == "0"

    hass.states.async_set(TARGET, STATE_ON)
    await hass.async_block_till_done()
    assert hass.states.get(TARGET).state == STATE_OFF
