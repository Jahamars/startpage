(() => {
  const K = { CFG: 'sp_cfg_v6', LINKS: 'sp_links_v3' };
  const ENGINES = {
    google: 'https://www.google.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    yandex: 'https://yandex.com/search/?text=',
    bing: 'https://www.bing.com/search?q=',
    brave: 'https://search.brave.com/search?q=',
    startpage: 'https://www.startpage.com/do/search?q='
  };

  const ROWS = ['lang','tz','ua','dnt','gpc','cookies','js','https','crossiso','webrtc','touch','cpu','memory','screen','depth','online','conn','langlist','platform','vendor','pdf'];

  const DEF = {
    theme: 'gruvbox-dark',
    engine: 'google',
    blocks: { search: true, links: true, info: true },
    rows: Object.fromEntries(ROWS.map(k => [k, true]))
  };

  const DEF_LINKS = [
    { id: id(), n: 'claude', u: 'https://claude.ai/new', e: 1 },
    { id: id(), n: 'github', u: 'https://github.com', e: 1 },
    { id: id(), n: 'reddit', u: 'https://www.reddit.com', e: 1 },
    { id: id(), n: 'distrowatch', u: 'https://distrowatch.com', e: 1 },
    { id: id(), n: 'x.com', u: 'https://x.com/', e: 1 }
  ];

  const s = hydrate();
  const el = {};

  document.addEventListener('DOMContentLoaded', () => {
    map();
    bind();
    renderAll();
    if (s.blocks.search) focusSearch();
  });

  function map() {
    el.btn = document.getElementById('settings-btn');
    el.panel = document.getElementById('settings-panel');
    el.searchBlock = document.getElementById('search-block');
    el.searchInput = document.getElementById('search-input');
    el.linksBlock = document.getElementById('links-block');
    el.linksList = document.getElementById('links-list');
    el.infoBlock = document.getElementById('info-block');
    el.editorList = document.getElementById('editor-list');
    el.newName = document.getElementById('new-name');
    el.newUrl = document.getElementById('new-url');
    el.addBtn = document.getElementById('add-link');
  }

  function bind() {
    el.btn.addEventListener('click', () => el.panel.classList.toggle('hidden'));
    document.addEventListener('click', e => {
      if (el.panel.classList.contains('hidden')) return;
      if (el.panel.contains(e.target) || el.btn.contains(e.target)) return;
      el.panel.classList.add('hidden');
    });

    el.panel.addEventListener('change', onPanelChange);
    el.panel.addEventListener('click', onPanelClick);

    el.searchInput.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const q = el.searchInput.value.trim();
      if (!q) return;
      window.open((ENGINES[s.engine] || ENGINES.google) + encodeURIComponent(q), '_blank', 'noopener');
    });

    el.addBtn.addEventListener('click', addLink);
    el.newUrl.addEventListener('keydown', e => e.key === 'Enter' && addLink());

    window.addEventListener('online', renderInfo);
    window.addEventListener('offline', renderInfo);
  }

  function onPanelChange(e) {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;

    if (t.name === 'theme') s.theme = t.value;
    else if (t.name === 'engine') s.engine = t.value;
    else if (t.dataset.block) s.blocks[t.dataset.block] = t.checked;
    else if (t.dataset.row) s.rows[t.dataset.row] = t.checked;
    else if (t.dataset.eid) editLinkField(t);

    persist();
    renderAll();
  }

  function onPanelClick(e) {
    const del = e.target.closest('button[data-del]');
    if (!del) return;
    s.links = s.links.filter(x => x.id !== del.dataset.del);
    persist();
    renderLinks();
    renderEditor();
  }

  function addLink() {
    const n = el.newName.value.trim() || 'link';
    const u = normalizeUrl(el.newUrl.value.trim());
    if (!u) return;
    s.links.push({ id: id(), n, u, e: 1 });
    el.newName.value = '';
    el.newUrl.value = '';
    persist();
    renderLinks();
    renderEditor();
  }

  function editLinkField(input) {
    const x = s.links.find(v => v.id === input.dataset.eid);
    if (!x) return;
    const f = input.dataset.f;
    if (f === 'e') x.e = input.checked ? 1 : 0;
    if (f === 'n') x.n = input.value.trim() || 'link';
    if (f === 'u') {
      const nu = normalizeUrl(input.value.trim());
      if (nu) x.u = nu;
      input.value = x.u;
    }
  }

  function renderAll() {
    document.documentElement.dataset.theme = s.theme;
    syncControls();
    renderLinks();
    renderEditor();
    renderInfo();
    applyBlocks();
  }

  function syncControls() {
    qSet(`input[name="theme"][value="${s.theme}"]`, true);
    qSet(`input[name="engine"][value="${s.engine}"]`, true);

    qSet('input[data-block="search"]', !!s.blocks.search);
    qSet('input[data-block="links"]', !!s.blocks.links);
    qSet('input[data-block="info"]', !!s.blocks.info);

    for (const key of ROWS) qSet(`input[data-row="${key}"]`, !!s.rows[key]);
  }

  function applyBlocks() {
    el.searchBlock.style.display = s.blocks.search ? '' : 'none';
    el.linksBlock.style.display = s.blocks.links ? '' : 'none';
    el.infoBlock.style.display = s.blocks.info ? '' : 'none';
  }

  function renderLinks() {
    const arr = s.links.filter(x => x.e);
    if (!s.blocks.links || !arr.length) {
      el.linksBlock.style.display = 'none';
      el.linksList.textContent = '';
      return;
    }

    const frag = document.createDocumentFragment();
    for (const x of arr) {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = x.u;
      a.textContent = x.n || x.u;
      a.rel = 'noopener noreferrer';
      li.appendChild(a);
      frag.appendChild(li);
    }
    el.linksList.replaceChildren(frag);
  }

  function renderEditor() {
    const frag = document.createDocumentFragment();
    for (const x of s.links) {
      const row = document.createElement('div');
      row.className = 'e-row';
      row.innerHTML =
        `<input type="checkbox" data-eid="${x.id}" data-f="e" ${x.e ? 'checked' : ''}>` +
        `<input type="text" data-eid="${x.id}" data-f="n" value="${esc(x.n)}">` +
        `<input type="text" data-eid="${x.id}" data-f="u" value="${esc(x.u)}">` +
        `<button type="button" data-del="${x.id}">✕</button>`;
      frag.appendChild(row);
    }
    el.editorList.replaceChildren(frag);
  }

  function renderInfo() {
    const nav = navigator;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection || null;

    set('v-lang', nav.language || 'Unknown');
    set('v-tz', Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown');
    set('v-ua', ua());
    state('v-dnt', dntEnabled() ? 'Enabled' : 'Disabled', dntEnabled() ? 'ok' : 'warn');

    if (nav.globalPrivacyControl === undefined) state('v-gpc', 'Unsupported', 'dim');
    else state('v-gpc', nav.globalPrivacyControl ? 'Enabled' : 'Disabled', nav.globalPrivacyControl ? 'ok' : 'warn');

    state('v-cookies', nav.cookieEnabled ? 'Enabled' : 'Disabled', nav.cookieEnabled ? 'ok' : 'warn');
    state('v-js', 'Enabled', 'ok');
    state('v-https', window.isSecureContext ? 'Yes' : 'No', window.isSecureContext ? 'ok' : 'warn');
    state('v-crossiso', window.crossOriginIsolated ? 'Yes' : 'No', window.crossOriginIsolated ? 'ok' : 'dim');
    state('v-webrtc', typeof window.RTCPeerConnection !== 'undefined' ? 'Available' : 'Unavailable', typeof window.RTCPeerConnection !== 'undefined' ? 'ok' : 'warn');
    state('v-touch', nav.maxTouchPoints > 0 ? `Yes (${nav.maxTouchPoints})` : 'No', nav.maxTouchPoints > 0 ? 'ok' : 'dim');
    set('v-cpu', typeof nav.hardwareConcurrency === 'number' ? String(nav.hardwareConcurrency) : 'Unknown');
    set('v-memory', typeof nav.deviceMemory === 'number' ? String(nav.deviceMemory) : 'Unknown');
    set('v-screen', `${screen.width}×${screen.height}`);
    set('v-depth', `${screen.colorDepth} / ${screen.pixelDepth}`);
    state('v-online', nav.onLine ? 'Online' : 'Offline', nav.onLine ? 'ok' : 'warn');
    set('v-conn', conn ? `${conn.effectiveType || 'unknown'}, downlink:${conn.downlink ?? 'n/a'}, rtt:${conn.rtt ?? 'n/a'}, saveData:${conn.saveData ? 'on' : 'off'}` : 'Unsupported');
    set('v-langlist', Array.isArray(nav.languages) ? nav.languages.join(', ') : 'Unknown');
    set('v-platform', nav.platform || 'Unknown');
    set('v-vendor', nav.vendor || 'Unknown');
    set('v-pdf', nav.pdfViewerEnabled ? 'Enabled' : 'Disabled');

    let visible = 0;
    for (const key of ROWS) {
      const row = el.infoBlock.querySelector(`[data-row-id="${key}"]`);
      if (!row) continue;
      const on = !!s.rows[key];
      row.style.display = on ? '' : 'none';
      if (on) visible++;
    }
    if (!visible) el.infoBlock.style.display = 'none';
    else if (s.blocks.info) el.infoBlock.style.display = '';
  }

  function focusSearch() {
    requestAnimationFrame(() => {
      if (!s.blocks.search) return;
      el.searchInput.focus({ preventScroll: true });
      el.searchInput.select();
    });
  }

  function dntEnabled() {
    const n = (navigator.doNotTrack || '').toLowerCase();
    const w = (window.doNotTrack || '').toLowerCase();
    return n === '1' || n === 'yes' || w === '1' || w === 'yes';
  }

  function ua() {
    const z = navigator.userAgent || '';
    let b = 'Unknown', o = 'Unknown';
    if (z.includes('Firefox')) b = 'Firefox';
    else if (z.includes('Edg')) b = 'Edge';
    else if (z.includes('OPR') || z.includes('Opera')) b = 'Opera';
    else if (z.includes('Chrome')) b = 'Chrome / Chromium';
    else if (z.includes('Safari')) b = 'Safari';
    if (z.includes('Android')) o = 'Android';
    else if (/iPhone|iPad|iPod/.test(z)) o = 'iOS';
    else if (z.includes('Win')) o = 'Windows';
    else if (z.includes('Mac')) o = 'macOS';
    else if (z.includes('Linux')) o = 'Linux';
    return `${b} on ${o}`;
  }

  function normalizeUrl(v) {
    if (!v) return '';
    const raw = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const u = new URL(raw);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
      return u.href;
    } catch {
      return '';
    }
  }

  function hydrate() {
    const raw = parse(localStorage.getItem(K.CFG)) || {};
    const links = parse(localStorage.getItem(K.LINKS));
    return {
      theme: raw.theme || DEF.theme,
      engine: raw.engine || DEF.engine,
      blocks: { ...DEF.blocks, ...(raw.blocks || {}) },
      rows: { ...DEF.rows, ...(raw.rows || {}) },
      links: Array.isArray(links) && links.length ? links : DEF_LINKS
    };
  }

  function persist() {
    localStorage.setItem(K.CFG, JSON.stringify({ theme: s.theme, engine: s.engine, blocks: s.blocks, rows: s.rows }));
    localStorage.setItem(K.LINKS, JSON.stringify(s.links));
  }

  function qSet(sel, checked) {
    const x = document.querySelector(sel);
    if (x) x.checked = !!checked;
  }

  function set(id, val) {
    const x = document.getElementById(id);
    if (!x) return;
    x.className = '';
    x.textContent = val;
  }

  function state(id, val, cls) {
    const x = document.getElementById(id);
    if (!x) return;
    x.className = cls;
    x.textContent = val;
  }

  function parse(v) {
    try { return v ? JSON.parse(v) : null; } catch { return null; }
  }

  function esc(v) {
    return String(v).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  }

  function id() {
    return Math.random().toString(36).slice(2, 10);
  }
})();
