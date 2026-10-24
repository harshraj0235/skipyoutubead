/* ============================================================
   YouTube Smart Skip — Background Service Worker
   Manages extension lifecycle, badge updates, and messaging
   ============================================================ */

const DEFAULT_SETTINGS = {
  enabled: true,
  skipMode: 'both',
  skipAds: true,
  skipMusic: true,
  speedUpAds: true,
  muteAds: true,
  skipOverlayAds: true,
  skipBannerAds: true,
  musicSensitivity: 'medium',
  showNotifications: true,
  musicSkipSeconds: 360,
  autoSkipDelay: 0,
};

const DEFAULT_STATS = {
  adsSkipped: 0,
  musicSkipped: 0,
  timeSaved: 0,
};

/* ---------- Installation ---------- */
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Set default settings on first install
    await chrome.storage.sync.set({
      settings: DEFAULT_SETTINGS,
      stats: DEFAULT_STATS,
    });
    console.log('[YT-SmartSkip BG] Extension installed — defaults set');
    updateBadge(true);
  } else if (details.reason === 'update') {
    // Merge new default keys into existing settings (preserve user prefs)
    const data = await chrome.storage.sync.get('settings');
    const merged = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
    await chrome.storage.sync.set({ settings: merged });
    console.log('[YT-SmartSkip BG] Extension updated — settings merged');
  }
});

/* ---------- Badge Management ---------- */
function updateBadge(enabled) {
  const color = enabled ? '#00C853' : '#757575';
  const text = enabled ? 'ON' : 'OFF';
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
}

// Initialize badge on startup
chrome.storage.sync.get('settings', (data) => {
  const settings = data.settings || DEFAULT_SETTINGS;
  updateBadge(settings.enabled);
});

/* ---------- Message Handling ---------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.type) {
    case 'CONTENT_READY':
      console.log('[YT-SmartSkip BG] Content script ready on:', msg.url);
      sendResponse({ ok: true });
      return true;

    case 'BADGE_UPDATE':
      updateBadge(msg.enabled);
      sendResponse({ ok: true });
      return true;

    case 'GET_SETTINGS':
      chrome.storage.sync.get(['settings', 'stats'], (data) => {
        sendResponse({
          settings: data.settings || DEFAULT_SETTINGS,
          stats: data.stats || DEFAULT_STATS,
        });
      });
      return true; // async sendResponse

    case 'SAVE_SETTINGS':
      chrome.storage.sync.set({ settings: msg.settings }, () => {
        updateBadge(msg.settings.enabled);
        sendResponse({ ok: true });
      });
      return true;

    case 'SAVE_STATS':
      chrome.storage.sync.set({ stats: msg.stats }, () => {
        sendResponse({ ok: true });
      });
      return true;

    case 'RESET_STATS':
      chrome.storage.sync.set({ stats: DEFAULT_STATS }, () => {
        sendResponse({ ok: true });
      });
      return true;

    default:
      sendResponse({ error: 'Unknown message type' });
      return true;
  }
});

/* ---------- Storage Change Listener ---------- */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.settings) {
    const newSettings = changes.settings.newValue;
    if (newSettings) {
      updateBadge(newSettings.enabled);
    }
  }
});

/* ---------- Tab Update Listener ---------- */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('youtube.com')) {
    // Badge stays up-to-date for YouTube tabs
    chrome.storage.sync.get('settings', (data) => {
      updateBadge((data.settings || DEFAULT_SETTINGS).enabled);
    });
  }
});
