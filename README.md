# 🕐 Hourly Timer Integration for Home Assistant

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)
![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2023.1+-blue.svg)

A custom Home Assistant integration that provides visual timer control for any supported entity (switches, lights, fans, etc.) through a circular interactive card.

---

## ✨ Features

- 🎯 **Circular Visual Timer** - Interactive card with slider and quick action buttons
- ⚡ **Wide Support** - Works with switch, light, fan, and climate entities
- 🔄 **Fully Automatic** - No external automations needed - everything handled internally
- 🌐 **Multi-language** - English and Hebrew translations included
- 📱 **Mobile Friendly** - Responsive design for mobile devices
- 🎛️ **Slider Control** - Range from 0-1440 minutes (24 hours)
- ⚡ **Quick Actions** - Preset buttons (15, 30, 60 minutes)
- 🔘 **Reset Button** - Instant reset functionality

---

## 📦 Installation

### Via HACS (Recommended)

1. Open HACS in Home Assistant
2. Click ⋮ (three dots) in the top right corner
3. Select **Custom repositories**
4. Add this repository:
   ```
   https://github.com/hod25/hourly-timer-integration
   ```
5. Select **Integration** as category
6. Click **Add**
7. Search for "Hourly Timer" and install
8. Restart Home Assistant

### Manual Installation

1. Copy the `custom_components/hourly_timer` folder to your `/config/custom_components/` directory
2. Copy `www/hourly-timer-card.js` to your `/config/www/` directory
3. Add the following to your `configuration.yaml`:
   ```yaml
   lovelace:
     resources:
       - url: /local/hourly-timer-card.js
         type: module
   ```
4. Restart Home Assistant

---

## 🚀 Quick Start

### 1. Add Integration

1. Go to **Settings** → **Devices & Services**
2. Click **+ Add Integration**
3. Search for **Hourly Timer**
4. Select an entity to control (switch, light, fan, climate)
5. Done! The integration creates:
   - `input_number.[device_name]_duration` - Timer duration control
   - Internal logic handles everything automatically

### 2. Add Card to Dashboard

1. Edit your dashboard
2. Click **+ Add Card**
3. Select **Manual** and paste:
   ```yaml
   type: custom:hourly-timer-card
   entity: input_number.device_name_duration
   title: Device Timer
   ```

---

## 💡 Usage Examples

### Electric Boiler
```yaml
type: custom:hourly-timer-card
entity: input_number.boiler_duration
title: 🔥 Boiler Timer
```

### Garden Lights
```yaml
type: custom:hourly-timer-card
entity: input_number.garden_light_duration
title: 💡 Garden Lights
```

### Fan
```yaml
type: custom:hourly-timer-card
entity: input_number.fan_duration
title: 🌀 Fan Timer
```

---

## 🎯 How It Works

```
User sets value in card
       ↓
input_number changes
       ↓
Integration detects change
       ↓
Turns entity ON
       ↓
Waits X minutes
       ↓
Turns entity OFF
       ↓
Resets to 0
```

**Everything happens internally - user just needs to add the integration and use the card!**

---

## 🛠️ Configuration

### Changing Maximum Duration

Edit `const.py`:
```python
MAX_DURATION = 1440  # 24 hours in minutes
```

### Customizing Card Colors

Edit `www/hourly-timer-card.js`:
```css
--primary-color: #03a9f4;        /* Primary color */
--primary-text-color: #212121;   /* Text color */
--card-background-color: #ffffff; /* Background */
```

---

## 📋 Requirements

- Home Assistant 2023.1.0 or newer
- HACS (optional, but recommended)
- Modern browser with ES6 support

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 💡 Support

If you encounter an issue or have a suggestion:

- Open an [Issue](https://github.com/hod25/hourly-timer-integration/issues)
- Start a [Discussion](https://github.com/hod25/hourly-timer-integration/discussions)

---

## 🎯 Common Use Cases

- ⚡ Electric boiler
- 💡 Lighting (indoor/outdoor)
- 🌀 Fans
- ❄️ Air conditioning
- 💦 Irrigation systems
- 🔌 Any switchable device

---

**Made with ❤️ for the Home Assistant Community**
