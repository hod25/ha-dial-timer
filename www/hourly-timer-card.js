/**
 * Hourly Timer Card for Home Assistant
 * A circular timer card with RTL support for Hebrew
 */

class HourlyTimerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
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
    const title = this.config.title || 'טיימר שעתי';
    
    card.innerHTML = `
      <style>
        .timer-card {
          padding: 20px;
          text-align: center;
          direction: rtl;
        }
        .timer-title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
          color: var(--primary-text-color);
        }
        .timer-container {
          position: relative;
          width: 300px;
          height: 300px;
          margin: 0 auto;
        }
        .timer-circle {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 20px solid var(--primary-color);
          background: var(--card-background-color);
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .timer-circle:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 16px rgba(0,0,0,0.2);
        }
        .timer-value {
          font-size: 48px;
          font-weight: bold;
          color: var(--primary-text-color);
        }
        .timer-unit {
          font-size: 18px;
          color: var(--secondary-text-color);
          margin-top: 10px;
        }
        .timer-buttons {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 20px;
        }
        .timer-button {
          padding: 10px 20px;
          font-size: 16px;
          border: none;
          border-radius: 8px;
          background: var(--primary-color);
          color: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .timer-button:hover {
          background: var(--primary-color-dark);
          transform: translateY(-2px);
        }
        .timer-button:active {
          transform: translateY(0);
        }
        .timer-slider {
          width: 80%;
          margin: 20px auto;
        }
        input[type="range"] {
          width: 100%;
          height: 8px;
          border-radius: 5px;
          background: var(--primary-color);
          outline: none;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        input[type="range"]:hover {
          opacity: 1;
        }
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background: var(--primary-color);
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 25px;
          height: 25px;
          border-radius: 50%;
          background: var(--primary-color);
          cursor: pointer;
        }
      </style>
      <div class="timer-card">
        <div class="timer-title">${title}</div>
        <div class="timer-container">
          <div class="timer-circle" id="timer-circle">
            <div>
              <div class="timer-value" id="timer-value">0</div>
              <div class="timer-unit">דקות</div>
            </div>
          </div>
        </div>
        <div class="timer-slider">
          <input type="range" id="timer-slider" min="0" max="1440" step="1" value="0">
        </div>
        <div class="timer-buttons">
          <button class="timer-button" id="btn-15">15 דק׳</button>
          <button class="timer-button" id="btn-30">30 דק׳</button>
          <button class="timer-button" id="btn-60">60 דק׳</button>
          <button class="timer-button" id="btn-reset">איפוס</button>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(card);
    this.content = this.shadowRoot.querySelector('.timer-card');
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    const slider = this.shadowRoot.getElementById('timer-slider');
    const btn15 = this.shadowRoot.getElementById('btn-15');
    const btn30 = this.shadowRoot.getElementById('btn-30');
    const btn60 = this.shadowRoot.getElementById('btn-60');
    const btnReset = this.shadowRoot.getElementById('btn-reset');

    slider.addEventListener('input', (e) => {
      this.setValue(parseInt(e.target.value));
    });

    btn15.addEventListener('click', () => this.setValue(15));
    btn30.addEventListener('click', () => this.setValue(30));
    btn60.addEventListener('click', () => this.setValue(60));
    btnReset.addEventListener('click', () => this.setValue(0));
  }

  setValue(value) {
    const entity = this.config.entity;
    this._hass.callService('input_number', 'set_value', {
      entity_id: entity,
      value: value
    });
  }

  updateState() {
    const entity = this.config.entity;
    const state = this._hass.states[entity];
    
    if (!state) return;

    const value = parseFloat(state.state) || 0;
    const valueElement = this.shadowRoot.getElementById('timer-value');
    const sliderElement = this.shadowRoot.getElementById('timer-slider');
    
    if (valueElement) {
      valueElement.textContent = Math.round(value);
    }
    
    if (sliderElement) {
      sliderElement.value = value;
    }
  }

  getCardSize() {
    return 5;
  }
}

customElements.define('hourly-timer-card', HourlyTimerCard);

// Register the card with Home Assistant
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'hourly-timer-card',
  name: 'Hourly Timer Card',
  description: 'A circular timer card with Hebrew RTL support',
  preview: true,
});

console.info(
  '%c HOURLY-TIMER-CARD %c v1.0.0 ',
  'color: white; background: #03a9f4; font-weight: 700;',
  'color: #03a9f4; background: white; font-weight: 700;'
);
