# ðŸš€ ×ž×“×¨×™×š ×”×¤×¦×” ×‘-GitHub ×•×”×•×¡×¤×” ×œ-HACS

## ðŸ“¤ ×©×œ×‘ 1: ×”×¢×œ××” ×œ-GitHub

### 1.1 ×¦×•×¨ Repository ×—×“×©

1. ×”×™×›× ×¡ ×œ-[GitHub](https://github.com)
2. ×œ×—×¥ ×¢×œ **+** ×‘×¤×™× ×” ×”×™×ž× ×™×ª ×”×¢×œ×™×•× ×”
3. ×‘×—×¨ **New repository**
4. ×ž×œ× ×¤×¨×˜×™×:
   - **Repository name**: `hourly-timer-integration`
   - **Description**: `Hourly Timer Integration for Home Assistant with HACS support`
   - **Public** (×—×•×‘×” ×¢×‘×•×¨ HACS)
   - âœ… Add a README file (×›×‘×¨ ×™×© ×œ× ×•)
   - âœ… Add .gitignore (×›×‘×¨ ×™×© ×œ× ×•)
   - âœ… Choose a license: MIT (×›×‘×¨ ×™×© ×œ× ×•)
5. ×œ×—×¥ **Create repository**

### 1.2 ×”×¢×œ×” ××ª ×”×§×‘×¦×™×

×‘×˜×¨×ž×™× ×œ, ×‘×ª×™×§×™×™×ª ×”×¤×¨×•×™×§×˜:

```bash
# ××ª×—×•×œ Git
git init

# ×”×•×¡×£ ××ª ×›×œ ×”×§×‘×¦×™×
git add .

# Commit ×¨××©×•×Ÿ
git commit -m "Initial commit - Hourly Timer Integration v1.0.0"

# ×§×©×¨ ×œ-GitHub (×”×—×œ×£ hod25)
git remote add origin https://github.com/hod25/hourly-timer-integration.git

# ×”×¢×œ×” ×œ-GitHub
git branch -M main
git push -u origin main
```

### 1.3 ×¦×•×¨ Release

1. ×¢×‘×•×¨ ×œ-repository ×‘-GitHub
2. ×œ×—×¥ ×¢×œ **Releases** â†’ **Create a new release**
3. ×ž×œ× ×¤×¨×˜×™×:
   - **Tag version**: `v1.0.0`
   - **Release title**: `v1.0.0 - Initial Release`
   - **Description**:
     ```markdown
     # ðŸŽ‰ First Release - Hourly Timer Integration
     
     ## âœ¨ Features
     - Circular timer card with RTL support
     - Auto-creation of input_number entities
     - Auto-creation of automations
     - Full Hebrew translation
     - HACS compatible
     
     ## ðŸ“¦ Installation
     Install via HACS or manually. See [README](README.md) for details.
     ```
4. ×œ×—×¥ **Publish release**

---

## ðŸ“¦ ×©×œ×‘ 2: ×”×•×¡×¤×” ×œ-HACS

### 2.1 ×•×™×“×•× ×§×‘×¦×™× × ×“×¨×©×™×

×•×“× ×©×”×§×‘×¦×™× ×”×‘××™× ×§×™×™×ž×™×:
- âœ… `hacs.json`
- âœ… `README.md`
- âœ… `info.md`
- âœ… `custom_components/hourly_timer/manifest.json`

### 2.2 ×”×•×¡×¤×” ×›-Custom Repository (×–×ž× ×™)

**×œ×ž×©×ª×ž×©×™× ×©×œ×š:**

1. ×¤×ª×— Home Assistant
2. ×¢×‘×•×¨ ×œ-**HACS**
3. ×œ×—×¥ ×¢×œ â‹® â†’ **Custom repositories**
4. ×”×•×¡×£:
   - **Repository**: `https://github.com/hod25/hourly-timer-integration`
   - **Category**: Integration
5. ×œ×—×¥ **Add**
6. ×—×¤×© "Hourly Timer" ×•×”×ª×§×Ÿ

### 2.3 ×”×’×©×” ×œ-HACS Default (××•×¤×¦×™×•× ×œ×™)

×× ×¨×•×¦×” ×©×”××™× ×˜×’×¨×¦×™×” ×ª×”×™×” ×–×ž×™× ×” ×œ×›×•×œ× ×‘-HACS:

1. ×¢×‘×•×¨ ×œ-[HACS Default](https://github.com/hacs/default)
2. ×¦×•×¨ **Fork** ×©×œ ×”×¤×¨×•×™×§×˜
3. ×¢×¨×•×š ××ª `integration` (×”×•×¡×£ ××ª ×”-repo ×©×œ×š)
4. ×¤×ª×— **Pull Request**
5. ×”×ž×ª×Ÿ ×œ××™×©×•×¨ (×“×¨×™×©×•×ª: 500+ ×›×•×›×‘×™×, ×ª×™×¢×•×“ ×ž×œ×, ×•×›×•')

---

## ðŸŽ¯ ×©×œ×‘ 3: ×§×™×“×•× ×”×¤×¨×•×™×§×˜

### 3.1 ×ª×™×¢×•×“ ×ž×¦×•×™×Ÿ

- âœ… README ×ž×¤×•×¨×˜
- âœ… Screenshots/GIFs
- âœ… ×“×•×’×ž××•×ª ×§×•×“
- âœ… FAQ
- âœ… Troubleshooting

### 3.2 ×§×”×™×œ×”

**×©×ª×£ ×‘×§×”×™×œ×”:**
- ðŸŒ [Home Assistant Community](https://community.home-assistant.io/)
- ðŸ’¬ ×§×‘×•×¦×•×ª ×¤×™×™×¡×‘×•×§ ×‘×¢×‘×¨×™×ª
- ðŸ“± ×¢×¨×•×¦×™ ×˜×œ×’×¨×
- ðŸŽ¥ ×¡×¨×˜×•× ×™ YouTube

**×¤×•×¨×•×ž×™× ×ž×•×ž×œ×¦×™×:**
- Reddit: r/homeassistant
- Facebook: ×§×‘×•×¦×•×ª Home Assistant ×™×©×¨××œ
- Telegram: Home Assistant IL

### 3.3 Badge ×œ×”×•×¡×¤×” ×œ-README

```markdown
[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://github.com/hod25/hourly-timer-integration)
[![GitHub Release](https://img.shields.io/github/release/hod25/hourly-timer-integration.svg)](https://github.com/hod25/hourly-timer-integration/releases)
[![GitHub Downloads](https://img.shields.io/github/downloads/hod25/hourly-timer-integration/total.svg)](https://github.com/hod25/hourly-timer-integration/releases)
[![Stars](https://img.shields.io/github/stars/hod25/hourly-timer-integration.svg)](https://github.com/hod25/hourly-timer-integration/stargazers)
```

---

## ðŸ”„ ×©×œ×‘ 4: ×¢×“×›×•× ×™× ×¢×ª×™×“×™×™×

### 4.1 ×’×¨×¡×” ×—×“×©×”

×›×©×ž×¢×“×›×Ÿ ××ª ×”×§×•×“:

```bash
# ×•×“× ×©×›×œ ×”×©×™× ×•×™×™× × ×©×ž×¨×•
git add .
git commit -m "feat: add new feature X"
git push

# ×¦×•×¨ ×’×¨×¡×” ×—×“×©×”
git tag v1.1.0
git push --tags
```

### 4.2 ×¦×•×¨ Release ×—×“×© ×‘-GitHub

1. ×¢×‘×•×¨ ×œ-**Releases** â†’ **Draft a new release**
2. ×‘×—×¨ ××ª ×”-tag ×”×—×“×©
3. ×›×ª×•×‘ changelog
4. ×¤×¨×¡×

### 4.3 ×¢×“×›×•×Ÿ CHANGELOG.md

```markdown
## [1.1.0] - 2026-02-01

### Added
- ×ª×›×•× ×” ×—×“×©×” X
- ×©×™×¤×•×¨ Y

### Fixed
- ×ª×™×§×•×Ÿ ×‘××’ Z
```

---

## ðŸ“Š ×©×œ×‘ 5: × ×™×˜×•×¨ ×•×ž×¢×§×‘

### 5.1 GitHub Insights

×¢×§×•×‘ ××—×¨×™:
- â­ Stars
- ðŸ”„ Forks
- ðŸ“¥ Downloads
- ðŸ‘ï¸ Views

### 5.2 ×˜×™×¤×•×œ ×‘-Issues

- ×¢× ×” ×ž×”×¨ ×¢×œ ×©××œ×•×ª
- ×ª×™×™×’ issues (bug, enhancement, question)
- ×¡×’×•×¨ issues ×©× ×¤×ª×¨×•
- ×ª×•×“×” ×œ×ª×•×¨×ž×™×

### 5.3 ×§×‘×œ Feedback

- ×‘×§×© reviews
- ×”×§×©×‘ ×œ×§×”×™×œ×”
- ×©×¤×¨ ×œ×¤×™ ×‘×™×§×•×¨×ª

---

## âœ… Checklist ×œ×¤× ×™ ×¤×¨×¡×•×

- [ ] ×›×œ ×”×§×‘×¦×™× ×§×™×™×ž×™×
- [ ] manifest.json ×¢× ×¤×¨×˜×™× × ×›×•× ×™×
- [ ] hacs.json ×ª×§×™×Ÿ
- [ ] README ×ž×¤×•×¨×˜
- [ ] Screenshots/GIFs
- [ ] LICENSE
- [ ] .gitignore
- [ ] ×“×•×’×ž××•×ª ×§×•×“
- [ ] ×‘×“×™×§×•×ª ×©×”×›×œ ×¢×•×‘×“
- [ ] Git tags
- [ ] GitHub Release
- [ ] ×©×™×ª×•×£ ×‘×§×”×™×œ×”

---

## ðŸ’¡ ×˜×™×¤×™× ×—×©×•×‘×™×

1. **×ª×™×¢×•×“ = ×”×›×œ** - ×ª×™×¢×•×“ ×˜×•×‘ = ×”×¦×œ×—×”
2. **×’×¨×¡××•×ª ×¡×ž× ×˜×™×•×ª** - ×”×©×ª×ž×© ×‘-semantic versioning
3. **×ª×’×•×‘×” ×ž×”×™×¨×”** - ×¢× ×” ×¢×œ issues ×‘×ž×”×™×¨×•×ª
4. **×§×”×™×œ×”** - ×‘× ×” ×§×”×™×œ×” ×¤×¢×™×œ×”
5. **××™×›×•×ª** - ×‘×“×•×§ ×©×”×›×œ ×¢×•×‘×“ ×œ×¤× ×™ ×¤×¨×¡×•×

---

**×‘×”×¦×œ×—×” ×¢× ×”×¤×¨×•×™×§×˜! ðŸš€**

ðŸ“§ ×©××œ×•×ª? ×¤×ª×— [Discussion](https://github.com/hod25/hourly-timer-integration/discussions)
