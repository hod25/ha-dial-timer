# Phase 2 drafts: comments for approval

Status: draft 1 **posted** 2026-11-24 with the owner's approval. Draft 2 is **not posted**: it is waiting for a screenshot. Each comment is posted only after the owner (hod25) approves its exact text.

Suggested order: post draft 1 first, because #1491 is where the direction is decided. Post draft 2 after it, so it can link to the #1491 comment.

Before posting draft 2, attach a screenshot or GIF of the card (running state, light or dark mode) where it says `[screenshot]`. GitHub uploads the image when you drag it into the comment box.

---

## Draft 1: architecture discussion #1491 — POSTED 2026-11-24: https://github.com/home-assistant/architecture/discussions/1491#discussioncomment-19863113

Where: https://github.com/home-assistant/architecture/discussions/1491

> Glad this is being looked at across all toggle entities. A data point from the other side: many cheap toggle devices have no native timed-off. My electric water heater is on a Tuya Wi-Fi plug, for example. If `duration` is gated by an `EntityFeature`, those entities won't get it, and they are the devices where people most often want "on for 30 minutes".
>
> Is a Home Assistant-side fallback for entities without the feature in scope, or deliberately left out?
>
> In case it helps, I built a software version as a custom integration ([hourly-timer-integration](https://github.com/hod25/hourly-timer-integration)). These are the cases I had to handle to make it safe. Each one is covered by a test:
>
> - The end time is persisted. If it passed while Home Assistant was stopped, the device is turned off at startup.
> - If the device is unavailable or not loaded yet when the time is up, a pending "off" is persisted and retried on its next state change, and every 30 s.
> - Turning the device off by hand cancels the timer.
> - The integration calls `<domain>.turn_off` rather than `homeassistant.turn_off`. The latter only logs a warning when the domain isn't loaded yet, so the "off" can be lost at startup.
>
> On the UI side, the proposed revert-time attribute would be enough for the frontend to show a countdown. I'd be happy to work on a "run for" control based on `ha-control-circular-slider` once the entity model is settled.

---

## Draft 2: feature request #3126

Where: https://github.com/orgs/home-assistant/discussions/3126

> +1, with a concrete use case and a prototype.
>
> I control an electric water heater with a smart plug. It must never be left on by mistake, so every time I want "on for 40 minutes, then off". Fans, garden lights and irrigation have the same pattern. Today this needs a `timer` helper plus an automation for each device, or a script. Neither is a one-tap control on the dashboard.
>
> I built a prototype as a custom integration with a card: https://github.com/hod25/hourly-timer-integration (release [v3.2.0](https://github.com/hod25/hourly-timer-integration/releases/tag/v3.2.0)).
>
> [screenshot]
>
> - Drag the ring (thermostat-style) and release to turn the device on for that long. While it runs, the ring shrinks and the center shows a countdown and a stop button.
> - An optional handle on the outer track starts it later instead of now.
> - The timer survives Home Assistant restarts.
>
> A possible built-in shape: a "run for" tile feature or more-info control for toggleable entities, built on `ha-control-circular-slider`. The backend side is being discussed in home-assistant/architecture#1491. The architecture meeting supported an optional `duration` on turn-on actions, plus a state attribute with the revert time. A control like this could sit on top of that.

---

## Notes for the owner

- Both drafts describe only what's built and tested. Neither claims any users other than you.
- Draft 1 asks a question rather than pushing a solution. That's the usual tone for architecture discussions.
- I'd skip #5348 and frontend#21677. #3126 has the most recent votes in the right category, and adding comments to duplicates looks like spam.
- An English review is welcome. Change anything that doesn't sound like you.
