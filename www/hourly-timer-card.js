/**
 * Hourly Timer Card for Home Assistant
 * A simple timer card with long-press slider modal
 */

class HourlyTimerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.isDragging = false;
    this.currentValue = 0;
    this.longPressTimer = null;
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
    const title = this.config.title || 'Timer';
    
    card.innerHTML = `
      <style>
        .timer-card {
          padding: 20px;
        }
        .timer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .timer-title {
          font-size: 18px;
          font-weight: bold;
          color: var(--primary-text-color);
        }
        .timer-display {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 30px;
          border-radius: 12px;
          background: var(--card-background-color);
          border: 2px solid var(--primary-color);
          cursor: pointer;
          user-select: none;
          transition: all 0.3s ease;
        }
        .timer-display:hover {
          background: var(--primary-color);
          opacity: 0.9;
        }
        .timer-display:active {
          transform: scale(0.95);
        }
        .timer-value-big {
          font-size: 64px;
          font-weight: bold;
          color: var(--primary-text-color);
          line-height: 1;
        }
        .timer-unit-big {
          font-size: 24px;
          color: var(--secondary-text-color);
          margin-left: 10px;
        }

        /* Modal styles */
        .modal {
          display: none;
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.5);
          animation: fadeIn 0.3s ease;
        }
        .modal.show {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal-content {
          background: var(--card-background-color);
          border-radius: 16px;
          padding: 30px 20px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .modal-header {
          text-align: center;
          margin-bottom: 20px;
        }
        .modal-title {
          font-size: 20px;
          font-weight: bold;
          color: var(--primary-text-color);
        }
        .timer-container {
          position: relative;
          width: 280px;
          height: 280px;
          margin: 0 auto 30px;
        }
        .timer-svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
        }
        .timer-track {
          fill: none;
          stroke: var(--disabled-text-color);
          stroke-width: 12;
          opacity: 0.3;
        }
        .timer-progress {
          fill: none;
          stroke: var(--primary-color);
          stroke-width: 12;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.1s ease;
        }
        .timer-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          text-align: center;
        }
        .timer-center-value {
          font-size: 56px;
          font-weight: bold;
          color: var(--primary-text-color);
          line-height: 1;
        }
        .timer-center-unit {
          font-size: 16px;
          color: var(--secondary-text-color);
          margin-top: 5px;
        }
        .timer-handle {
          position: absolute;
          width: 28px;
          height: 28px;
          background: var(--primary-color);
          border: 4px solid var(--card-background-color);
          border-radius: 50%;
          cursor: grab;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          z-index: 10;
        }
        .timer-handle:hover {
          transform: scale(1.2);
        }
        .timer-handle:active {
          cursor: grabbing;
          transform: scale(1.3);
        }
        .modal-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
        }
        .modal-button {
          padding: 12px 24px;
          font-size: 16px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          flex: 1;
        }
        .btn-confirm {
          background: var(--primary-color);
          color: white;
          font-weight: bold;
        }
        .btn-confirm:hover {
          opacity: 0.9;
          transform: translateY(-2px);
        }
        .btn-cancel {
          background: var(--disabled-text-color);
          color: var(--primary-text-color);
          opacity: 0.5;
        }
        .btn-cancel:hover {
          opacity: 0.7;
        }
      </style>

      <div class="timer-card">
        <div class="timer-header">
          <div class="timer-title">${title}</div>
        </div>
        <div class="timer-display" id="timer-display">
          <div class="timer-value-big" id="timer-value-display">0</div>
          <div class="timer-unit-big">min</div>
        </div>
      </div>

      <!-- Modal for circular slider -->
      <div class="modal" id="timer-modal">
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-title">Set Timer Duration</div>
          </div>
          
          <div class="timer-container" id="timer-container">
            <svg class="timer-svg" viewBox="0 0 280 280">
              <circle class="timer-track" cx="140" cy="140" r="120" />
              <circle class="timer-progress" id="timer-progress" cx="140" cy="140" r="120" />
            </svg>
            <div class="timer-center">
              <div class="timer-center-value" id="timer-value-modal">0</div>
              <div class="timer-center-unit">min</div>
            </div>
            <div class="timer-handle" id="timer-handle"></div>
          </div>

          <div class="modal-buttons">
            <button class="modal-button btn-confirm" id="btn-confirm">Confirm</button>
            <button class="modal-button btn-cancel" id="btn-cancel">Cancel</button>
          </div>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(card);
    this.content = this.shadowRoot.querySelector('.timer-card');
    this.modal = this.shadowRoot.getElementById('timer-modal');
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    const display = this.shadowRoot.getElementById('timer-display');
    const handle = this.shadowRoot.getElementById('timer-handle');
    const container = this.shadowRoot.getElementById('timer-container');
    const modal = this.modal;
    const btnConfirm = this.shadowRoot.getElementById('btn-confirm');
    const btnCancel = this.shadowRoot.getElementById('btn-cancel');

    // Long press on display
    display.addEventListener('mousedown', () => this.startLongPress());
    display.addEventListener('touchstart', () => this.startLongPress());
    display.addEventListener('mouseup', () => this.stopLongPress());
    display.addEventListener('touchend', () => this.stopLongPress());
    display.addEventListener('mouseleave', () => this.stopLongPress());
    display.addEventListener('touchcancel', () => this.stopLongPress());

    // Drag events for handle
    handle.addEventListener('mousedown', (e) => this.startDrag(e));
    handle.addEventListener('touchstart', (e) => this.startDrag(e));
    
    document.addEventListener('mousemove', (e) => this.onDrag(e));
    document.addEventListener('touchmove', (e) => this.onDrag(e));
    
    document.addEventListener('mouseup', () => this.stopDrag());
    document.addEventListener('touchend', () => this.stopDrag());

    // Click on circle
    container.addEventListener('click', (e) => {
      if (e.target === handle) return;
      this.handleCircleClick(e);
    });

    // Modal buttons
    btnConfirm.addEventListener('click', () => this.confirmValue());
    btnCancel.addEventListener('click', () => this.closeModal());

    // Close modal on outside click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal();
    });
  }

  startLongPress() {
    this.longPressTimer = setTimeout(() => {
      this.openModal();
    }, 500);
  }

  stopLongPress() {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
  }

  openModal() {
    this.modal.classList.add('show');
    const entity = this.config.entity;
    const state = this._hass.states[entity];
    const value = state ? parseFloat(state.state) || 0 : 0;
    this.currentValue = value;
    this.updateCircle(value);
  }

  closeModal() {
    this.modal.classList.remove('show');
  }

  confirmValue() {
    this.setValue(this.currentValue);
    this.closeModal();
  }

  startDrag(e) {
    e.preventDefault();
    this.isDragging = true;
  }

  stopDrag() {
    this.isDragging = false;
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
    const value = Math.round((angle / 360) * 1440);
    
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
    
    this.currentValue = value;
    this.updateCircle(value);
  }

  calculateAngle(centerX, centerY, pointX, pointY) {
    const dx = pointX - centerX;
    const dy = pointY - centerY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    angle = angle + 90;
    if (angle < 0) angle += 360;
    return angle;
  }

  updateCircle(value) {
    const valueModal = this.shadowRoot.getElementById('timer-value-modal');
    const progressCircle = this.shadowRoot.getElementById('timer-progress');
    const handle = this.shadowRoot.getElementById('timer-handle');
    
    if (valueModal) {
      valueModal.textContent = Math.round(value);
    }
    
    // Update progress circle
    const circumference = 2 * Math.PI * 120;
    const progress = (value / 1440) * circumference;
    progressCircle.style.strokeDasharray = `${circumference}`;
    progressCircle.style.strokeDashoffset = `${circumference - progress}`;
    
    // Update handle position
    const angle = (value / 1440) * 360;
    const radians = (angle - 90) * (Math.PI / 180);
    const radius = 120;
    const x = 140 + radius * Math.cos(radians);
    const y = 140 + radius * Math.sin(radians);
    
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
    this.updateDisplay(value);
  }

  updateDisplay(value) {
    const displayValue = this.shadowRoot.getElementById('timer-value-display');
    if (displayValue) {
      displayValue.textContent = Math.round(value);
    }
  }

  updateState() {
    const entity = this.config.entity;
    const state = this._hass.states[entity];
    
    if (!state) return;

    const value = parseFloat(state.state) || 0;
    this.currentValue = value;
    this.updateDisplay(value);
  }

  getCardSize() {
    return 3;
  }
}

customElements.define('hourly-timer-card', HourlyTimerCard);

// Register the card with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'hourly-timer-card',
  name: 'Hourly Timer Card',
  description: 'A timer card with long-press slider modal',
  preview: true,
});

console.info(
  '%c HOURLY-TIMER-CARD %c v2.0.0 ',
  'color: white; background: #03a9f4; font-weight: 700;',
  'color: #03a9f4; background: white; font-weight: 700;'
);

  setValue(value) {
    const entity = this.config.entity;
    this._hass.callService('input_number', 'set_value', {
      entity_id: entity,
      value: value
    });
    this.currentValue = value;
    this.updateDisplay(value);
  }

  updateDisplay(value) {
    const displayValue = this.shadowRoot.getElementById('timer-value-display');
    if (displayValue) {
      displayValue.textContent = Math.round(value);
    }
  }

  updateState() {
    const entity = this.config.entity;
    const state = this._hass.states[entity];
    
    if (!state) return;

    const value = parseFloat(state.state) || 0;
    this.currentValue = value;
    this.updateDisplay(value);
  }

  getCardSize() {
    return 3;
  }
}

customElements.define('hourly-timer-card', HourlyTimerCard);

// Register the card with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'hourly-timer-card',
  name: 'Hourly Timer Card',
  description: 'A timer card with long-press slider modal',
  preview: true,
});

console.info(
  '%c HOURLY-TIMER-CARD %c v2.0.0 ',
  'color: white; background: #03a9f4; font-weight: 700;',
  'color: #03a9f4; background: white; font-weight: 700;'
);
