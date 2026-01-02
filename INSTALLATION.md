# 📖 Installation & Usage Guide - Hourly Timer Integration

## 📥 Step 1: Installation

### Option A: Via HACS (Recommended)

1. **Open HACS**
   - Go to your Home Assistant interface
   - Click on **HACS** in the sidebar

2. **Add Custom Repository**
   - Click the ⋮ (three dots) button in the top right corner
   - Select **Custom repositories**

3. **Add the Repository**
   - In the Repository field, paste:
     ```
     https://github.com/hod25/hourly-timer-integration
     ```
   - Select category: **Integration**
   - Click **Add**

4. **Install the Integration**
   - Search for "Hourly Timer" in the list
   - Click on the integration
   - Click **Download**
   - **Restart Home Assistant**

### Option B: Manual Installation

1. **Download the Files**
   - Download the entire folder from GitHub
   
2. **Copy to custom_components Directory**
   - Copy `custom_components/hourly_timer` to:
     ```
     /config/custom_components/hourly_timer/
     ```

3. **Copy the Frontend Card**
   - Copy `www/hourly-timer-card.js` to:
     ```
     /config/www/hourly-timer-card.js
     ```

4. **Add Resource to Lovelace**
   - Go to **Settings** → **Dashboards** → **⋮** → **Resources**
   - Click **+ Add Resource**
   - URL: `/local/hourly-timer-card.js`
   - Resource type: **JavaScript Module**
   - Save

5. **Restart Home Assistant**

---

## 🎯 Step 2: Adding a Timer to a Device

### Creating a New Timer

1. **Go to Settings**
   - **Settings** → **Devices & Services**

2. **Add Integration**
   - Click **+ Add Integration**
   - Search for **Hourly Timer**

3. **Select Entity**
   - Choose the entity you want to control
   - Supports: `switch`, `light`, `fan`, `climate`
   - Example: `switch.boiler`

4. **Setup Complete**
   - The integration will automatically create:
     - ✅ `input_number.boiler_duration` - Entity to control timer duration
     - ✅ **Everything works automatically!** No need to add manual automations
   
   **How does it work?**
   - When you change the value in input_number (via the card):
     - Entity turns on immediately ⚡
     - Internal timer starts counting ⏱️
     - After X minutes - entity turns off automatically 🔄
     - Value resets to 0 ✅

---

## 🖼 Step 3: Adding the Card

### Add to Dashboard

1. **Edit Dashboard**
   - Open the desired dashboard
   - Click ⋮ (three dots) → **Edit Dashboard**

2. **Add New Card**
   - Click **+ Add Card**
   - Scroll down and select **Manual**

3. **Paste the Code**
   ```yaml
   type: custom:hourly-timer-card
   entity: input_number.boiler_duration
   title: Boiler Timer
   ```

4. **Save**
   - Click **Save**
   - Exit edit mode

---

## 💡 Ready-to-Use Examples

### Electric Boiler
```yaml
type: custom:hourly-timer-card
entity: input_number.boiler_duration
title: 🔥 Boiler Timer
```

### Fan
```yaml
type: custom:hourly-timer-card
entity: input_number.fan_duration
title: 🌀 Fan Timer
```

### Outdoor Lights
```yaml
type: custom:hourly-timer-card
entity: input_number.garden_light_duration
title: 💡 Garden Lights
```

### Air Conditioner
```yaml
type: custom:hourly-timer-card
entity: input_number.ac_duration
title: ❄️ AC Timer
```

---

## 🔧 Troubleshooting

### Card Not Showing

1. **Check Resource is Added**
   - Go to: Settings → Dashboards → Resources
   - Verify exists: `/local/hourly-timer-card.js`

2. **Clear Browser Cache**
   - Ctrl + Shift + R (Windows)
   - Cmd + Shift + R (Mac)

3. **Check Developer Tools**
   - F12 → Console
   - Look for JavaScript errors

### Timer Not Working

**Note:** The integration works without external automations! Everything is managed internally.

1. **Check input_number Exists**
   - Go to: Settings → Devices & Services → Entities
   - Search: `input_number.[device_name]_duration`

2. **Check Logs**
   - Developer Tools → Logs
   - Look for messages from `hourly_timer`

3. **Restart Home Assistant**
   - Sometimes a restart is needed after initial installation

### Card Not Responding

1. **Refresh the Page**
   - F5 or Ctrl + R

2. **Check Entity ID**
   - Verify the entity ID is correct in YAML

3. **Check Permissions**
   - Ensure you have permissions to change the input_number

---

## 🎨 Customization

### Change Colors

Edit the file `www/hourly-timer-card.js` and change:

```css
--primary-color: #03a9f4;        /* Primary color */
--primary-text-color: #212121;   /* Text color */
--card-background-color: #ffffff; /* Card background */
```

### Change Time Range

Edit the file `const.py`:

```python
MAX_DURATION = 1440  # Change to 720 for 12 hours
MIN_DURATION = 0     # Minimum
STEP = 1            # Step size (in minutes)
```

---

## 📞 Support

Need help?

- 💬 Open an [Issue on GitHub](https://github.com/hod25/hourly-timer-integration/issues)
- 📖 Read the [Full Documentation](https://github.com/hod25/hourly-timer-integration)
- 🤝 Join the [Discussions](https://github.com/hod25/hourly-timer-integration/discussions)

---

**Good luck! 🎉**
