/* ============================================================
   YouTube Smart Skip — Popup Controller v6.0
   ============================================================ */
(function () {
  'use strict';

  /* ── Elements ── */
  const $ = id => document.getElementById(id);
  const masterToggle = $('masterToggle');
  const statusDot = $('statusDot');
  const statAds = $('statAds');
  const statMusic = $('statMusic');
  const statTime = $('statTime');
  const settingsToggle = $('settingsToggle');
  const settingsBody = $('settingsBody');
  const chevron = $('chevron');
  const btnSkipAd = $('btnSkipAd');
  const btnSkipMusic = $('btnSkipMusic');
  const resetStats = $('resetStats');

  const setSpeedUp = $('setSpeedUp');
  const setMute = $('setMute');
  const setOverlay = $('setOverlay');
  const setBanner = $('setBanner');
  const setNotify = $('setNotify');
  const setSensitivity = $('setSensitivity');

  const modeBtns = document.querySelectorAll('.mode-btn');

  let settings = {};
  let stats = {};

  /* ── Load from storage ── */
  async function load() {
    try {
      const data = await chrome.storage.sync.get(['settings', 'stats']);
      settings = data.settings || {};
      stats = data.stats || {};
    } catch {
      settings = {};
      stats = {};
    }
    render();
  }

  /* ── Render UI ── */
  function render() {
    masterToggle.checked = settings.enabled !== false;
    statusDot.className = 'status-dot ' + (settings.enabled !== false ? 'on' : 'off');

    // Mode buttons
    modeBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === (settings.skipMode || 'both'));
    });

    // Stats
    statAds.textContent = stats.adsSkipped || 0;
    statMusic.textContent = stats.musicSkipped || 0;
    const mins = Math.round((stats.timeSaved || 0) / 60);
    statTime.textContent = mins > 0 ? mins + 'm' : (stats.timeSaved || 0) + 's';

    // Settings
    setSpeedUp.checked = settings.speedUpAds !== false;
    setMute.checked = settings.muteAds !== false;
    setOverlay.checked = settings.skipOverlayAds !== false;
    setBanner.checked = settings.skipBannerAds !== false;
    setNotify.checked = settings.showNotifications !== false;
    setSensitivity.value = settings.musicSensitivity || 'medium';
  }

  /* ── Save settings ── */
  async function save() {
    try {
      await chrome.storage.sync.set({ settings });
      // Notify content script
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_SETTINGS', settings }).catch(() => {});
      }
      // Update badge
      chrome.runtime.sendMessage({ type: 'BADGE_UPDATE', enabled: settings.enabled }).catch(() => {});
    } catch {}
  }

  /* ── Event Listeners ── */

  // Master toggle
  masterToggle.addEventListener('change', () => {
    settings.enabled = masterToggle.checked;
    statusDot.className = 'status-dot ' + (settings.enabled ? 'on' : 'off');
    save();
  });

  // Mode buttons
  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settings.skipMode = btn.dataset.mode;
      save();
    });
  });

  // Settings accordion
  settingsToggle.addEventListener('click', () => {
    settingsBody.classList.toggle('open');
    chevron.textContent = settingsBody.classList.contains('open') ? '▲' : '▼';
  });

  // Toggle settings
  setSpeedUp.addEventListener('change', () => { settings.speedUpAds = setSpeedUp.checked; save(); });
  setMute.addEventListener('change', () => { settings.muteAds = setMute.checked; save(); });
  setOverlay.addEventListener('change', () => { settings.skipOverlayAds = setOverlay.checked; save(); });
  setBanner.addEventListener('change', () => { settings.skipBannerAds = setBanner.checked; save(); });
  setNotify.addEventListener('change', () => { settings.showNotifications = setNotify.checked; save(); });
  setSensitivity.addEventListener('change', () => { settings.musicSensitivity = setSensitivity.value; save(); });

  // Quick action buttons
  btnSkipAd.addEventListener('click', async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'FORCE_SKIP', target: 'ad' }).catch(() => {});
      }
    } catch {}
    btnSkipAd.textContent = '✅ Done!';
    setTimeout(() => { btnSkipAd.innerHTML = '<span class="btn-icon">⛔</span> Skip Ad Now'; }, 1500);
  });

  btnSkipMusic.addEventListener('click', async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'FORCE_SKIP', target: 'music' }).catch(() => {});
      }
    } catch {}
    btnSkipMusic.textContent = '✅ Skipped 6m!';
    setTimeout(() => { btnSkipMusic.innerHTML = '<span class="btn-icon">🎵</span> Skip Music 6m'; }, 1500);
  });

  // Reset stats
  resetStats.addEventListener('click', async () => {
    stats = { adsSkipped: 0, musicSkipped: 0, timeSaved: 0 };
    try {
      await chrome.storage.sync.set({ stats });
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'RESET_STATS' }).catch(() => {});
      }
    } catch {}
    render();
    resetStats.textContent = '✅ Reset!';
    setTimeout(() => { resetStats.textContent = '↺ Reset Stats'; }, 1500);
  });

  // Auto-refresh stats every 2s
  setInterval(async () => {
    try {
      const d = await chrome.storage.sync.get('stats');
      if (d.stats) { stats = d.stats; render(); }
    } catch {}
  }, 2000);

  // Init
  load();
})();
