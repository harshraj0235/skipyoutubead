# ⚡ YouTube Smart Skip — Video Navigator

> Skip ads instantly. Skip music in movies. Take control of your YouTube experience.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-brightgreen?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

## 🚀 Features

### ⛔ Ad Removal (Instant)
- Detects ads via `.ad-showing` class using MutationObserver
- Clicks skip button automatically (10+ selector fallbacks)
- Force-ends ads: `video.currentTime = video.duration`
- Speeds unskippable ads to 16× and mutes them
- Removes overlay ads and sidebar banner ads

### 🎵 Music Skip (6 Minutes Forward)
- Detects music via YouTube auto-captions (`[Music]`, `♪`, `♫`)
- Caption silence detection — CC on but no text = music playing
- Supports Hindi (`[संगीत]`) and multilingual markers
- Auto-enables closed captions for detection
- Configurable sensitivity (Low / Medium / High)

### 🎮 Player Buttons
Two floating premium buttons appear on the YouTube player when you hover:
- **⛔ Skip Ad** — Red gradient pill button
- **🎵 Skip Music** — Purple gradient pill button (jumps 6 min forward)

### ⚙️ Full User Control
- **3 Skip Modes**: Both | Ads Only | Music Only
- **Statistics Dashboard**: Ads skipped, music skipped, time saved
- **Advanced Settings**: Toggle speed-up, mute, overlay/banner removal
- **Premium Dark UI**: Glassmorphism popup with ambient glow effects

## 📸 Screenshots

### Popup UI
Dark theme with gradient buttons, stats cards, and mode selector.

### Player Buttons
Floating pill buttons appear above YouTube controls on hover.

## 📦 Installation

### From Source (Developer Mode)
1. Clone this repo or download ZIP
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the project folder
6. Visit any YouTube video — extension is active!

### From Chrome Web Store
*(Coming soon)*

## 🏗️ Project Structure

```
youtube-smart-skip/
├── manifest.json          # Manifest V3 configuration
├── popup.html             # Premium dark popup UI
├── privacy_policy.html    # Chrome Web Store privacy policy
├── js/
│   ├── content.js         # Ad skipper + music detector + player buttons
│   ├── background.js      # Service worker + badge management
│   └── popup.js           # Popup controller
├── css/
│   ├── content.css        # Notification overlay styles
│   └── popup.css          # Popup styling (legacy)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── store_assets/
    ├── STORE_LISTING.md   # Chrome Web Store listing text
    ├── screenshot_1.jpg   # Store screenshot
    └── screenshot_2.jpg   # Store banner
```

## 🔧 How It Works

### Ad Detection & Removal
```
MutationObserver → detects .ad-showing class
    ↓
Click skip button (10+ CSS selectors tried)
    ↓
Force-end: video.currentTime = video.duration
    ↓
Backup: playbackRate = 16× + mute
    ↓
Banner ads removed from DOM every 3s
```

### Music Detection
```
Auto-enable CC button → monitor .ytp-caption-segment
    ↓
Approach 1: Detect music markers (♪, [Music], [संगीत])
Approach 2: Caption silence (CC on, no text = music)
    ↓
Wait for sustained silence/music (configurable)
    ↓
Skip 6 minutes forward
    ↓
Stop when dialogue/speech resumes
```

## 🛡️ Privacy

- **Zero data collection** — nothing leaves your browser
- **No analytics, tracking, or third-party services**
- **Local storage only** — settings stored via Chrome Storage API
- Full privacy policy included in `privacy_policy.html`

## 📋 Permissions

| Permission | Reason |
|-----------|--------|
| `storage` | Save user preferences locally |
| `youtube.com` | Run content script on YouTube pages |

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License — free to use, modify, and distribute.

---

Made with ❤️ for a better YouTube experience.
