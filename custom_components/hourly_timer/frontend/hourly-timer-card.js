/**
 * Hourly Timer Card for Home Assistant
 *
 * Shows the remaining time of an Hourly Timer and opens a dial to set a new
 * duration. Works with the integration's `number.*_timer_duration` entity
 * (recommended) or with any `input_number`.
 */

(() => {
const CARD_VERSION = "3.0.0";
const DEFAULT_PRESETS = [15, 30, 60, 120];
const RADIUS = 120;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

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

class HourlyTimerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._dialValue = 0;
    this._dragging = false;
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
    this.config = {
      dial_step: 5,
      presets: DEFAULT_PRESETS,
      ...config,
    };
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
    return 3;
  }

  getGridOptions() {
    return { columns: 6, rows: 3, min_columns: 4, min_rows: 2 };
  }

  // ---------------------------------------------------------------------------
  // State helpers
  // ---------------------------------------------------------------------------

  get _stateObj() {
    return this._hass && this._hass.states[this.config.entity];
  }

  get _limits() {
    const attrs = (this._stateObj && this._stateObj.attributes) || {};
    return {
      min: Number(attrs.min ?? 0),
      max: Number(attrs.max ?? 1440) || 1440,
      step: Number(attrs.step ?? 1) || 1,
    };
  }

  /** Seconds until the timer ends, or null when no end time is known. */
  _remainingSeconds() {
    const stateObj = this._stateObj;
    const endsAt = stateObj && stateObj.attributes.ends_at;
    if (!endsAt) return null;
    return (new Date(endsAt).getTime() - Date.now()) / 1000;
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  _render() {
    const title = escapeHtml(this.config.title || "Timer");
    const presets = (this.config.presets || [])
      .map((p) => `<button class="chip" data-minutes="${Number(p)}">${formatMinutes(p)}</button>`)
      .join("");

    this.shadowRoot.innerHTML = `
      <style>
        ha-card { height: 100%; box-sizing: border-box; }
        .card { padding: 16px; display: flex; flex-direction: column; gap: 12px; height: 100%; box-sizing: border-box; }
        .title { font-size: 16px; font-weight: 500; color: var(--primary-text-color); }
        .display {
          flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 4px; padding: 16px; border-radius: 12px; cursor: pointer; user-select: none;
          border: 2px solid var(--divider-color); background: none; font: inherit; color: inherit;
          transition: border-color 0.2s ease, background-color 0.2s ease;
        }
        .display:hover, .display:focus-visible { border-color: var(--primary-color); outline: none; }
        .display.running { border-color: var(--primary-color); background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.08); }
        .value { font-size: 40px; font-weight: 600; line-height: 1.1; color: var(--primary-text-color); font-variant-numeric: tabular-nums; }
        .sub { font-size: 14px; color: var(--secondary-text-color); }
        .unavailable .value { color: var(--disabled-text-color); }

        dialog {
          border: none; border-radius: 16px; padding: 24px 20px; width: min(360px, 90vw); box-sizing: border-box;
          background: var(--card-background-color, #fff); color: var(--primary-text-color);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }
        dialog::backdrop { background: rgba(0, 0, 0, 0.5); }
        .dialog-title { text-align: center; font-size: 18px; font-weight: 500; margin-bottom: 16px; }
        .dial { position: relative; width: 100%; max-width: 280px; aspect-ratio: 1; margin: 0 auto 16px; touch-action: none; cursor: pointer; }
        .dial svg { width: 100%; height: 100%; transform: rotate(-90deg); display: block; }
        .track { fill: none; stroke: var(--divider-color); stroke-width: 12; }
        .progress { fill: none; stroke: var(--primary-color); stroke-width: 12; stroke-linecap: round; }
        .knob { fill: var(--primary-color); stroke: var(--card-background-color, #fff); stroke-width: 4; }
        .dial-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
        .dial-value { font-size: 32px; font-weight: 600; font-variant-numeric: tabular-nums; }
        .chips { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 16px; }
        .chip {
          border: 1px solid var(--divider-color); border-radius: 16px; padding: 6px 12px; cursor: pointer;
          background: none; color: var(--primary-text-color); font: inherit; font-size: 14px;
        }
        .chip:hover { border-color: var(--primary-color); }
        .actions { display: flex; gap: 8px; }
        .actions button { flex: 1; padding: 10px; border-radius: 8px; border: none; cursor: pointer; font: inherit; font-weight: 500; }
        .btn-start { background: var(--primary-color); color: var(--text-primary-color, #fff); }
        .btn-start:disabled { opacity: 0.5; cursor: default; }
        .btn-off { background: none; color: var(--error-color, #db4437); border: 1px solid var(--error-color, #db4437) !important; }
        .btn-cancel { background: none; color: var(--primary-text-color); border: 1px solid var(--divider-color) !important; }
        [hidden] { display: none !important; }
      </style>

      <ha-card>
        <div class="card">
          <div class="title">${title}</div>
          <button class="display" id="display" type="button">
            <div class="value" id="value">Off</div>
            <div class="sub" id="sub">Tap to set a timer</div>
          </button>
        </div>
      </ha-card>

      <dialog id="dialog">
        <div class="dialog-title">${title}</div>
        <div class="dial" id="dial">
          <svg viewBox="0 0 280 280">
            <circle class="track" cx="140" cy="140" r="${RADIUS}"></circle>
            <circle class="progress" id="progress" cx="140" cy="140" r="${RADIUS}"
              stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="${CIRCUMFERENCE}"></circle>
            <circle class="knob" id="knob" cx="260" cy="140" r="14"></circle>
          </svg>
          <div class="dial-center">
            <div class="dial-value" id="dial-value">0 min</div>
          </div>
        </div>
        <div class="chips" id="chips">${presets}</div>
        <div class="actions">
          <button class="btn-cancel" id="btn-cancel" type="button">Cancel</button>
          <button class="btn-off" id="btn-off" type="button" hidden>Turn off</button>
          <button class="btn-start" id="btn-start" type="button">Start</button>
        </div>
      </dialog>
    `;

    const $ = (id) => this.shadowRoot.getElementById(id);
    this._els = {
      display: $("display"),
      value: $("value"),
      sub: $("sub"),
      dialog: $("dialog"),
      dial: $("dial"),
      progress: $("progress"),
      knob: $("knob"),
      dialValue: $("dial-value"),
      chips: $("chips"),
      btnStart: $("btn-start"),
      btnOff: $("btn-off"),
      btnCancel: $("btn-cancel"),
    };
    this._bindEvents();
  }

  _bindEvents() {
    const els = this._els;

    els.display.addEventListener("click", () => this._openDialog());

    els.dial.addEventListener("pointerdown", (e) => {
      this._dragging = true;
      els.dial.setPointerCapture(e.pointerId);
      this._setDialFromPointer(e, false);
    });
    els.dial.addEventListener("pointermove", (e) => {
      if (this._dragging) this._setDialFromPointer(e, true);
    });
    const endDrag = (e) => {
      this._dragging = false;
      if (els.dial.hasPointerCapture(e.pointerId)) els.dial.releasePointerCapture(e.pointerId);
    };
    els.dial.addEventListener("pointerup", endDrag);
    els.dial.addEventListener("pointercancel", endDrag);

    els.chips.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      this._setValue(Number(chip.dataset.minutes));
      els.dialog.close();
    });

    els.btnStart.addEventListener("click", () => {
      this._setValue(this._dialValue);
      els.dialog.close();
    });
    els.btnOff.addEventListener("click", () => {
      this._setValue(0);
      els.dialog.close();
    });
    els.btnCancel.addEventListener("click", () => els.dialog.close());

    // Close when clicking the backdrop.
    els.dialog.addEventListener("click", (e) => {
      if (e.target === els.dialog) els.dialog.close();
    });
  }

  _openDialog() {
    const stateObj = this._stateObj;
    if (!stateObj || stateObj.state === "unavailable") return;
    const remaining = this._remainingSeconds();
    const start = remaining && remaining > 0
      ? Math.round(remaining / 60)
      : Number(stateObj.state) || 0;
    this._updateDial(this._clamp(start));
    this._els.btnOff.hidden = !this._isRunning();
    this._els.dialog.showModal();
  }

  _setDialFromPointer(e, moving) {
    const rect = this._els.dial.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
    if (angle < 0) angle += 360;

    const { max } = this._limits;
    const step = Math.max(Number(this.config.dial_step) || 1, this._limits.step);
    let value = Math.round(((angle / 360) * max) / step) * step;

    // Don't jump from the maximum to zero (or back) when crossing the top.
    if (moving && Math.abs(value - this._dialValue) > max / 2) {
      value = this._dialValue > max / 2 ? max : 0;
    }
    this._updateDial(this._clamp(value));
  }

  _updateDial(value) {
    const { max } = this._limits;
    this._dialValue = value;
    const fraction = max > 0 ? value / max : 0;
    this._els.progress.setAttribute("stroke-dashoffset", String(CIRCUMFERENCE * (1 - fraction)));
    const radians = fraction * 2 * Math.PI;
    this._els.knob.setAttribute("cx", String(140 + RADIUS * Math.cos(radians)));
    this._els.knob.setAttribute("cy", String(140 + RADIUS * Math.sin(radians)));
    this._els.dialValue.textContent = formatMinutes(value);
    this._els.btnStart.disabled = value <= 0;
  }

  _clamp(value) {
    const { min, max, step } = this._limits;
    const stepped = Math.round(value / step) * step;
    return Math.min(max, Math.max(min, stepped));
  }

  _isRunning() {
    const remaining = this._remainingSeconds();
    if (remaining !== null) return remaining > 0;
    // input_number fallback: no end time, so a non-zero value means running.
    return (Number(this._stateObj && this._stateObj.state) || 0) > 0;
  }

  _setValue(value) {
    const domain = this.config.entity.split(".")[0];
    this._hass
      .callService(domain, "set_value", { entity_id: this.config.entity, value: this._clamp(value) })
      .catch((err) => {
        this._els.sub.textContent = `Error: ${err.message || err}`;
      });
  }

  // ---------------------------------------------------------------------------
  // Display updates
  // ---------------------------------------------------------------------------

  _update() {
    const els = this._els;
    const stateObj = this._stateObj;

    if (!stateObj || stateObj.state === "unavailable") {
      this._stopTick();
      els.display.classList.add("unavailable");
      els.display.classList.remove("running");
      els.value.textContent = "—";
      els.sub.textContent = stateObj ? "Unavailable" : `Entity not found: ${this.config.entity}`;
      return;
    }
    els.display.classList.remove("unavailable");

    const remaining = this._remainingSeconds();
    if (remaining !== null && remaining > 0) {
      els.display.classList.add("running");
      els.value.textContent = formatCountdown(remaining);
      const endsAt = new Date(stateObj.attributes.ends_at);
      els.sub.textContent = `Off at ${endsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
      this._startTick();
      return;
    }

    this._stopTick();
    const value = Number(stateObj.state) || 0;
    if (remaining === null && value > 0) {
      // input_number without an end time: show the configured duration.
      els.display.classList.add("running");
      els.value.textContent = formatMinutes(value);
      els.sub.textContent = "Tap to change";
    } else {
      els.display.classList.remove("running");
      els.value.textContent = "Off";
      els.sub.textContent = "Tap to set a timer";
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
    description: "Turn a device on for a set time and see the countdown.",
    preview: false,
    documentationURL: "https://github.com/hod25/hourly-timer-integration",
  });

  console.info(
    `%c HOURLY-TIMER-CARD %c v${CARD_VERSION} `,
    "color: white; background: #03a9f4; font-weight: 700;",
    "color: #03a9f4; background: white; font-weight: 700;"
  );
}
})();
