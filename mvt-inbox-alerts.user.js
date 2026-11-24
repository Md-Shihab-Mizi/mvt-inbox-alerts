// ==UserScript==
// @name         MVT Inbox Alerts made by Md.Shihab Mizi
// @namespace    mvt-listing
// @version      2.4
// @description  Desktop notification, sound, on-page banner, and unread count in the tab title when a new Listings and Contracts request reaches the MVT Work Intake inbox.
// @match        https://mvt-issue-tracker-rebuild.netlify.app/*
// @noframes
// @grant        GM_notification
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const POLL_MS = 30000;
  const TOKEN_KEY = 'sb-ebqjwmspyjzqvxxctyyv-auth-token';
  const SUPABASE_URL = 'https://ebqjwmspyjzqvxxctyyv.supabase.co';
  const REFRESH_EARLY_SEC = 120; // renew the sign-in token 2 minutes before it expires
  const LIST_URL = '/api/trpc/issues.list?batch=1&input=' + encodeURIComponent('{"0":{"json":{}}}');
  const K = { maxId: 'mvtMaxId', unread: 'mvtUnread', sound: 'mvtSound', min: 'mvtMin', last: 'mvtLastAlert', pending: 'mvtPending' };
  const get = (k, d) => GM_getValue(k, d);
  const set = (k, v) => GM_setValue(k, v);
  const log = (...a) => console.log('[MVT Alerts]', ...a);
  const hhmm = d => new Date(d).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  let audioCtx = null;
  let panel, statusEl, lastEl, bannerEl, desktopBtn;

  function isListings(x) {
    return (x.department || '').toLowerCase() === 'listings and contracts' || x.departmentChoice === 'contracts';
  }

  // ---------- sign-in token ----------
  // The site's token lasts 1 hour. When the tab is in the background the site
  // stops renewing it, which caused the HTTP 403 errors. The script renews
  // it itself and saves it back, so the site stays signed in as well.
  let apiKey = null;
  let refreshing = null;

  function readSession() {
    try { return JSON.parse(localStorage.getItem(TOKEN_KEY)); } catch (e) { return null; }
  }

  const expiresSoon = s => !s || !s.expires_at || (s.expires_at - Date.now() / 1000) < REFRESH_EARLY_SEC;

  // v2.4: the site now splits its code into several files and replaces them on
  // each update, so the key is searched for in every app file, including the
  // ones listed in the latest copy of the page.
  async function getApiKey() {
    if (apiKey) return apiKey;
    const files = new Set([...document.scripts].map(s => s.src).filter(s => /\/assets\/[^/]+\.js$/.test(s)));
    try {
      const html = await (await fetch('/', { cache: 'no-store' })).text();
      (html.match(/\/assets\/[^"']+\.js/g) || []).forEach(p => files.add(location.origin + p));
    } catch (e) { log('Could not read the latest page', e); }
    for (const src of files) {
      try {
        const txt = await (await fetch(src)).text();
        const m = txt.match(/sb_publishable_[A-Za-z0-9_-]+/);
        if (m) { apiKey = m[0]; return apiKey; }
      } catch (e) { /* try the next file */ }
    }
    throw new Error('App key not found. Please reload the page');
  }

  async function doRefresh() {
    const cur = readSession();
    if (!cur || !cur.refresh_token) throw new Error('Signed out. Please log in again');
    const r = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: { apikey: await getApiKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: cur.refresh_token })
    });
    if (!r.ok) {
      // The site may have renewed the token at the same moment. Use its copy if so.
      const now = readSession();
      if (now && now.access_token !== cur.access_token && !expiresSoon(now)) return now;
      throw new Error('Sign-in renewal failed (HTTP ' + r.status + '). Please reload or log in again');
    }
    const s = await r.json();
    if (!s.expires_at) s.expires_at = Math.floor(Date.now() / 1000) + (s.expires_in || 3600);
    localStorage.setItem(TOKEN_KEY, JSON.stringify(s));
    log('Sign-in token renewed, valid until', hhmm(s.expires_at * 1000));
    return s;
  }

  function refreshSession() {
    if (!refreshing) refreshing = doRefresh().finally(() => { refreshing = null; });
    return refreshing;
  }

  async function token() {
    const s = readSession();
    if (!s || !s.access_token) throw new Error('Signed out. Please log in again');
    return expiresSoon(s) ? (await refreshSession()).access_token : s.access_token;
  }

  // ---------- fetch ----------
  // v2.4: show the site's own error message, and say clearly when the
  // problem is on the site's server rather than in this script.
  async function errorText(r) {
    let msg = '';
    try { const j = await r.json(); msg = (j[0] && j[0].error && j[0].error.json && j[0].error.json.message) || ''; } catch (e) {}
    if (r.status >= 500) return `Site server error, HTTP ${r.status}${msg ? ': ' + msg.replace(/\.$/, '') : ''}. The inbox page is affected too`;
    return `HTTP ${r.status}${msg ? ': ' + msg.replace(/\.$/, '') : ''}`;
  }

  async function fetchRequests(retry = true) {
    const t = await token();
    const r = await fetch(LIST_URL, { headers: { Authorization: 'Bearer ' + t } });
    if ((r.status === 401 || r.status === 403) && retry) {
      log('HTTP ' + r.status + ', renewing sign-in token and retrying');
      await refreshSession();
      return fetchRequests(false);
    }
    if (!r.ok) throw new Error(await errorText(r));
    const data = await r.json();
    return data[0].result.data.json;
  }

  async function poll() {
    try {
      const list = await fetchRequests();
      const top = list.reduce((m, x) => Math.max(m, x.id), 0);
      const maxId = get(K.maxId, null);
      if (maxId === null) {
        set(K.maxId, top);
        log('First run, marking up to ID', top, 'as seen');
      } else {
        const fresh = list.filter(x => x.id > maxId && isListings(x)).sort((a, b) => b.id - a.id);
        if (top > maxId) { log('New IDs', maxId + 1, 'to', top, '| Listings and Contracts:', fresh.map(x => x.reference)); set(K.maxId, top); }
        if (fresh.length) {
          set(K.unread, get(K.unread, 0) + fresh.length);
          alertNew(fresh);
        }
      }
      setStatus(`Watching. Last check ${hhmm(Date.now())} (seen up to #${get(K.maxId, '?')})`, false);
    } catch (e) {
      log('Check failed', e);
      setStatus(`Check failed at ${hhmm(Date.now())} (${e.message}). Will retry.`, true);
    }
    updateTitle();
    renderBanner();
  }

  // ---------- alerts ----------
  function describe(x) {
    return `${x.reference || ''} ${x.title || 'New request'}`.trim() +
      (x.reporterName ? `\nFrom ${x.reporterName}` : '');
  }

  function openInbox() {
    window.focus();
    if (!location.pathname.startsWith('/admin/inbox')) location.href = '/admin/inbox';
    else location.reload();
  }

  function desktopNotify(title, text) {
    // Prefer the site's own browser notification (reliable, stays on screen until dismissed).
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const n = new Notification(title, { body: text, requireInteraction: true, tag: 'mvt-' + Date.now() });
        n.onclick = () => { n.close(); openInbox(); };
        return 'browser';
      } catch (e) { log('Browser notification failed', e); }
    }
    try {
      GM_notification({ title, text, timeout: 0, highlight: true, onclick: openInbox });
      return 'tampermonkey';
    } catch (e) { log('GM_notification failed', e); }
    return 'none';
  }

  function alertNew(fresh) {
    const title = fresh.length === 1 ? 'New Listings and Contracts request' : `${fresh.length} new Listings and Contracts requests`;
    const text = describe(fresh[0]);
    const via = desktopNotify(title, text);
    log('Alert sent via', via, '|', text.replace('\n', ' '));

    const isTest = fresh[0].reference === 'TEST';
    if (!isTest) {
      set(K.last, `${fresh[0].reference || ''} at ${hhmm(Date.now())}`);
      const pending = get(K.pending, []);
      fresh.forEach(x => pending.unshift(`${x.reference} ${x.title || ''}`.slice(0, 70)));
      set(K.pending, pending.slice(0, 5));
    }
    beep();
    updateTitle();
    renderBanner(isTest ? [`TEST ${fresh[0].title}`] : null);
  }

  function beep() {
    if (!get(K.sound, true)) return;
    try {
      audioCtx = audioCtx || new AudioContext();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const now = audioCtx.currentTime;
      [[784, 0], [1046, 0.18]].forEach(([freq, t]) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now + t);
        g.gain.exponentialRampToValueAtTime(0.3, now + t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.28);
        o.connect(g).connect(audioCtx.destination);
        o.start(now + t);
        o.stop(now + t + 0.3);
      });
    } catch (e) { log('Sound blocked', e); }
  }

  document.addEventListener('pointerdown', () => {
    try { audioCtx = audioCtx || new AudioContext(); audioCtx.resume(); } catch (e) {}
  }, { once: true });

  // ---------- tab title ----------
  function updateTitle() {
    const base = document.title.replace(/^\(\d+\)\s*/, '');
    const n = get(K.unread, 0);
    const want = n > 0 ? `(${n}) ${base}` : base;
    if (document.title !== want) document.title = want;
  }

  // Only "Mark seen" clears the count and banner, so an alert is never wiped
  // just because the tab happened to be in front when it arrived.
  function markSeen() { set(K.unread, 0); set(K.pending, []); updateTitle(); renderBanner(); }

  // ---------- panel ----------
  function btn(label, fn) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'font:12px system-ui;padding:4px 8px;margin:4px 4px 0 0;border:1px solid #c8ccd2;border-radius:6px;background:#fff;color:#1f2937;cursor:pointer;';
    b.addEventListener('click', e => { e.stopPropagation(); fn(b); });
    return b;
  }

  function desktopLabel() {
    if (!('Notification' in window)) return 'Desktop: n/a';
    return { granted: 'Desktop: on', denied: 'Desktop: blocked', default: 'Turn on desktop alerts' }[Notification.permission];
  }

  function buildPanel() {
    panel = document.createElement('div');
    panel.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;background:#f8fafc;color:#1f2937;border:1px solid #d1d5db;border-radius:10px;box-shadow:0 4px 16px rgba(0,0,0,.15);font:12px system-ui;padding:8px 10px;max-width:280px;';

    const head = document.createElement('div');
    head.style.cssText = 'display:flex;justify-content:space-between;gap:12px;align-items:center;font-weight:600;cursor:pointer;';
    head.innerHTML = '<span>Listings and Contracts alerts</span><span>-</span>';

    bannerEl = document.createElement('div');
    bannerEl.style.cssText = 'display:none;margin-top:6px;padding:6px 8px;border-radius:6px;background:#b91c1c;color:#fff;font-weight:600;cursor:pointer;white-space:pre-line;';
    bannerEl.addEventListener('click', e => { e.stopPropagation(); openInbox(); });

    const body = document.createElement('div');
    statusEl = document.createElement('div');
    statusEl.style.cssText = 'margin-top:4px;color:#4b5563;';
    lastEl = document.createElement('div');
    lastEl.style.cssText = 'margin-top:2px;color:#4b5563;';

    const soundBtn = btn(get(K.sound, true) ? 'Sound: on' : 'Sound: off', b => {
      const v = !get(K.sound, true); set(K.sound, v); b.textContent = v ? 'Sound: on' : 'Sound: off';
    });
    desktopBtn = btn(desktopLabel(), async b => {
      if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
      b.textContent = desktopLabel();
    });

    body.append(
      statusEl, lastEl,
      btn('Test alert', () => alertNew([{ reference: 'TEST', title: 'This is a test alert', reporterName: 'MVT Inbox Alerts' }])),
      btn('Mark seen', markSeen),
      soundBtn, desktopBtn
    );

    const applyMin = min => { body.style.display = min ? 'none' : ''; head.lastChild.textContent = min ? '+' : '-'; };
    head.addEventListener('click', () => { const m = !get(K.min, false); set(K.min, m); applyMin(m); });
    applyMin(get(K.min, false));

    panel.append(head, bannerEl, body);
    document.body.appendChild(panel);
  }

  function renderBanner(extra) {
    if (!bannerEl) return;
    const items = extra || get(K.pending, []);
    bannerEl.style.display = items.length ? '' : 'none';
    bannerEl.textContent = items.length ? 'NEW: ' + items.join('\nNEW: ') : '';
    panel.style.borderColor = items.length ? '#b91c1c' : '#d1d5db';
    lastEl.textContent = 'Last alert: ' + get(K.last, 'none yet');
    if (desktopBtn) desktopBtn.textContent = desktopLabel();
  }

  // Failed checks show in red so they are easy to spot.
  function setStatus(t, isError) {
    if (!statusEl) return;
    statusEl.textContent = t;
    statusEl.style.color = isError ? '#b91c1c' : '#4b5563';
    statusEl.style.fontWeight = isError ? '600' : '';
  }

  buildPanel();
  renderBanner();
  poll();
  setInterval(poll, POLL_MS);
  setInterval(updateTitle, 2000);
})();
