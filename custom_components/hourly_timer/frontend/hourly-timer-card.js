/**
 * Hourly Timer Card for Home Assistant
 *
 * A circular slider in a single card: drag the ring to choose a duration and
 * release to start. While running, the ring shows the remaining time with a
 * live countdown. Works with the integration's `number.*_timer_duration`
 * entity (recommended) or with any `input_number`.
 */

(() => {
const CARD_VERSION = "3.1.0";

// Ring geometry (SVG user units). The ring is a 270° arc with the gap at the bottom.
const CX = 100;
const CY = 100;
const R = 80;
const START_ANGLE = 135; // degrees, SVG coordinates (clockwise from +x)
const SWEEP = 270;
const COMMIT_DELAY = 800; // ms after the last change before the value is sent

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

const polar = (angleDeg, radius = R) => {
  const a = (angleDeg * Math.PI) / 180;
  return [CX + radius * Math.cos(a), CY + radius * Math.sin(a)];
};

/** SVG path for the part of the ring from 0 to `fraction` (0..1). */
const arcPath = (fraction) => {
  const f = Math.min(1, Math.max(0, fraction));
  if (f <= 0) return "";
  const [x1, y1] = polar(START_ANGLE);
  const [x2, y2] = polar(START_ANGLE + SWEEP * f);
  const large = SWEEP * f > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2}`;
};

class HourlyTimerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._preview = null; // value chosen by the user, not yet confirmed by HA
    this._sending = false;
    this._dragging = false;
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

  /** Seconds until the timer ends, or null when the entity has no end time. */
  _remainingSeconds() {
    const s = this._stateObj;
    const endsAt = s && s.attributes.ends_at;
    if (!endsAt) return null;
    return Math.max(0, (new Date(endsAt).getTime() - Date.now()) / 1000);
  }

  _isRunning() {
    const remaining = this._remainingSeconds();
    if (remaining !== null) return remaining > 0;
    // input_number fallback: no end time, a non-zero value means running.
    return (Number(this._stateObj && this._stateObj.state) || 0) > 0;
  }

  _remainingMinutes() {
    const remaining = this._remainingSeconds();
    if (remaining !== null) return remaining / 60;
    return Number(this._stateObj && this._stateObj.state) || 0;
  }

  /** Minutes the ring currently shows. */
  _displayMinutes() {
    if (this._preview !== null) return this._preview;
    return this._isRunning() ? this._remainingMinutes() : 0;
  }

  _clamp(value) {
    const stepped = Math.round(value / this._step) * this._step;
    return Math.min(this._max, Math.max(0, stepped));
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  _render() {
    const title = this.config.title ? escapeHtml(this.config.title) : "";
    const presets = (this.config.presets || [])
      .map((p) => `<button class="chip" type="button" data-minutes="${Number(p)}">${formatMinutes(p)}</button>`)
      .join("");
    const [sx, sy] = polar(START_ANGLE);

    this.shadowRoot.innerHTML = `
      <style>
        :host { --ht-color: var(--hourly-timer-color, var(--state-active-color, var(--primary-color))); }
        ha-card { height: 100%; box-sizing: border-box; padding: 12px 16px 16px; display: flex; flex-direction: column; }
        .title { font-size: 16px; font-weight: 500; color: var(--primary-text-color); margin-bottom: 4px; }
        .title:empty { display: none; }
        .dial-wrap { position: relative; width: 100%; max-width: 300px; margin: 0 auto; container-type: inline-size; }
        .dial { display: block; width: 100%; height: auto; touch-action: none; user-select: none; -webkit-user-select: none; }
        .ring-hit { fill: none; stroke: transparent; stroke-width: 44; stroke-linecap: round; cursor: pointer; }
        .track { fill: none; stroke: var(--divider-color, rgba(127,127,127,0.3)); stroke-width: 14; stroke-linecap: round; pointer-events: none; }
        .value { fill: none; stroke: var(--ht-color); stroke-width: 14; stroke-linecap: round; pointer-events: none; }
        .knob { fill: var(--card-background-color, #fff); stroke: var(--ht-color); stroke-width: 4; pointer-events: none; }
        .start-dot { fill: var(--ht-color); pointer-events: none; }
        .idle .knob { stroke: var(--secondary-text-color); }
        .idle .start-dot { fill: var(--secondary-text-color); opacity: 0.6; }
        .unavailable .value, .unavailable .knob, .unavailable .start-dot { display: none; }
        .dial:focus { outline: none; }
        .dial:focus-visible .track { stroke: var(--primary-color); }

        .center {
          position: absolute; inset: 22% 18% 16%; display: flex; flex-direction: column;
          align-items: center; justify-content: center; text-align: center; pointer-events: none; gap: 2px;
        }
        .big { font-size: clamp(26px, 13cqw, 44px); font-weight: 500; line-height: 1.1; color: var(--primary-text-color); font-variant-numeric: tabular-nums; white-space: nowrap; }
        .sub { font-size: clamp(11px, 5.5cqw, 14px); color: var(--secondary-text-color); min-height: 1.3em; white-space: nowrap; }
        @container (max-width: 200px) { .sub-prefix { display: none; } }
        .stop {
          pointer-events: auto; margin-top: 8px; width: clamp(32px, 16cqw, 44px); height: clamp(32px, 16cqw, 44px); flex-shrink: 0; border-radius: 50%; border: none; cursor: pointer;
          background: rgba(127, 127, 127, 0.15); color: var(--primary-text-color);
          display: flex; align-items: center; justify-content: center; padding: 0;
        }
        .stop:hover { background: rgba(127, 127, 127, 0.28); }
        .stop svg { width: 18px; height: 18px; }

        .controls { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: -10px; }
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
        button:disabled { opacity: 0.4; cursor: default; }
        [hidden] { display: none !important; }
      </style>

      <ha-card>
        <div class="title">${title}</div>
        <div class="dial-wrap">
          <svg class="dial" id="dial" viewBox="0 0 200 200" role="slider" tabindex="0"
            aria-label="Timer duration" aria-valuemin="0" aria-valuemax="${this._max}" aria-valuenow="0">
            <path class="ring-hit" d="${arcPath(1)}"></path>
            <path class="track" d="${arcPath(1)}"></path>
            <path class="value" id="value-arc" d=""></path>
            <circle class="start-dot" cx="${sx}" cy="${sy}" r="4"></circle>
            <circle class="knob" id="knob" cx="${sx}" cy="${sy}" r="11"></circle>
          </svg>
          <div class="center">
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
      </ha-card>
    `;

    const $ = (id) => this.shadowRoot.getElementById(id);
    this._els = {
      dial: $("dial"),
      valueArc: $("value-arc"),
      knob: $("knob"),
      big: $("big"),
      sub: $("sub"),
      subPrefix: $("sub-prefix"),
      stop: $("stop"),
      minus: $("minus"),
      plus: $("plus"),
      chips: $("chips"),
    };
    this._bindEvents();
  }

  _bindEvents() {
    const els = this._els;

    els.dial.addEventListener("pointerdown", (e) => {
      if (!this._available || !this._isOnRing(e)) return;
      e.preventDefault();
      this._dragging = true;
      els.dial.setPointerCapture(e.pointerId);
      this._cancelCommit();
      this._setPreview(this._valueFromPointer(e, false));
    });
    els.dial.addEventListener("pointermove", (e) => {
      if (this._dragging) this._setPreview(this._valueFromPointer(e, true));
    });
    const endDrag = (e) => {
      if (!this._dragging) return;
      this._dragging = false;
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
      this._preview = 0;
      this._send(0);
    });
    els.chips.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip || !this._available) return;
      this._cancelCommit();
      this._preview = Math.max(0, Math.round(Number(chip.dataset.minutes)));
      this._send(this._preview);
    });
  }

  /** Only presses on the ring start a drag (the middle holds the stop button). */
  _isOnRing(e) {
    const [x, y] = this._toSvg(e);
    const d = Math.hypot(x - CX, y - CY);
    return d > R - 28 && d < R + 28;
  }

  _toSvg(e) {
    const rect = this._els.dial.getBoundingClientRect();
    return [
      ((e.clientX - rect.left) / rect.width) * 200,
      ((e.clientY - rect.top) / rect.height) * 200,
    ];
  }

  _valueFromPointer(e, moving) {
    const [x, y] = this._toSvg(e);
    const angle = (Math.atan2(y - CY, x - CX) * 180) / Math.PI;
    let rel = (angle - START_ANGLE + 720) % 360;
    if (rel > SWEEP) rel = rel > SWEEP + (360 - SWEEP) / 2 ? 0 : SWEEP; // pointer is in the gap
    let value = this._clamp((rel / SWEEP) * this._max);

    // Don't jump from one end of the ring to the other while dragging.
    const current = this._displayMinutes();
    if (moving && Math.abs(value - current) > this._max / 2) {
      value = current > this._max / 2 ? this._max : 0;
    }
    return value;
  }

  _nudge(direction) {
    if (!this._available) return;
    this._cancelCommit();
    const base = this._preview ?? (this._isRunning() ? this._remainingMinutes() : 0);
    // Snap to the step first so +/- lands on round numbers.
    const snapped = direction > 0
      ? Math.floor(base / this._step) * this._step
      : Math.ceil(base / this._step) * this._step;
    this._setPreview(this._clamp(snapped + direction * this._step));
    this._scheduleCommit();
  }

  _setPreview(value) {
    this._preview = value;
    this._update();
  }

  _scheduleCommit() {
    this._cancelCommit();
    this._commitTimer = setTimeout(() => {
      this._commitTimer = null;
      if (this._preview !== null) this._send(this._preview);
    }, COMMIT_DELAY);
    this._update();
  }

  _cancelCommit() {
    if (this._commitTimer) {
      clearTimeout(this._commitTimer);
      this._commitTimer = null;
    }
  }

  _send(value) {
    const stateObj = this._stateObj;
    if (!stateObj) return;
    const domain = this.config.entity.split(".")[0];
    const entityMax = Number(stateObj.attributes.max ?? 1440) || 1440;
    this._sending = true;
    this._sentAt = stateObj.last_updated;
    // Keep showing the chosen value until Home Assistant reports the new state.
    clearTimeout(this._previewTimeout);
    this._previewTimeout = setTimeout(() => this._clearPreview(), 3000);
    this._update();
    this._hass
      .callService(domain, "set_value", {
        entity_id: this.config.entity,
        value: Math.min(entityMax, Math.max(0, value)),
      })
      .catch((err) => {
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

    // A state update from Home Assistant confirms the value we sent.
    if (this._sending && stateObj && stateObj.last_updated !== this._sentAt) {
      clearTimeout(this._previewTimeout);
      this._preview = null;
      this._sending = false;
    }

    els.subPrefix.textContent = "";
    const controls = [els.minus, els.plus, ...els.chips.querySelectorAll("button")];
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

    const running = this._isRunning();
    const minutes = this._displayMinutes();
    const fraction = this._max > 0 ? Math.min(1, minutes / this._max) : 0;
    const [kx, ky] = polar(START_ANGLE + SWEEP * fraction);

    els.valueArc.setAttribute("d", arcPath(fraction));
    els.knob.setAttribute("cx", String(kx));
    els.knob.setAttribute("cy", String(ky));
    dial.classList.toggle("idle", !running && this._preview === null);
    dial.setAttribute("aria-valuemax", String(this._max));
    dial.setAttribute("aria-valuenow", String(Math.round(minutes)));
    dial.setAttribute("aria-valuetext", formatMinutes(minutes));

    if (this._preview !== null) {
      this._stopTick();
      els.big.textContent = this._preview === 0 ? "Off" : formatMinutes(this._preview);
      if (this._dragging) els.sub.textContent = "Release to start";
      else els.sub.textContent = this._preview === 0 ? "Turning off…" : "Starting…";
      els.stop.hidden = true;
      return;
    }

    const remaining = this._remainingSeconds();
    if (running && remaining !== null) {
      els.big.textContent = formatCountdown(remaining);
      const endsAt = new Date(stateObj.attributes.ends_at);
      els.subPrefix.textContent = "Off at ";
      els.sub.textContent = endsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      els.stop.hidden = false;
      this._startTick();
      return;
    }

    this._stopTick();
    if (running) {
      // input_number without an end time.
      els.big.textContent = formatMinutes(minutes);
      els.sub.textContent = "Running";
      els.stop.hidden = false;
    } else {
      els.big.textContent = "Off";
      els.sub.textContent = "Drag the ring to start";
      els.stop.hidden = true;
    }
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
    name: "Hourly Timer Card",
    description: "Circular slider to turn a device on for a set time, with a live countdown.",
    preview: true,
    documentationURL: "https://github.com/hod25/hourly-timer-integration",
  });

  console.info(
    `%c HOURLY-TIMER-CARD %c v${CARD_VERSION} `,
    "color: white; background: #03a9f4; font-weight: 700;",
    "color: #03a9f4; background: white; font-weight: 700;"
  );
}
})();
