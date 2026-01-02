# ðŸš€ ×“×•×’×ž××•×ª ×©×™×ž×•×© ×ž×ª×§×“×ž×•×ª

## ×ª×¨×—×™×©×™× × ×¤×•×¦×™×

### 1ï¸âƒ£ ×“×•×“ ×—×©×ž×œ×™ ×¢× ×”×ª×¨××•×ª

**config_flow**: ×”×•×¡×£ ×˜×™×™×ž×¨ ×œ×“×•×“
**automation.yaml**: ×”×•×¡×£ ×”×ª×¨××•×ª

```yaml
automation:
  - alias: "×”×ª×¨××” - ×“×•×“ ×”×ª×—×™×œ"
    trigger:
      - platform: state
        entity_id: switch.boiler
        to: "on"
    action:
      - service: notify.mobile_app
        data:
          title: "ðŸ”¥ ×“×•×“ ×”×•×¤×¢×œ"
          message: "×”×“×•×“ ×™×›×‘×” ××•×˜×•×ž×˜×™×ª ×‘×¢×•×“ {{ states('input_number.boiler_duration') | int }} ×“×§×•×ª"

  - alias: "×”×ª×¨××” - ×“×•×“ ×›×‘×”"
    trigger:
      - platform: state
        entity_id: switch.boiler
        to: "off"
    action:
      - service: notify.mobile_app
        data:
          title: "âœ… ×“×•×“ ×›×‘×”"
          message: "×”×“×•×“ ×›×‘×” ××•×˜×•×ž×˜×™×ª"
```

---

### 2ï¸âƒ£ ×ª××•×¨×” ×¢× ×—×™×©×•×‘ ×–×ž×Ÿ ×¢×“ ×©×§×™×¢×”

```yaml
automation:
  - alias: "×ª××•×¨×” ××•×˜×•×ž×˜×™×ª ×‘×©×§×™×¢×”"
    trigger:
      - platform: sun
        event: sunset
        offset: "-00:30:00"
    action:
      - service: input_number.set_value
        target:
          entity_id: input_number.garden_light_duration
        data:
          value: 240  # 4 ×©×¢×•×ª
```

**×›×¨×˜×™×¡ ×ž×•×ª××**:
```yaml
type: vertical-stack
cards:
  - type: custom:hourly-timer-card
    entity: input_number.garden_light_duration
    title: ðŸ’¡ ×ª××•×¨×ª ×’×™× ×”
  - type: sensor
    entity: sensor.sun_next_setting
    name: ×©×§×™×¢×” ×”×‘××”
```

---

### 3ï¸âƒ£ ×ž×–×’×Ÿ ×—×›× ×¢× ×‘×“×™×§×ª ×˜×ž×¤×¨×˜×•×¨×”

```yaml
automation:
  - alias: "×ž×–×’×Ÿ - ×‘×“×•×§ ×˜×ž×¤×¨×˜×•×¨×”"
    trigger:
      - platform: numeric_state
        entity_id: sensor.living_room_temperature
        above: 26
    action:
      - service: input_number.set_value
        target:
          entity_id: input_number.ac_duration
        data:
          value: 120  # 2 ×©×¢×•×ª

  - alias: "×ž×–×’×Ÿ - ×›×‘×” ×× ×§×¨×™×¨"
    trigger:
      - platform: numeric_state
        entity_id: sensor.living_room_temperature
        below: 23
    condition:
      - condition: state
        entity_id: climate.ac
        state: "cool"
    action:
      - service: input_number.set_value
        target:
          entity_id: input_number.ac_duration
        data:
          value: 0  # ×›×™×‘×•×™ ×ž×™×™×“×™
```

---

### 4ï¸âƒ£ ×”×©×§×™×” ×¢× ×‘×“×™×§×ª ×œ×—×•×ª ××“×ž×”

```yaml
automation:
  - alias: "×”×©×§×™×” ××•×˜×•×ž×˜×™×ª"
    trigger:
      - platform: time
        at: "06:00:00"
    condition:
      - condition: numeric_state
        entity_id: sensor.soil_moisture
        below: 30
    action:
      - service: input_number.set_value
        target:
          entity_id: input_number.irrigation_duration
        data:
          value: 15  # 15 ×“×§×•×ª
```

---

### 5ï¸âƒ£ ×ž××•×•×¨×¨ ×¢× ×©×œ×™×˜×” ×§×•×œ×™×ª

**configuration.yaml**:
```yaml
intent_script:
  ActivateFan:
    speech:
      text: "×ž×¤×¢×™×œ ×ž××•×•×¨×¨ ×œ-{{ duration }} ×“×§×•×ª"
    action:
      - service: input_number.set_value
        target:
          entity_id: input_number.fan_duration
        data:
          value: "{{ duration }}"
```

---

