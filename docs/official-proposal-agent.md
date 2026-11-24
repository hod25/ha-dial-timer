# Agent brief: propose the Dial Timer card for official Home Assistant

## Your goal

Get the idea behind the Dial Timer card into Home Assistant itself. The idea is to turn a device on now or later for a set number of minutes, from a circular dial, with a live countdown. You do this by following Home Assistant's own contribution process.

Success is **not** "our card is merged as-is". That outcome is unlikely. Success means one of these, in order of likelihood:

1. The frontend team accepts the use case, and a built-in feature covers it. This could be a tile card feature, a more-info control or a card, designed their way.
2. A pull request you write, shaped by their feedback, is merged into `home-assistant/frontend` and, if needed, `home-assistant/core`.
3. The team declines, with a clear reason. Record the reason and stop.

Work for the repository owner, GitHub user **hod25**. They write in Hebrew. Write everything public in English.

## Ground rules

- **Nothing public without approval.** Before you post a comment, open a discussion, open a PR, or comment on Discord, show the owner the exact text and wait for a clear yes. Everything you post appears under their name.
- **Verify before you rely on anything.** Home Assistant's processes change often. Read the current page each time. Treat this brief as a starting map, not as the source of truth. Where a page contradicts this brief, the page wins. Tell the owner about the difference.
- **Don't duplicate.** Search existing feature requests and PRs first. Add to an existing one rather than opening a new one.
- **Don't oversell.** Describe only what has been built and tested. Never claim users or adoption numbers you don't have.
- **Keep the custom version working.** The custom integration stays the way people get this today. Don't break it while working on the official route.

## What already exists

| Item | Where |
| --- | --- |
| Repository | https://github.com/hod25/hourly-timer-integration (domain `hourly_timer`, display name "Dial Timer") |
| Latest release | v3.2.0, https://github.com/hod25/hourly-timer-integration/releases/tag/v3.2.0 |
| Card source | `custom_components/hourly_timer/frontend/hourly-timer-card.js`, a vanilla web component with no build step |
| Backend | `timer_logic.py`, `number.py` (number entity + `hourly_timer.schedule` action) and `sensor.py` (start and end timestamps) |
| Tests | `tests/`, 27 pytest tests (pytest-homeassistant-custom-component) |
| HACS inclusion | PR https://github.com/hacs/default/pull/14843 (pending when this was written) |
| Closest existing feature request | https://github.com/orgs/home-assistant/discussions/3126, "time based auto-toggle behaviour for more info dialog for toggle-able items" (category: Dashboards & cards) |

What the card does, for any proposal text:
- The ring is a timeline starting now, covering 270° with the gap at the bottom (thermostat-card style).
- Drag the ring and release to turn the device on for that long. The value is sent about 0.8 s after release, so dragging doesn't produce a stream of calls.
- Drag the ▶ handle on the outer track to start later. The start snaps to round clock times. While waiting, the card shows a countdown to the start.
- While running, the ring shrinks and the center shows a countdown, the end time and a stop button.
- There are −/+ buttons and presets. Arrow keys work. The card works at full and half width, in light and dark mode.

Backend behavior a core version must keep (all covered by tests):
- Start and end times are persisted, so timers survive restarts.
- An end time that passed while Home Assistant was stopped turns the device off at startup.
- A start time that passed while stopped turns the device on until the original end. A whole window that passed is dropped.
- If the device is unavailable or not loaded yet, a pending "off" is persisted and retried (on its next state change, or every 30 s). The code calls `<domain>.turn_off`, because `homeassistant.turn_off` only logs a warning when the domain isn't loaded.
- Turning the device off by hand cancels a running timer, but not a schedule that hasn't started.
- Setting 0 cancels a schedule without turning off a device that was turned on by hand.

## Phase 1: research (no public actions)

Read these pages and summarize the current rules for the owner. Note anything that contradicts this brief.

1. Frontend contribution guide: https://contributors.home-assistant.io/frontend/
2. Architecture decisions, to see when a discussion is needed first: https://contributors.home-assistant.io/architecture/decisions/
3. Integration quality scale (Bronze is the minimum for core): https://contributors.home-assistant.io/core/quality-scale/
4. "Does it belong in core?": https://contributors.home-assistant.io/core/integrations/create/#does-it-belong-in-core (not yet verified)
5. Feature requests board: https://github.com/orgs/home-assistant/discussions. Use the "Dashboards & cards" category, and also check "Core functionality" and "New integrations".
6. UX design discussions: https://github.com/OpenHomeFoundation/ux-design/discussions
7. The `home-assistant/frontend` repository: the README, how to run the dev environment, and its contributing rules. Note that `CONTRIBUTING.md` on `dev` returned 404 when this brief was written, so find the current location.
8. Whether a CLA must be signed before a PR to `home-assistant/*` can be merged. Check, and tell the owner, because only they can sign it.

