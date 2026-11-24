# Hourly Timer for Home Assistant

[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz)
[![Validate](https://github.com/hod25/hourly-timer-integration/actions/workflows/validate.yml/badge.svg)](https://github.com/hod25/hourly-timer-integration/actions/workflows/validate.yml)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2025.8%2B-blue.svg)

Turn a device on for a set number of minutes. It turns off on its own when the time is up.
Useful for an electric water heater (boiler), fans, garden lights, irrigation, or anything else you tend to forget to turn off.

It includes a dashboard card that shows a live countdown and a dial for setting the time.

## Features

- **No automations needed.** Pick an entity and you get a timer for it.
- **Survives restarts.** A running timer keeps going after Home Assistant restarts. If the end time passed while Home Assistant was down, the device is turned off as soon as it starts again.
- **Follows the device.** If you turn the device off by hand, the timer is cancelled.
- **Works with** `switch`, `light`, `fan`, `climate` and `input_boolean` entities.
- **Card included.** The card is loaded automatically, so you don't need to add a resource.

## Installation

### Home Assistant Marketplace / HACS (recommended)

On Home Assistant 2026.11 and newer, HACS is built in as the **Marketplace** (Settings → Marketplace). On older versions, use HACS.

1. In HACS, open the menu (⋮) and choose **Custom repositories**.
2. Add `https://github.com/hod25/hourly-timer-integration` with the category **Integration**.
3. Search for **Hourly Timer**, download it, and restart Home Assistant.

### Manual

Copy `custom_components/hourly_timer` into your `/config/custom_components/` folder and restart Home Assistant.

## Setup

1. Go to **Settings → Devices & services → Add integration** and choose **Hourly Timer**.
2. Pick the entity to control, for example `switch.boiler`.

You get two entities. If the controlled entity belongs to a device, they appear on that device's page.

| Entity | What it does |
| --- | --- |
| `number.<name>_timer_duration` | Set it to a number of minutes (1–1440) to turn the device on for that long. Setting it again restarts the countdown, and `0` turns the device off. It goes back to `0` when the timer ends. The `ends_at` attribute holds the end time. |
| `sensor.<name>_timer_ends` | The time the device will be turned off, or *unknown* when no timer is running. |

## Dashboard card

```yaml
type: custom:hourly-timer-card
entity: number.boiler_timer_duration
title: Boiler
```

The card is a circular slider. Drag the ring to choose a time and release it to start. You can also use the **−/+** buttons or a preset. While the timer runs, the ring shrinks as time passes and the center shows a live countdown and a stop button.

| Option | Default | Description |
| --- | --- | --- |
| `entity` | *required* | The timer's `number` entity. An `input_number` also works, but without the countdown. |
| `title` | none | Card title. |
| `max_minutes` | `240` | Time at the end of the ring. It can't be higher than the entity's maximum (1440). |
| `dial_step` | `5` | Minutes per step for dragging and for **−/+**. |
| `presets` | `[15, 30, 60]` | Quick buttons, in minutes. Use `[]` to hide them. |

To change the ring color, set `--hourly-timer-color` with [card-mod](https://github.com/thomasloven/lovelace-card-mod) or a theme.

## Using it in automations

The number entity is a regular `number`, so you can start a timer from any automation or script:

```yaml
action: number.set_value
target:
  entity_id: number.boiler_timer_duration
data:
  value: 45
```

## Upgrading from 2.x

Version 2.x tried to create an `input_number.<name>_duration` helper, but that never worked. Version 3 creates its own `number` entity instead.

- Point your cards at the new `number.<name>_timer_duration` entity.
- If you copied `hourly-timer-card.js` to `/config/www` by hand, delete it and remove the `/local/hourly-timer-card.js` dashboard resource. The integration now loads the card itself.

## Development

Run the tests with Docker:

```bash
docker run --rm -v "$PWD:/repo" -w /repo python:3.14-slim \
  sh -c "pip install -q -r requirements_test.txt && pytest"
```

## License

MIT. See [LICENSE](LICENSE).
