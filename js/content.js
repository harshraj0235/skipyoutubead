/* ============================================================
   YouTube Smart Skip — Content Script v6.0 (PREMIUM)
   
   - Beautiful gradient player buttons with animations
   - 6-minute music skip
   - Auto ad removal
   - Premium notification toasts
   ============================================================ */
(function () {
  'use strict';

  if (window.__ytSmartSkipV6) return;
  window.__ytSmartSkipV6 = true;

  const TAG = '[YT-SmartSkip]';
  const MUSIC_SKIP_SECONDS = 360; // 6 minutes

  const DEFAULTS = {
    enabled: true, skipMode: 'both', skipAds: true, skipMusic: true,
    speedUpAds: true, muteAds: true, skipOverlayAds: true, skipBannerAds: true,
    musicSensitivity: 'medium', showNotifications: true,
    musicSkipSeconds: MUSIC_SKIP_SECONDS, autoSkipDelay: 0,
  };

  let settings = { ...DEFAULTS };
  let stats = { adsSkipped: 0, musicSkipped: 0, timeSaved: 0 };
  let savedRate = 1, savedVol = 1, wasAd = false, notifyTimer = null;
  let silenceStart = 0, musicConfirmed = false, lastMusicSkipAt = 0;
  let ccWasEnabled = false, ccAttempts = 0, buttonsAdded = false;

  const SENS = {
    low: { silenceMs: 8000, cooldownMs: 12000 },
    medium: { silenceMs: 5000, cooldownMs: 8000 },
    high: { silenceMs: 3000, cooldownMs: 5000 },
  };

  const MUSIC_REGEX = /\[\s*(music|music playing|background music|instrumental|singing|humming|song|गाना|संगीत|गीत|موسیقی)\s*\]|[♪♫♬🎵🎶🎤🎸🎹🎺🎻]/i;

  const log = (...a) => console.log(TAG, ...a);
  const getVideo = () => document.querySelector('video.html5-main-video') || document.querySelector('video');
  const getPlayer = () => document.querySelector('#movie_player') || document.querySelector('.html5-video-player');

  /* ═══════ INJECT CUSTOM STYLES ═══════ */
  function injectStyles() {
    if (document.getElementById('yss-injected-styles')) return;
    const style = document.createElement('style');
    style.id = 'yss-injected-styles';
    style.textContent = `
      /* ── Floating Button Container ── */
      #yss-btn-container {
        position: absolute !important;
        bottom: 50px !important;
        right: 12px !important;
        z-index: 2147483646 !important;
        display: flex !important;
        gap: 10px !important;
        pointer-events: auto !important;
        opacity: 0;
        transform: translateY(8px);
        transition: opacity 0.3s ease, transform 0.3s ease;
      }
      /* Show on player hover */
      #movie_player:hover #yss-btn-container,
      .html5-video-player:hover #yss-btn-container {
        opacity: 1;
        transform: translateY(0);
      }

      /* ── Player Buttons ── */
      .yss-player-btn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 8px !important;
        padding: 10px 20px !important;
        border: none !important;
        border-radius: 24px !important;
        font-family: 'YouTube Sans', 'Roboto', -apple-system, sans-serif !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        letter-spacing: 0.5px !important;
        text-transform: uppercase !important;
        cursor: pointer !important;
        color: white !important;
        min-width: 130px !important;
        height: 40px !important;
        line-height: 1 !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4) !important;
        position: relative !important;
        overflow: hidden !important;
        white-space: nowrap !important;
        backdrop-filter: blur(8px) !important;
        -webkit-backdrop-filter: blur(8px) !important;
      }
      .yss-player-btn::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 50%);
        pointer-events: none;
        border-radius: 24px;
      }
      .yss-player-btn:hover {
        transform: scale(1.06) translateY(-2px) !important;
        box-shadow: 0 6px 24px rgba(0,0,0,0.5) !important;
        filter: brightness(1.15) !important;
      }
      .yss-player-btn:active {
        transform: scale(0.95) !important;
      }
      .yss-player-btn .yss-btn-icon {
        font-size: 16px;
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
      }
      .yss-player-btn .yss-btn-text {
        font-size: 13px;
        font-weight: 700;
      }

      /* Skip Ad — Red Gradient */
      .yss-btn-ad {
        background: linear-gradient(135deg, #FF416C, #FF4B2B) !important;
      }
      .yss-btn-ad:hover {
        box-shadow: 0 6px 28px rgba(255, 65, 108, 0.6) !important;
      }

      /* Skip Music — Purple Gradient */
      .yss-btn-music {
        background: linear-gradient(135deg, #7F00FF, #E100FF) !important;
      }
      .yss-btn-music:hover {
        box-shadow: 0 6px 28px rgba(127, 0, 255, 0.6) !important;
      }

      /* ── Notification Toast ── */
      #yss-notify {
        position: absolute;
        top: 16px;
        right: 16px;
        z-index: 2147483647;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 22px;
        border-radius: 14px;
        font-family: 'YouTube Sans','Roboto', sans-serif;
        font-size: 13px;
        font-weight: 600;
        color: #fff;
        background: rgba(10, 10, 20, 0.92);
        backdrop-filter: blur(24px);
        -webkit-backdrop-filter: blur(24px);
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
        opacity: 0;
        transform: translateY(-14px) scale(0.92);
        transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
        pointer-events: none;
        max-width: 380px;
        white-space: nowrap;
      }
      #yss-notify.yt-ss-show {
        opacity: 1;
        transform: translateY(0) scale(1);
        pointer-events: auto;
      }
      #yss-notify .yss-icon { font-size: 18px; flex-shrink: 0; }
      #yss-notify.yt-ss-ad {
        border-left: 3px solid #FF416C;
        background: linear-gradient(135deg, rgba(255,65,108,0.15), rgba(10,10,20,0.92));
      }
      #yss-notify.yt-ss-music {
        border-left: 3px solid #E100FF;
        background: linear-gradient(135deg, rgba(127,0,255,0.15), rgba(10,10,20,0.92));
      }
      #yss-notify.yt-ss-success {
        border-left: 3px solid #00E676;
        background: linear-gradient(135deg, rgba(0,230,118,0.12), rgba(10,10,20,0.92));
      }
      #yss-notify.yt-ss-info {
        border-left: 3px solid #448AFF;
        background: linear-gradient(135deg, rgba(68,138,255,0.12), rgba(10,10,20,0.92));
      }
      @keyframes yss-glow {
        0%,100% { box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
        50% { box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(225,0,255,0.3); }
      }
      #yss-notify.yt-ss-music.yt-ss-show { animation: yss-glow 2s ease-in-out infinite; }
    `;
    document.head.appendChild(style);
  }

  /* ═══════ NOTIFICATION ═══════ */
  function showNotify(msg, type = 'info') {
    if (!settings.showNotifications) return;
    try {
      let el = document.getElementById('yss-notify');
      if (!el) {
        el = document.createElement('div');
        el.id = 'yss-notify';
        (getPlayer() || document.body).appendChild(el);
      }
      const icons = { ad: '🛡️', music: '🎵', info: '⚡', success: '✅' };
      el.innerHTML = `<span class="yss-icon">${icons[type] || '⚡'}</span> ${msg}`;
      el.className = 'yt-ss-show yt-ss-' + type;
      clearTimeout(notifyTimer);
      notifyTimer = setTimeout(() => el.classList.remove('yt-ss-show'), 3500);
    } catch {}
  }

  /* ═══════ SETTINGS ═══════ */
  async function loadSettings() {
    try {
      const d = await chrome.storage.sync.get(['settings', 'stats']);
      if (d.settings) settings = { ...DEFAULTS, ...d.settings };
      if (d.stats) stats = { ...stats, ...d.stats };
    } catch {}
    applyMode();
  }
  function applyMode() {
    if (settings.skipMode === 'ads') { settings.skipAds = true; settings.skipMusic = false; }
    if (settings.skipMode === 'music') { settings.skipAds = false; settings.skipMusic = true; }
    if (settings.skipMode === 'both') { settings.skipAds = true; settings.skipMusic = true; }
  }
  async function saveStats() { try { await chrome.storage.sync.set({ stats }); } catch {} }

  /* ═══════ AD SKIPPER ═══════ */
  function isAdShowing() {
    const p = getPlayer();
    if (!p) return false;
    if (p.classList.contains('ad-showing') || p.classList.contains('ad-interrupting')) return true;
    if (document.querySelector('.ytp-ad-player-overlay')) return true;
    const prev = document.querySelector('.ytp-ad-preview-container');
    return prev && prev.textContent.trim().length > 0;
  }

  function clickSkip() {
    for (const sel of ['.ytp-skip-ad-button', '.ytp-ad-skip-button', '.ytp-ad-skip-button-modern',
      'button.ytp-ad-skip-button', 'button.ytp-skip-ad-button', '.ytp-ad-skip-button-slot button']) {
      for (const btn of document.querySelectorAll(sel)) {
        if (btn?.offsetParent !== null) {
          try { btn.click(); btn.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; } catch {}
        }
      }
    }
    return false;
  }

  function forceEndAd() {
    const v = getVideo();
    if (!v) return;
    if (v.duration && isFinite(v.duration) && v.duration > 0) v.currentTime = v.duration;
    try { v.playbackRate = 16; } catch {}
    try { v.muted = true; v.volume = 0; } catch {}
  }

  function forceSkipAd() {
    clickSkip();
    forceEndAd();
    stats.adsSkipped++; stats.timeSaved += 15; saveStats();
    showNotify('Ad removed ✓', 'success');
    log('✓ Ad force-skipped');
  }

  function restorePlayback() {
    const v = getVideo();
    if (!v) return;
    try { if (v.playbackRate !== 1) v.playbackRate = savedRate || 1; v.muted = false; v.volume = savedVol || 1; } catch {}
  }

  function removeOverlays() {
    if (!settings.skipOverlayAds) return;
    document.querySelectorAll('.ytp-ad-overlay-close-button').forEach(b => { try { b.click(); } catch {} });
    document.querySelectorAll('.ytp-ad-overlay-container,.ytp-ad-overlay-slot').forEach(el =>
      el.style.setProperty('display', 'none', 'important'));
  }

  function removeBanners() {
    if (!settings.skipBannerAds) return;
    for (const sel of ['ytd-promoted-sparkles-web-renderer', 'ytd-display-ad-renderer', 'ytd-ad-slot-renderer',
      'ytd-in-feed-ad-layout-renderer', 'ytd-banner-promo-renderer', '#masthead-ad', '#player-ads',
      'ytd-action-companion-ad-renderer']) {
      document.querySelectorAll(sel).forEach(el => {
        el.style.setProperty('display', 'none', 'important');
        try { el.remove(); } catch {}
      });
    }
  }

  function handleAds() {
    if (!settings.enabled || !settings.skipAds) return;
    const adActive = isAdShowing();
    if (adActive) {
      if (!wasAd) {
        const v = getVideo();
        if (v) { savedRate = v.playbackRate || 1; savedVol = v.volume || 1; }
        log('🔴 AD DETECTED');
        showNotify('Ad detected — removing...', 'ad');
      }
      clickSkip();
      forceEndAd();
    }
    if (!adActive && wasAd) {
      restorePlayback();
      stats.adsSkipped++; stats.timeSaved += 15; saveStats();
      showNotify('Ad removed ✓', 'success');
    }
    wasAd = adActive;
    removeOverlays();
  }

  /* ═══════ MUSIC SKIP ═══════ */
  function skipMusicNow(reason) {
    const v = getVideo();
    if (!v || !v.duration || !isFinite(v.duration)) return;
    const newTime = Math.min(v.currentTime + MUSIC_SKIP_SECONDS, v.duration - 5);
    const actual = Math.round(newTime - v.currentTime);
    if (actual > 2) {
      v.currentTime = newTime;
      stats.musicSkipped++; stats.timeSaved += actual; saveStats();
      lastMusicSkipAt = Date.now();
      log(`✓ ${reason}: Skipped ${Math.round(actual / 60)}m forward`);
      showNotify(`Skipped ${Math.round(actual / 60)} min of music ✓`, 'music');
    }
  }

  /* ═══════ PLAYER BUTTONS (FLOATING ABOVE CONTROLS) ═══════ */
  function injectPlayerButtons() {
    if (buttonsAdded) return;
    const player = getPlayer();
    if (!player) return;
    if (document.getElementById('yss-btn-container')) { buttonsAdded = true; return; }

    // Create floating container
    const container = document.createElement('div');
    container.id = 'yss-btn-container';

    // Skip Ad button
    const adBtn = document.createElement('button');
    adBtn.id = 'yss-skipad-btn';
    adBtn.className = 'yss-player-btn yss-btn-ad';
    adBtn.title = 'Force skip current ad';
    adBtn.innerHTML = '<span class="yss-btn-icon">⛔</span><span class="yss-btn-text">Skip Ad</span>';
    adBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); forceSkipAd(); });

    // Skip Music button
    const mBtn = document.createElement('button');
    mBtn.id = 'yss-skipmusic-btn';
    mBtn.className = 'yss-player-btn yss-btn-music';
    mBtn.title = 'Skip 6 minutes forward (skip music)';
    mBtn.innerHTML = '<span class="yss-btn-icon">🎵</span><span class="yss-btn-text">Skip Music</span>';
    mBtn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); skipMusicNow('Manual skip'); });

    container.appendChild(adBtn);
    container.appendChild(mBtn);
    player.appendChild(container);
    buttonsAdded = true;
    log('✓ Floating player buttons added');
  }

  /* ═══════ AUTO CC ═══════ */
  function tryEnableCC() {
    if (ccWasEnabled || ccAttempts > 10) return;
    ccAttempts++;
    try {
      const b = document.querySelector('.ytp-subtitles-button');
      if (!b) return;
      if (b.getAttribute('aria-pressed') === 'true') { ccWasEnabled = true; return; }
      if (settings.skipMusic) { b.click(); ccWasEnabled = true; }
    } catch {}
  }

  /* ═══════ MUSIC DETECTION ═══════ */
  function getCaptionText() {
    const s = document.querySelectorAll('.ytp-caption-segment');
    if (s.length > 0) return Array.from(s).map(e => e.textContent.trim()).join(' ');
    const c = document.querySelector('.ytp-caption-window-container');
    return c ? c.textContent.trim() : '';
  }

  function handleMusic() {
    if (!settings.enabled || !settings.skipMusic) return;
    const v = getVideo();
    if (!v || v.paused || v.ended || !v.duration || !isFinite(v.duration)) return;
    if (isAdShowing()) return;

    const sens = SENS[settings.musicSensitivity] || SENS.medium;
    const now = Date.now();
    if (now - lastMusicSkipAt < sens.cooldownMs) return;

    const ccBtn = document.querySelector('.ytp-subtitles-button');
    const ccOn = ccBtn && ccBtn.getAttribute('aria-pressed') === 'true';
    const text = getCaptionText();
    const hasMusic = MUSIC_REGEX.test(text);
    const isSpeech = text.length > 0 && (!hasMusic || text.replace(MUSIC_REGEX, '').replace(/[\s\[\]\(\)]/g, '').length > 10);

    if ((hasMusic && !isSpeech) || (ccOn && text.length === 0)) {
      if (!silenceStart) silenceStart = now;
    } else if (isSpeech) {
      if (musicConfirmed) showNotify('Dialogue resumed', 'success');
      silenceStart = 0; musicConfirmed = false; return;
    }

    if (silenceStart > 0 && (now - silenceStart) >= sens.silenceMs && !musicConfirmed) {
      musicConfirmed = true;
      skipMusicNow('Auto-detected music');
      silenceStart = 0; musicConfirmed = false;
    }
  }

  /* ═══════ OBSERVER + POLLING ═══════ */
  function startObserver() {
    new MutationObserver(() => handleAds()).observe(document.body, {
      childList: true, subtree: true, attributes: true, attributeFilter: ['class'],
    });
  }
  function startPolling() {
    setInterval(() => { if (settings.enabled && settings.skipAds) handleAds(); }, 300);
    setInterval(() => { if (settings.enabled && settings.skipMusic) handleMusic(); }, 600);
    setInterval(() => { if (settings.enabled) removeBanners(); }, 3000);
    setInterval(() => { if (!ccWasEnabled) tryEnableCC(); injectPlayerButtons(); }, 2000);
  }

  /* ═══════ NAVIGATION ═══════ */
  function setupNav() {
    let lastUrl = location.href;
    const reset = () => { silenceStart = 0; musicConfirmed = false; ccWasEnabled = false; ccAttempts = 0; buttonsAdded = false; wasAd = false; };
    new MutationObserver(() => { if (location.href !== lastUrl) { lastUrl = location.href; reset(); } }).observe(document, { subtree: true, childList: true });
    document.addEventListener('yt-navigate-finish', reset);
  }

  /* ═══════ MESSAGING ═══════ */
  function setupMessages() {
    try {
      chrome.runtime.onMessage.addListener((msg, s, respond) => {
        switch (msg.type) {
          case 'GET_STATUS': respond({ enabled: settings.enabled, skipMode: settings.skipMode, stats, isAdPlaying: isAdShowing(), isMusicPlaying: musicConfirmed }); return true;
          case 'UPDATE_SETTINGS': settings = { ...settings, ...msg.settings }; applyMode(); chrome.storage.sync.set({ settings }); respond({ success: true }); return true;
          case 'RESET_STATS': stats = { adsSkipped: 0, musicSkipped: 0, timeSaved: 0 }; saveStats(); respond({ success: true }); return true;
          case 'FORCE_SKIP': if (msg.target === 'ad') forceSkipAd(); if (msg.target === 'music') skipMusicNow('Remote skip'); respond({ success: true }); return true;
          default: respond({}); return true;
        }
      });
      chrome.storage.onChanged.addListener((c, a) => { if (a === 'sync' && c.settings) { settings = { ...DEFAULTS, ...c.settings.newValue }; applyMode(); } });
    } catch {}
  }

  /* ═══════ INIT ═══════ */
  async function init() {
    log('v6.0 Starting...');
    await loadSettings();
    setupMessages();
    setupNav();
    if (!document.body) await new Promise(r => { if (document.readyState !== 'loading') return r(); document.addEventListener('DOMContentLoaded', r); });
    injectStyles();
    startObserver();
    startPolling();
    handleAds();
    removeBanners();
    setTimeout(tryEnableCC, 3000);
    setTimeout(injectPlayerButtons, 3000);
    setTimeout(injectPlayerButtons, 8000);
    try { chrome.runtime.sendMessage({ type: 'CONTENT_READY', url: location.href }); } catch {}
    log('✓ v6.0 Ready — Premium buttons on player, 6-min music skip');
  }
  init();
})();
