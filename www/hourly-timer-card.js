/**
 * Hourly Timer Card for Home Assistant
 * A circular timer card with draggable slider
 */

class HourlyTimerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isDragging = false;
    this.currentValue = 0;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('Please define an entity (input_number)');
    }
    this.config = config;
  }

  set hass(hass) {
    this._hass = hass;
    
    if (!this.content) {
      this.render();
    }
    
    this.updateState();
  }

  render() {
    const card = document.createElement('ha-card');
    const title = this.config.title || 'Hourly Timer';
    
    card.innerHTML = `
      <style>
        .timer-card {
          padding: 30px 20px;
          text-align: center;
          user-select: none;
        }
        .timer-title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 30px;
          color: var(--primary-text-color);
        }
        .timer-container {
          position: relative;
          width: 300px;
          height: 300px;
          margin: 0 auto;
        }
        .timer-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }
        .timer-track {
          fill: none;
          stroke: var(--disabled-text-color);
          stroke-width: 15;
          opacity: 0.3;
        }
        .timer-progress {
          fill: none;
          stroke: var(--primary-color);
          stroke-width: 15;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.1s ease;
        }
        .timer-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        .timer-value {
          font-size: 64px;
          font-weight: bold;
          color: var(--primary-text-color);
          line-height: 1;
        }
        .timer-unit {
          font-size: 18px;
          color: var(--secondary-text-color);
          margin-top: 5px;
        }
        .timer-handle {
          position: absolute;
          width: 30px;
          height: 30px;
          background: var(--primary-color);
          border: 4px solid var(--card-background-color);
          border-radius: 50%;
          cursor: grab;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          transition: transform 0.1s ease;
          z-index: 10;
        }
        .timer-handle:hover {
          transform: scale(1.2);
        }
        .timer-handle:active {
          cursor: grabbing;
          transform: scale(1.3);
        }
        .timer-buttons {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 30px;
          flex-wrap: wrap;
        }
        .timer-button {
          padding: 12px 24px;
          font-size: 16px;
          border: none;
          border-radius: 20px;
          background: var(--primary-color);
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .timer-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        .timer-button:active {
          transform: translateY(0);
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .timer-button.reset {
          background: var(--error-color);
        }
      </style>
      <div class="timer-card">
        <div class="timer-title">${title}</div>
        <div class="timer-container" id="timer-container">
          <svg class="timer-svg" viewBox="0 0 300 300">
            <circle class="timer-track" cx="150" cy="150" r="135" />
            <circle class="timer-progress" id="timer-progress" cx="150" cy="150" r="135" />
          </svg>
          <div class="timer-center">
            <div class="timer-value" id="timer-value">0</div>
            <div class="timer-unit">min</div>
          </div>
          <div class="timer-handle" id="timer-handle"></div>
        </div>
        <div class="timer-buttons">
          <button class="timer-button" id="btn-15">15 min</button>
          <button class="timer-button" id="btn-30">30 min</button>
          <button class="timer-button" id="btn-60">60 min</button>
          <button class="timer-button reset" id="btn-reset">Reset</button>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(card);
    this.content = this.shadowRoot.querySelector('.timer-card');
    
    this.setupEventListeners();
    this.updateCircle(0);
  }

  setupEventListeners() {
    const handle = this.shadowRoot.getElementById('timer-handle');
    const container = this.shadowRoot.getElementById('timer-container');
    const btn15 = this.shadowRoot.getElementById('btn-15');
    const btn30 = this.shadowRoot.getElementById('btn-30');
    const btn60 = this.shadowRoot.getElementById('btn-60');
    const btnReset = this.shadowRoot.getElementById('btn-reset');

    // Drag events for handle
    handle.addEventListener('mousedown', (e) => this.startDrag(e));
    handle.addEventListener('touchstart', (e) => this.startDrag(e));
    
    document.addEventListener('mousemove', (e) => this.onDrag(e));
    document.addEventListener('touchmove', (e) => this.onDrag(e));
    
    document.addEventListener('mouseup', () => this.stopDrag());
    document.addEventListener('touchend', () => this.stopDrag());

    // Click on circle to set value
    container.addEventListener('click', (e) => {
      if (e.target === handle) return;
      this.handleCircleClick(e);
    });

    // Preset buttons
    btn15.addEventListener('click', () => this.setValue(15));
    btn30.addEventListener('click', () => this.setValue(30));
    btn60.addEventListener('click', () => this.setValue(60));
    btnReset.addEventListener('click', () => this.setValue(0));
  }

  startDrag(e) {
    e.preventDefault();
    this.isDragging = true;
  }

  stopDrag() {
    if (this.isDragging) {
      this.isDragging = false;
      // Save final value
      this.saveValue();
    }
  }

  onDrag(e) {
    if (!this.isDragging) return;
    e.preventDefault();
    
    const container = this.shadowRoot.getElementById('timer-container');
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    const angle = this.calculateAngle(centerX, centerY, clientX, clientY);
    const value = Math.round((angle / 360) * 1440); // 0-1440 minutes (24 hours)
    
    this.currentValue = value;
    this.updateCircle(value);
  }

  handleCircleClick(e) {
    const container = this.shadowRoot.getElementById('timer-container');
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const angle = this.calculateAngle(centerX, centerY, e.clientX, e.clientY);
    const value = Math.round((angle / 360) * 1440);
    
    this.setValue(value);
  }

  calculateAngle(centerX, centerY, pointX, pointY) {
    const dx = pointX - centerX;
    const dy = pointY - centerY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = angle + 90; // Adjust for starting at top
    if (angle < 0) angle += 360;
    return angle;
  }

  updateCircle(value) {
    const valueElement = this.shadowRoot.getElementById('timer-value');
    const progressCircle = this.shadowRoot.getElementById('timer-progress');
    const handle = this.shadowRoot.getElementById('timer-handle');
    
    if (valueElement) {
      valueElement.textContent = Math.round(value);
    }
    
    // Update progress circle
    const circumference = 2 * Math.PI * 135;
    const progress = (value / 1440) * circumference;
    progressCircle.style.strokeDasharray = `${circumference}`;
    progressCircle.style.strokeDashoffset = `${circumference - progress}`;
    
    // Update handle position
    const angle = (value / 1440) * 360;
    const radians = (angle - 90) * (Math.PI / 180);
    const radius = 135;
    const x = 150 + radius * Math.cos(radians);
    const y = 150 + radius * Math.sin(radians);
    
    handle.style.left = `${x}px`;
    handle.style.top = `${y}px`;
    handle.style.transform = 'translate(-50%, -50%)';
  }

  setValue(value) {
    const entity = this.config.entity;
    this._hass.callService('input_number', 'set_value', {
      entity_id: entity,
      value: value
    });
    this.currentValue = value;
    this.updateCircle(value);
  }

  saveValue() {
    const entity = this.config.entity;
    this._hass.callService('input_number', 'set_value', {
      entity_id: entity,
      value: this.currentValue
    });
  }

  updateState() {
    const entity = this.config.entity;
    const state = this._hass.states[entity];
    
    if (!state) return;

    const value = parseFloat(state.state) || 0;
    this.currentValue = value;
    this.updateCircle(value);
  }

  getCardSize() {
    return 6;
  }
}

customElements.define('hourly-timer-card', HourlyTimerCard);

// Register the card with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'hourly-timer-card',
  name: 'Hourly Timer Card',
  description: 'A circular timer card for Home Assistant',
  preview: true,
});

console.info(
  '%c HOURLY-TIMER-CARD %c v1.0.0 ',
  'color: white; background: #03a9f4; font-weight: 700;',
  'color: #03a9f4; background: white; font-weight: 700;'
);