Then search for overlap and list every relevant item with its URL, votes and state:
- Feature requests and PRs about: timer, countdown, auto-off, "turn off after", sleep timer, delayed start, tile feature timer.
- The existing core `timer` helper and what it already offers.
- Any existing tile card feature or more-info control that does part of this.
- The frontend component `ha-control-circular-slider`, which the thermostat card uses. An official version should reuse it rather than ship its own SVG ring.

Deliverable: a short report to the owner covering the current process, the overlaps found, and your recommendation for the shape of the proposal (see Phase 3). Stop and wait for approval.

## Phase 2: support the feature request

1. Draft a comment for discussion #3126, or for a better match found in Phase 1. It should:
   - Describe the use case in one or two sentences: an electric water heater (boiler) that must not be left on, fans, garden lights, irrigation.
   - Say what the existing options lack. The `timer` helper needs an automation per device. Automations are not a one-tap UI.
   - Show the working prototype: one screenshot or GIF of the card, and a link to the repository and release.
   - Propose a concrete, small shape. For example: "a 'run for' tile feature for toggleable entities that uses `ha-control-circular-slider`, with an optional delayed start".
   - Stay short and factual, with no marketing tone.
2. Show the draft to the owner. Post it only after approval.
3. If the owner wants design feedback, draft a separate post for the UX design discussions with the same rules.
4. Collect replies. If a maintainer or designer gives direction, summarize it for the owner and follow it in later phases.

Don't open a new feature request if #3126 or another existing one fits. Open one only if Phase 1 shows none fits, and only with approval.

## Phase 3: agree on the shape before writing code

An official version can't depend on this custom integration. Decide with the owner, informed by maintainer feedback, between:

- **A. Frontend only:** a tile feature or more-info control that sends `turn_on`, then relies on a core mechanism to turn off later. This only works if core already offers something it can use (check the `timer` helper and any "turn off after" support). It's the smallest change and the most likely to be accepted.
- **B. Frontend + core:** a new core capability (for example a helper, or an extension of `timer`) that holds the start and end, plus a frontend feature on top. This is a bigger change and probably needs an architecture discussion first (https://github.com/home-assistant/architecture/discussions), because other features would build on it.
- **C. Stop:** if maintainers say it doesn't belong in core, record why. The custom integration remains the answer.

Don't start Phase 4 without a direction that a maintainer has supported, or that the owner explicitly accepts the risk of.

## Phase 4: core changes (only for shape B)

Follow the current core developer docs. At the time of writing, a new core integration must:
- Reach the **Bronze** quality scale, with a `quality_scale` key in `manifest.json` and a `quality_scale.yaml` listing each rule as `done`, `todo` or `exempt` with a reason. Hassfest checks this.
- Be set up from the UI, with a tested config flow, unique IDs and documentation.
- Follow core rules that the custom version breaks. Core integrations don't ship or serve frontend code, so remove the static path and `add_extra_js_url`. They don't carry a `version` key, they use core's translation pipeline, and their tests go in the core test layout.

Port the logic and tests from `timer_logic.py` and `tests/`. Keep every behavior listed under "Backend behavior a core version must keep". Run the full core checks locally (pytest, hassfest, mypy and ruff as configured in core) before proposing the PR.

## Phase 5: frontend PR

- Set up the `home-assistant/frontend` dev environment as its docs describe.
- Build the feature in TypeScript with Lit, in the shape agreed in Phase 3. Reuse `ha-control-circular-slider` and the existing tile-feature or more-info patterns. Don't port the custom SVG.
- Use the frontend's translation system for all strings. Support RTL, keyboard and screen readers like the existing controls do.
- Add the feature to the frontend's demo or gallery if that's how similar features are shown.
- Follow the frontend's lint, type-check and test commands. The PR description links the feature request and any design discussion, and includes screenshots in light and dark mode.
- Show the owner the PR text before opening it.

## Phase 6: documentation

If a core or frontend change is merged, draft the matching docs PR for `home-assistant/home-assistant.io`, following that repository's current rules. Show it to the owner first.

## Reporting to the owner

After each phase, report in a few lines:
- What you did.
- What you found, with URLs.
- What needs their decision or approval, and the exact text for anything to be posted.

Report blockers right away. Don't work around them. Examples are a CLA that needs signing, a maintainer saying no, or a page that contradicts this brief.