## ðŸŽ¨ ×”×ª××ž×•×ª UI ×ž×ª×§×“×ž×•×ª

### ×›×¨×˜×™×¡ ×¢× ×ª×ž×•× ×ª ×¨×§×¢

```yaml
type: custom:hourly-timer-card
entity: input_number.boiler_duration
title: ×˜×™×™×ž×¨ ×“×•×“
card_mod:
  style: |
    ha-card {
      background: url('/local/images/boiler-bg.jpg');
      background-size: cover;
    }
```

### ×›×¨×˜×™×¡ ×¢× ×¦×‘×¢×™× ×“×™× ×ž×™×™×

```yaml
type: custom:stack-in-card
cards:
  - type: custom:hourly-timer-card
    entity: input_number.boiler_duration
    title: ×˜×™×™×ž×¨ ×“×•×“
    card_mod:
      style: |
        ha-card {
          {% if is_state('switch.boiler', 'on') %}
            border: 3px solid red;
          {% else %}
            border: 3px solid gray;
          {% endif %}
        }
```

---

## ðŸ“Š Dashboard ×ž×œ×

```yaml
title: ×©×œ×™×˜×” ×‘×˜×™×™×ž×¨×™×
views:
  - title: ×‘×™×ª
    cards:
      - type: vertical-stack
        cards:
          - type: markdown
            content: |
              # ðŸ  × ×™×”×•×œ ×˜×™×™×ž×¨×™×
              ×©×œ×™×˜×” ×ž×¨×›×–×™×ª ×‘×›×œ ×”×ž×›×©×™×¨×™×
          
          - type: horizontal-stack
            cards:
              - type: custom:hourly-timer-card
                entity: input_number.boiler_duration
                title: ×“×•×“
              - type: custom:hourly-timer-card
                entity: input_number.ac_duration
                title: ×ž×–×’×Ÿ
          
          - type: horizontal-stack
            cards:
              - type: custom:hourly-timer-card
                entity: input_number.fan_duration
                title: ×ž××•×•×¨×¨
              - type: custom:hourly-timer-card
                entity: input_number.garden_light_duration
                title: ×ª××•×¨×”
```

---

## ðŸ”” ×”×ª×¨××•×ª ×ž×ª×§×“×ž×•×ª

### ×”×ª×¨××” 5 ×“×§×•×ª ×œ×¤× ×™ ×›×™×‘×•×™

```yaml
automation:
  - alias: "×”×ª×¨××” ×œ×¤× ×™ ×›×™×‘×•×™"
    trigger:
      - platform: template
        value_template: >
          {% set entity = 'input_number.boiler_duration' %}
          {% set remaining = states(entity) | float %}
          {{ remaining == 5 }}
    action:
      - service: notify.mobile_app
        data:
          title: "â° ×”×ª×¨××”"
          message: "×”×“×•×“ ×™×›×‘×” ×‘×¢×•×“ 5 ×“×§×•×ª"
```

---

## ðŸŒŸ ×˜×™×¤×™× ×ž×§×¦×•×¢×™×™×

### 1. ×©×ž×™×¨×ª ×¢×¨×›×™× ××—×¨×•× ×™×

```yaml
automation:
  - alias: "×©×ž×•×¨ ×¢×¨×š ××—×¨×•×Ÿ ×©×œ ×˜×™×™×ž×¨"
    trigger:
      - platform: state
        entity_id: input_number.boiler_duration
    action:
      - service: input_text.set_value
        target:
          entity_id: input_text.boiler_last_duration
        data:
          value: "{{ trigger.to_state.state }}"
```

### 2. ×”×™×¡×˜×•×¨×™×” ×©×œ ×©×™×ž×•×©

```yaml
sensor:
  - platform: history_stats
    name: "×©×¢×•×ª ×“×•×“ ×”×™×•×"
    entity_id: switch.boiler
    state: "on"
    type: time
    start: "{{ now().replace(hour=0, minute=0, second=0) }}"
    end: "{{ now() }}"
```

### 3. ×—×™×¡×›×•×Ÿ ×‘×× ×¨×’×™×”

```yaml
automation:
  - alias: "×”×ª×¨××ª ×—×¨×™×’×” ×‘×–×ž×Ÿ"
    trigger:
      - platform: numeric_state
        entity_id: sensor.boiler_on_time_today
        above: 3  # ×ž×¢×œ 3 ×©×¢×•×ª
    action:
      - service: notify.mobile_app
        data:
          title: "âš ï¸ ×—×¨×™×’×” ×‘×¦×¨×™×›×”"
          message: "×”×“×•×“ ×¤×¢×œ ×”×™×•× {{ states('sensor.boiler_on_time_today') }} ×©×¢×•×ª"
```

---

**×¢×•×“ ×©××œ×•×ª? ×¤×ª×— [Issue](https://github.com/hod25/hourly-timer-integration/issues)**
