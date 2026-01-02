# âš¡ ×”×ª×—×œ×” ×ž×”×™×¨×” - Quick Start

## ðŸ“¦ ×”×ª×§× ×” ×‘-3 ×©×œ×‘×™×

### 1ï¸âƒ£ ×”×ª×§×Ÿ ×“×¨×š HACS
```
HACS â†’ â‹® â†’ Custom repositories
×”×•×¡×£: https://github.com/hod25/hourly-timer-integration
×§×˜×’×•×¨×™×”: Integration
```

### 2ï¸âƒ£ ×”×•×¡×£ ××™× ×˜×’×¨×¦×™×”
```
×”×’×“×¨×•×ª â†’ ××™× ×˜×’×¨×¦×™×•×ª â†’ + ×”×•×¡×£
×—×¤×©: "Hourly Timer"
×‘×—×¨ ×™×©×•×ª (switch/light/fan)
```

### 3ï¸âƒ£ ×”×•×¡×£ ×›×¨×˜×™×¡
```yaml
type: custom:hourly-timer-card
entity: input_number.[device]_duration
title: ×˜×™×™×ž×¨
```

---

## ðŸš€ ×“×•×’×ž×” ×ž×”×™×¨×” - ×“×•×“ ×—×©×ž×œ×™

```yaml
# 1. ×”×•×¡×£ ×˜×™×™×ž×¨ ×œ×“×•×“
×”×’×“×¨×•×ª â†’ ××™× ×˜×’×¨×¦×™×•×ª â†’ Hourly Timer
×‘×—×¨: switch.boiler

# 2. ×”×•×¡×£ ×›×¨×˜×™×¡
type: custom:hourly-timer-card
entity: input_number.boiler_duration
title: ðŸ”¥ ×˜×™×™×ž×¨ ×“×•×“
```

**×–×”×•! ×¢×•×‘×“! ðŸŽ‰**

---

## ðŸ“– ×ž×¡×ž×›×™× × ×•×¡×¤×™×

- ðŸ“˜ [README.md](README.md) - ×ª×™××•×¨ ×ž×œ×
- ðŸ”§ [INSTALLATION.md](INSTALLATION.md) - ×ž×“×¨×™×š ×”×ª×§× ×”
- ðŸ’¡ [EXAMPLES.md](EXAMPLES.md) - ×“×•×’×ž××•×ª ×ž×ª×§×“×ž×•×ª
- ðŸš€ [DISTRIBUTION.md](DISTRIBUTION.md) - ×”×¤×¦×” ×‘-GitHub
- ðŸŽ¨ [VISUAL_GUIDE.md](VISUAL_GUIDE.md) - ×ž×“×¨×™×š ×•×™×–×•××œ×™

---

## ðŸ†˜ ×¢×–×¨×” ×ž×”×™×¨×”

### ×”×›×¨×˜×™×¡ ×œ× ×ž×•×¤×™×¢?
```
1. × ×§×” cache (Ctrl+Shift+R)
2. ×”×•×¡×£ resource ×™×“× ×™×ª:
   ×”×’×“×¨×•×ª â†’ ×œ×•×—×•×ª ×‘×§×¨×” â†’ ×ž×©××‘×™×
   URL: /local/hourly-timer-card.js
```

### ×”××•×˜×•×ž×¦×™×” ×œ× ×¢×•×‘×“×ª?
```
1. ×‘×“×•×§: ×”×’×“×¨×•×ª â†’ ××•×˜×•×ž×¦×™×•×ª
2. ×—×¤×©: "×˜×™×™×ž×¨ ×©×¢×ª×™ - [×©×]"
3. ×•×“× ×©×”×™× ×ž×•×¤×¢×œ×ª (toggle ON)
```

### ×™×©×•×ª ×œ× × ×•×¦×¨×”?
```
1. ×‘×“×•×§: ×”×’×“×¨×•×ª â†’ ×™×©×•×™×•×ª
2. ×—×¤×©: input_number.[device]_duration
3. ×× ×œ× ×§×™×™×, ××ª×—×œ Home Assistant
```

---

## âš™ï¸ ×”×’×“×¨×•×ª ×ž×”×™×¨×•×ª

### ×©×™× ×•×™ ×–×ž×Ÿ ×ž×§×¡×™×ž×œ×™
`const.py`:
```python
MAX_DURATION = 720  # 12 ×©×¢×•×ª ×‘×ž×§×•× 24
```

### ×”×•×¡×¤×ª ×œ×—×¦×Ÿ 90 ×“×§×•×ª
`hourly-timer-card.js`:
```javascript
<button id="btn-90">90 ×“×§×³</button>
btn90.addEventListener('click', () => this.setValue(90));
```

---

## ðŸŽ¯ ×©×™×ž×•×©×™× ×¤×•×¤×•×œ×¨×™×™×

| ×ž×›×©×™×¨ | ×–×ž×Ÿ × ×¤×•×¥ | entity |
|-------|----------|--------|
| ×“×•×“ | 60 ×“×§×³ | switch.boiler |
| ×ž×–×’×Ÿ | 120 ×“×§×³ | climate.ac |
| ×ž××•×•×¨×¨ | 30 ×“×§×³ | fan.bedroom |
| ×ª××•×¨×” | 240 ×“×§×³ | light.garden |
| ×”×©×§×™×” | 15 ×“×§×³ | switch.irrigation |

---

## ðŸ’» ×§×•×“ ×ž×™× ×™×ž×œ×™

```yaml
# ×”×›×™ ×¤×©×•×˜ ×©×™×©
type: custom:hourly-timer-card
entity: input_number.boiler_duration
```

---

## ðŸ”— ×§×™×©×•×¨×™× ×©×™×ž×•×©×™×™×

- [GitHub Repo](https://github.com/hod25/hourly-timer-integration)
- [Issues](https://github.com/hod25/hourly-timer-integration/issues)
- [×”×§×”×™×œ×” ×”×¢×‘×¨×™×ª](https://community.home-assistant.io)

---

**×–×§×•×§ ×œ×¢×–×¨×”? ×¤×ª×— [Issue](https://github.com/hod25/hourly-timer-integration/issues)** ðŸ’¬
