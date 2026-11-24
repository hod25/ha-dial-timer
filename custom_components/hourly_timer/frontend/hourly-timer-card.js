/**
 * Dial Timer Card for Home Assistant
 *
 * A circular slider in a single card. The ring is a timeline starting now:
 * - the end handle (on the ring) sets how long the device stays on;
 * - the start handle (▶ on the outer track) delays the start to a later time.
 * Release to apply. While running or scheduled, the ring shows the remaining
 * time with a live countdown.
 *
 * Works with the integration's `number.*_timer_duration` entity (recommended)
 * or with any `input_number` (without scheduling or countdown).
 */

(() => {
const CARD_VERSION = "3.2.1";

// Geometry (SVG user units). The ring is a 270° arc with the gap at the bottom.
const CX = 100;
const CY = 100;
const R = 80; // main ring (end handle)
const R_START = 101; // outer track (start handle)
const START_ANGLE = 135; // degrees, SVG coordinates (clockwise from +x)
const SWEEP = 270;
const COMMIT_DELAY = 800; // ms after the last change before it is applied
const MINUTE = 60000;

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);

const formatMinutes = (minutes) => {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest} min`;
  return rest === 0 ? `${h} h` : `${h} h ${rest} min`;
};

const formatCountdown = (seconds) => {
  const s = Math.max(0, Math.ceil(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
};

const formatClock = (ms) =>
  new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const polar = (angleDeg, radius) => {
  const a = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
};

/** SVG path for the ring between fractions f0 and f1 (0..1). */
const arcPath = (f0, f1, radius = R) => {
  const a = Math.min(1, Math.max(0, f0));
  const b = Math.min(1, Math.max(0, f1));
  if (b - a <= 0.0005) return "";
  const [x1, y1] = polar(START_ANGLE + SWEEP * a, radius);
  const [x2, y2] = polar(START_ANGLE + SWEEP * b, radius);
  const large = SWEEP * (b - a) > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
};

class HourlyTimerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    // What the user has chosen but Home Assistant hasn't confirmed yet:
    // { startAt: ms timestamp or null (= now), duration: minutes }
    this._preview = null;
    this._sending = false;
    this._drag = null; // { handle: "start" | "end", startAt, duration }
    this._commitTimer = null;
    this._previewTimeout = null;
    this._tick = null;
  }

  static getStubConfig(hass) {
    const entity = Object.keys(hass.states).find(
      (id) => id.startsWith("number.") && "target_entity" in hass.states[id].attributes
    );
    return { entity: entity || "" };
  }

  setConfig(config) {
    if (!config || !config.entity) {
      throw new Error("Please define an entity (the timer's number entity)");
    }
    const domain = config.entity.split(".")[0];
    if (domain !== "number" && domain !== "input_number") {
      throw new Error("The entity must be a number or input_number entity");
    }
    this.config = { max_minutes: 240, dial_step: 5, presets: [15, 30, 60], ...config };
    if (this.shadowRoot.firstChild) {
      this.shadowRoot.innerHTML = "";
      this._els = null;
    }
    if (this._hass) this.hass = this._hass;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this.config) return;
    if (!this._els) this._render();
    this._update();
  }

  connectedCallback() {
    if (this._els) this._update();
  }

  disconnectedCallback() {
    this._stopTick();
  }

  getCardSize() {
    return 6;
  }

  getGridOptions() {
    return { columns: 12, rows: "auto", min_columns: 6 };
  }

  // ---------------------------------------------------------------------------
  // State helpers
  // ---------------------------------------------------------------------------

  get _stateObj() {
    return this._hass && this._hass.states[this.config.entity];
  }

  get _available() {
    const s = this._stateObj;
    return Boolean(s) && s.state !== "unavailable";
  }

  /** Scheduling needs the integration's entity (it has a target_entity attribute). */
  get _canSchedule() {
    const s = this._stateObj;
    return Boolean(s) && "target_entity" in s.attributes && this.config.entity.startsWith("number.");
  }

  /** Largest value on the ring: the card option, capped by the entity's max. */
  get _max() {
    const attrs = (this._stateObj && this._stateObj.attributes) || {};
    const entityMax = Number(attrs.max ?? 1440) || 1440;
    return Math.min(entityMax, Number(this.config.max_minutes) || 240);
  }

  get _step() {
    const attrs = (this._stateObj && this._stateObj.attributes) || {};
    return Math.max(Number(this.config.dial_step) || 1, Number(attrs.step ?? 1) || 1);
  }

  /**
   * The timer as Home Assistant reports it.
   * mode: "idle" | "running" | "scheduled"; startAt/endAt are ms timestamps.
   */
  _entityTimer() {
    const s = this._stateObj;
    const now = Date.now();
    if (!s) return { mode: "idle" };
    const a = s.attributes;
    const endAt = a.ends_at ? new Date(a.ends_at).getTime() : null;
    const startAt = a.starts_at ? new Date(a.starts_at).getTime() : null;
    if (startAt && endAt && startAt > now) return { mode: "scheduled", startAt, endAt };
    if (endAt && endAt > now) return { mode: "running", startAt: now, endAt };
    if (!a.ends_at && !("target_entity" in a)) {
      // input_number fallback: a non-zero value means running, no end time known.
      const v = Number(s.state) || 0;
      if (v > 0) return { mode: "running", startAt: now, endAt: now + v * MINUTE, approximate: true };
    }
    return { mode: "idle" };
  }

  /** What the ring shows: the preview while the user is choosing, else the entity. */
  _view() {
    const now = Date.now();
    if (this._preview) {
      const startAt = this._preview.startAt ?? now;
      return {
        mode: this._preview.duration === 0 ? "off" : this._preview.startAt ? "scheduled" : "running",
        preview: true,
        startAt,
        endAt: startAt + this._preview.duration * MINUTE,
        duration: this._preview.duration,
      };
    }
    const t = this._entityTimer();
    return { ...t, preview: false };
  }

  /** Round a timestamp to the step on the clock (e.g. 14:00, 14:05), never into the past. */
  _snapStart(ms) {
    const stepMs = this._step * MINUTE;
    const now = Date.now();
    const snapped = Math.round(ms / stepMs) * stepMs;
    return snapped - now < stepMs / 2 ? null : snapped;
  }

  _snapDuration(minutes) {
    return Math.max(0, Math.round(minutes / this._step) * this._step);
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  _render() {
    const title = this.config.title ? escapeHtml(this.config.title) : "";
    const presets = (this.config.presets || [])
      .map((p) => `<button class="chip" type="button" data-minutes="${Number(p)}">${formatMinutes(p)}</button>`)
      .join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host { --ht-color: var(--hourly-timer-color, var(--state-active-color, var(--primary-color))); }
        ha-card { height: 100%; box-sizing: border-box; padding: 12px 16px 16px; display: flex; flex-direction: column; }
        .title { font-size: 16px; font-weight: 500; color: var(--primary-text-color); margin-bottom: 4px; }
        .title:empty { display: none; }
        .dial-wrap { position: relative; width: 100%; max-width: 320px; margin: 0 auto; container-type: inline-size; }
        .dial { display: block; width: 100%; height: auto; touch-action: none; user-select: none; -webkit-user-select: none; }
        .dial:focus { outline: none; }
        .dial:focus-visible .track { stroke: var(--primary-color); }
        .hit { fill: none; stroke: transparent; stroke-linecap: round; cursor: pointer; }
        .track { fill: none; stroke: var(--divider-color, rgba(127,127,127,0.3)); stroke-width: 14; stroke-linecap: round; pointer-events: none; }
        .outer-track { fill: none; stroke: var(--divider-color, rgba(127,127,127,0.3)); stroke-width: 2; stroke-dasharray: 1 5; stroke-linecap: round; pointer-events: none; }
        .wait { fill: none; stroke: var(--ht-color); stroke-width: 3; stroke-dasharray: 2 6; stroke-linecap: round; opacity: 0.7; pointer-events: none; }
        .on { fill: none; stroke: var(--ht-color); stroke-width: 14; stroke-linecap: round; pointer-events: none; }
        .knob { fill: var(--card-background-color, #fff); stroke: var(--ht-color); stroke-width: 4; pointer-events: none; }
        .start-knob circle { fill: var(--card-background-color, #fff); stroke: var(--ht-color); stroke-width: 2.5; }
        .start-knob path { fill: var(--ht-color); }
        .start-knob { pointer-events: none; }
        .idle .knob, .idle .start-knob circle { stroke: var(--secondary-text-color); }
        .idle .start-knob path { fill: var(--secondary-text-color); }
        .no-schedule .start-knob, .no-schedule .outer-track { display: none; }
        .unavailable .on, .unavailable .knob, .unavailable .start-knob, .unavailable .wait { display: none; }

        .center {
          position: absolute; inset: 24% 20% 18%; display: flex; flex-direction: column;
          align-items: center; justify-content: center; text-align: center; pointer-events: none; gap: 2px;
        }
        .cap { font-size: clamp(11px, 5cqw, 13px); color: var(--secondary-text-color); min-height: 1.2em; }
        .big { font-size: clamp(24px, 12cqw, 42px); font-weight: 500; line-height: 1.1; color: var(--primary-text-color); font-variant-numeric: tabular-nums; white-space: nowrap; }
        .sub { font-size: clamp(11px, 5cqw, 14px); color: var(--secondary-text-color); min-height: 1.3em; white-space: nowrap; }
        @container (max-width: 200px) { .sub-prefix { display: none; } }
        .stop {
          pointer-events: auto; margin-top: 6px; width: clamp(32px, 14cqw, 42px); height: clamp(32px, 14cqw, 42px); flex-shrink: 0;
          border-radius: 50%; border: none; cursor: pointer; padding: 0;
          background: rgba(127, 127, 127, 0.15); color: var(--primary-text-color);
          display: flex; align-items: center; justify-content: center;
        }
        .stop:hover { background: rgba(127, 127, 127, 0.28); }
        .stop svg { width: 16px; height: 16px; }

        .controls { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: -6px; }
        .round {
          width: 44px; height: 44px; border-radius: 50%; cursor: pointer; font-size: 24px; line-height: 1; padding: 0;
          border: 1px solid var(--divider-color); background: none; color: var(--primary-text-color);
        }
        .round:hover { border-color: var(--ht-color); }
        .chips { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin-top: 12px; }
        .chips:empty { display: none; }
        .chip {
          border: 1px solid var(--divider-color); border-radius: 16px; padding: 6px 12px; cursor: pointer;
          background: none; color: var(--primary-text-color); font: inherit; font-size: 13px;
        }
        .chip:hover { border-color: var(--ht-color); }
        .hint { text-align: center; font-size: 12px; color: var(--secondary-text-color); margin-top: 10px; }
        .hint:empty { display: none; }
        button:disabled { opacity: 0.4; cursor: default; }
        [hidden] { display: none !important; }
      </style>

      <ha-card>
        <div class="title">${title}</div>
        <div class="dial-wrap">
          <svg class="dial" id="dial" viewBox="-14 -14 228 228" role="slider" tabindex="0"
            aria-label="Timer duration" aria-valuemin="0" aria-valuemax="${this._max}" aria-valuenow="0">
            <path class="hit" d="${arcPath(0, 1, R)}" stroke-width="34"></path>
            <path class="hit" id="hit-start" d="${arcPath(0, 1, R_START)}" stroke-width="22"></path>
            <path class="outer-track" d="${arcPath(0, 1, R_START)}"></path>
            <path class="track" d="${arcPath(0, 1, R)}"></path>
            <path class="wait" id="wait" d=""></path>
            <path class="on" id="on" d=""></path>
            <circle class="knob" id="knob" r="11"></circle>
            <g class="start-knob" id="start-knob">
              <circle r="9"></circle>
              <path d="M -2.5 -4 L 4 0 L -2.5 4 Z"></path>
            </g>
          </svg>
          <div class="center">
            <div class="cap" id="cap"></div>
            <div class="big" id="big">Off</div>
            <div class="sub"><span class="sub-prefix" id="sub-prefix"></span><span id="sub"></span></div>
            <button class="stop" id="stop" type="button" title="Turn off" aria-label="Turn off" hidden>
              <svg viewBox="0 0 24 24"><rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor"></rect></svg>
            </button>
          </div>
        </div>
        <div class="controls">
          <button class="round" id="minus" type="button" aria-label="Less time">−</button>
          <button class="round" id="plus" type="button" aria-label="More time">+</button>
        </div>
        <div class="chips" id="chips">${presets}</div>
        <div class="hint" id="hint"></div>
      </ha-card>
    `;

    const $ = (id) => this.shadowRoot.getElementById(id);
    this._els = {
      dial: $("dial"),
      wait: $("wait"),
      on: $("on"),
      knob: $("knob"),
      startKnob: $("start-knob"),
      cap: $("cap"),
      big: $("big"),
      sub: $("sub"),
      subPrefix: $("sub-prefix"),
      stop: $("stop"),
      minus: $("minus"),
      plus: $("plus"),
      chips: $("chips"),
      hint: $("hint"),
    };
    this._bindEvents();
  }

  _bindEvents() {
    const els = this._els;

    els.dial.addEventListener("pointerdown", (e) => {
      if (!this._available) return;
      const handle = this._handleAt(e);
      if (!handle) return;
      e.preventDefault();
      els.dial.setPointerCapture(e.pointerId);
      this._cancelCommit();
      const v = this._view();
      const now = Date.now();
      this._drag = {
        handle,
        startAt: v.mode === "scheduled" ? v.startAt : null,
        duration: v.mode === "idle" || v.mode === "off" ? 0 : Math.max(0, (v.endAt - Math.max(v.startAt, now)) / MINUTE),
      };
      if (handle === "start" && this._drag.duration === 0) {
        // Starting a schedule from idle: give it a sensible length to move around.
        this._drag.duration = this._defaultDuration();
      }
      this._applyPointer(e, false);
    });
    els.dial.addEventListener("pointermove", (e) => {
      if (this._drag) this._applyPointer(e, true);
    });
    const endDrag = (e) => {
      if (!this._drag) return;
      this._drag = null;
      if (els.dial.hasPointerCapture(e.pointerId)) els.dial.releasePointerCapture(e.pointerId);
      this._scheduleCommit();
    };
    els.dial.addEventListener("pointerup", endDrag);
    els.dial.addEventListener("pointercancel", endDrag);

    els.dial.addEventListener("keydown", (e) => {
      const delta = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key];
      if (delta) {
        e.preventDefault();
        this._nudge(delta);
      }
    });

    els.minus.addEventListener("click", () => this._nudge(-1));
    els.plus.addEventListener("click", () => this._nudge(1));
    els.stop.addEventListener("click", () => {
      this._cancelCommit();
      this._preview = { startAt: null, duration: 0 };
      this._send();
    });
    els.chips.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip || !this._available) return;
      this._cancelCommit();
      const v = this._view();
      this._preview = {
        startAt: v.mode === "scheduled" ? v.startAt : null,
        duration: Math.max(0, Math.round(Number(chip.dataset.minutes))),
      };
      this._send();
    });
  }

  _defaultDuration() {
    const presets = this.config.presets || [];
    return presets.length ? Number(presets[Math.min(1, presets.length - 1)]) : 30;
  }

  _toSvg(e) {
    const rect = this._els.dial.getBoundingClientRect();
    return [
      -14 + ((e.clientX - rect.left) / rect.width) * 228,
      -14 + ((e.clientY - rect.top) / rect.height) * 228,
    ];
  }

  /** Which handle a press grabs: the outer track moves the start, the ring the end. */
  _handleAt(e) {
    const [x, y] = this._toSvg(e);
    const d = Math.hypot(x - CX, y - CY);
    if (d >= 56 && d < 91) return "end";
    if (d >= 91 && d <= 114 && this._canSchedule) return "start";
    return null;
  }

  /** Minutes from now at the pointer's angle (0..max). */
  _minutesAt(e) {
    const [x, y] = this._toSvg(e);
    const angle = (Math.atan2(y - CY, x - CX) * 180) / Math.PI;
    let rel = (angle - START_ANGLE + 720) % 360;
    if (rel > SWEEP) rel = rel > SWEEP + (360 - SWEEP) / 2 ? 0 : SWEEP; // pointer is in the gap
    return (rel / SWEEP) * this._max;
  }

  _applyPointer(e, moving) {
    const drag = this._drag;
    const now = Date.now();
    const max = this._max;
    let at = this._minutesAt(e);
    const startOff = drag.startAt ? (drag.startAt - now) / MINUTE : 0;

    if (drag.handle === "end") {
      const current = startOff + drag.duration;
      // Don't jump from one end of the ring to the other while dragging.
      if (moving && Math.abs(at - current) > max / 2) at = current > max / 2 ? max : 0;
      drag.duration = this._snapDuration(Math.max(0, at - startOff));
    } else {
      if (moving && Math.abs(at - startOff) > max / 2) at = startOff > max / 2 ? max : 0;
      // Move the whole block; keep its end on the ring.
      const latest = Math.max(0, max - drag.duration);
      const off = Math.min(at, latest);
      drag.startAt = this._snapStart(now + off * MINUTE);
    }
    this._preview = { startAt: drag.startAt, duration: drag.duration };
    this._update();
  }

  _nudge(direction) {
    if (!this._available) return;
    this._cancelCommit();
    const v = this._view();
    const startAt = v.mode === "scheduled" ? v.startAt : null;
    const base = v.mode === "idle" || v.mode === "off" ? 0 : (v.endAt - Math.max(v.startAt, Date.now())) / MINUTE;
    const step = this._step;
    const snapped = direction > 0 ? Math.floor(base / step) * step : Math.ceil(base / step) * step;
    const startOff = startAt ? (startAt - Date.now()) / MINUTE : 0;
    const duration = Math.min(Math.max(0, snapped + direction * step), Math.max(0, this._max - startOff));
    this._preview = { startAt, duration };
    this._scheduleCommit();
  }

  _scheduleCommit() {
    this._cancelCommit();
    this._commitTimer = setTimeout(() => {
      this._commitTimer = null;
      if (this._preview) this._send();
    }, COMMIT_DELAY);
    this._update();
  }

  _cancelCommit() {
    if (this._commitTimer) {
      clearTimeout(this._commitTimer);
      this._commitTimer = null;
    }
  }

  _send() {
    const stateObj = this._stateObj;
    const preview = this._preview;
    if (!stateObj || !preview) return;
    const domain = this.config.entity.split(".")[0];
    const entityMax = Number(stateObj.attributes.max ?? 1440) || 1440;
    const duration = Math.min(entityMax, Math.max(0, Math.round(preview.duration)));
    if (duration === 0 && this._entityTimer().mode === "idle") {
      // Nothing to start or cancel: don't send 0, which would turn the device off.
      this._clearPreview();
      return;
    }

    let call;
    if (preview.startAt && duration > 0 && this._canSchedule) {
      call = ["hourly_timer", "schedule", {
        entity_id: this.config.entity,
        duration,
        start_at: new Date(preview.startAt).toISOString(),
      }];
    } else {
      call = [domain, "set_value", { entity_id: this.config.entity, value: duration }];
    }

    this._sending = true;
    this._sentAt = stateObj.last_updated;
    // Keep showing the chosen value until Home Assistant reports the new state.
    clearTimeout(this._previewTimeout);
    this._previewTimeout = setTimeout(() => this._clearPreview(), 3000);
    this._update();
    this._hass.callService(...call).catch((err) => {
      this._clearPreview();
      this._els.sub.textContent = `Error: ${err.message || err}`;
    });
  }

  _clearPreview() {
    clearTimeout(this._previewTimeout);
    this._preview = null;
    this._sending = false;
    this._update();
  }

  // ---------------------------------------------------------------------------
  // Display updates
  // ---------------------------------------------------------------------------

  _update() {
    const els = this._els;
    const stateObj = this._stateObj;
    const dial = els.dial;

    // A state update from Home Assistant confirms what we sent.
    if (this._sending && stateObj && stateObj.last_updated !== this._sentAt) {
      clearTimeout(this._previewTimeout);
      this._preview = null;
      this._sending = false;
    }

    els.subPrefix.textContent = "";
    els.cap.textContent = "";
    els.hint.textContent = "";
    const controls = [els.minus, els.plus, ...els.chips.querySelectorAll("button")];
    dial.classList.toggle("no-schedule", !this._canSchedule);

    if (!this._available) {
      this._stopTick();
      dial.classList.add("unavailable");
      els.big.textContent = "—";
      els.sub.textContent = stateObj ? "Unavailable" : `Entity not found: ${this.config.entity}`;
      els.stop.hidden = true;
      controls.forEach((b) => (b.disabled = true));
      return;
    }
    dial.classList.remove("unavailable");
    controls.forEach((b) => (b.disabled = false));

    const now = Date.now();
    const max = this._max;
    const v = this._view();
    const active = v.mode === "running" || v.mode === "scheduled";
    const startOff = active ? Math.max(0, (v.startAt - now) / MINUTE) : 0;
    const endOff = active ? Math.max(startOff, (v.endAt - now) / MINUTE) : 0;
    const fs = Math.min(1, startOff / max);
    const fe = Math.min(1, endOff / max);

    els.wait.setAttribute("d", arcPath(0, fs, R));
    els.on.setAttribute("d", arcPath(fs, fe, R));
    const [kx, ky] = polar(START_ANGLE + SWEEP * fe, R);
    els.knob.setAttribute("cx", String(kx));
    els.knob.setAttribute("cy", String(ky));
    const [sx, sy] = polar(START_ANGLE + SWEEP * fs, R_START);
    els.startKnob.setAttribute("transform", `translate(${sx} ${sy})`);
    dial.classList.toggle("idle", !active);
    dial.setAttribute("aria-valuemax", String(max));
    dial.setAttribute("aria-valuenow", String(Math.round(endOff - startOff)));
    dial.setAttribute("aria-valuetext", formatMinutes(endOff - startOff));

    if (v.preview) {
      this._stopTick();
      els.stop.hidden = true;
      const dragging = Boolean(this._drag);
      if (v.mode === "off") {
        els.big.textContent = "Off";
        els.sub.textContent = this._sending ? "Turning off…" : "";
      } else if (v.mode === "scheduled") {
        els.cap.textContent = "Starts at";
        els.big.textContent = formatClock(v.startAt);
        els.sub.textContent = `for ${formatMinutes(v.duration)}`;
        if (!dragging) els.hint.textContent = this._sending ? "Scheduling…" : "";
      } else {
        els.big.textContent = formatMinutes(v.duration);
        els.sub.textContent = dragging ? "Release to start" : "Starting…";
      }
      return;
    }

    if (v.mode === "scheduled") {
      els.cap.textContent = "Starts in";
      els.big.textContent = formatCountdown((v.startAt - now) / 1000);
      els.sub.textContent = `${formatClock(v.startAt)} → ${formatClock(v.endAt)}`;
      els.stop.hidden = false;
      els.stop.title = "Cancel";
      els.stop.setAttribute("aria-label", "Cancel");
      this._startTick();
      return;
    }

    if (v.mode === "running") {
      els.stop.hidden = false;
      els.stop.title = "Turn off";
      els.stop.setAttribute("aria-label", "Turn off");
      if (v.approximate) {
        this._stopTick();
        els.big.textContent = formatMinutes(Number(stateObj.state) || 0);
        els.sub.textContent = "Running";
      } else {
        els.big.textContent = formatCountdown((v.endAt - now) / 1000);
        els.subPrefix.textContent = "Off at ";
        els.sub.textContent = formatClock(v.endAt);
        this._startTick();
      }
      return;
    }

    this._stopTick();
    els.big.textContent = "Off";
    els.sub.textContent = "Drag the ring to start";
    els.stop.hidden = true;
    if (this._canSchedule) els.hint.textContent = "Drag ▶ on the outer ring to start later";
  }

  _startTick() {
    if (!this._tick) this._tick = setInterval(() => this._update(), 1000);
  }

  _stopTick() {
    if (this._tick) {
      clearInterval(this._tick);
      this._tick = null;
    }
  }
}

// Guard against the file being loaded twice (e.g. an old /local resource
// left over from a manual installation).
if (!customElements.get("hourly-timer-card")) {
  customElements.define("hourly-timer-card", HourlyTimerCard);

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "hourly-timer-card",
    name: "Dial Timer Card",
    description: "Circular slider to turn a device on now or later for a set time, with a live countdown.",
    preview: true,
    documentationURL: "https://github.com/hod25/hourly-timer-integration",
  });

  console.info(
    `%c DIAL-TIMER-CARD %c v${CARD_VERSION} `,
    "color: white; background: #03a9f4; font-weight: 700;",
    "color: #03a9f4; background: white; font-weight: 700;"
  );
}
})();
