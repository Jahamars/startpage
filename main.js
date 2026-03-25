(() => {
  const K = { CFG: 'sp_cfg_v5', LINKS: 'sp_links_v2' };
  const ENGINES = {
    google: 'https://www.google.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    yandex: 'https://yandex.com/search/?text=',
    bing: 'https://www.bing.com/search?q=',
    brave: 'https://search.brave.com/search?q=',
    startpage: 'https://www.startpage.com/do/search?q='
  };
  const DEF = {
    theme: 'gruvbox-dark',
    engine: 'google',
    blocks: { search: true, links: true, info: true },
    rows: { lang: true, tz: true, ua: true, dnt: true, gpc: true, webrtc: true }
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
  let raf = 0;

  document.addEventListener('DOMContentLoaded', boot);

  function boot() {
    q();
    bind();
    paintAll();
    if (s.blocks.search) focusSearch();
  }

  function q() {
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

    el.vLang = document.getElementById('v-lang');
    el.vTz = document.getElementById('v-tz');
    el.vUa = document.getElementById('v-ua');
    el.vDnt = document.getElementById('v-dnt');
    el.vGpc = document.getElementById('v-gpc');
    el.vWebrtc = document.getElementById('v-webrtc');
  }

  function bind() {
    el.btn.addEventListener('click', togglePanel);
    document.addEventListener('click', onOuterClick);
    el.panel.addEventListener('change', onPanelChange);
    el.panel.addEventListener('click', onPanelClick);
    el.searchInput.addEventListener('keydown', onSearch);
    el.addBtn.addEventListener('click', onAddLink);
    el.newUrl.addEventListener('keydown', e => e.key === 'Enter' && onAddLink());
  }

  function togglePanel() {
    const h = el.panel.classList.toggle('hidden');
    el.panel.setAttribute('aria-hidden', String(h));
  }

  function onOuterClick(e) {
    if (el.panel.classList.contains('hidden')) return;
    if (el.panel.contains(e.target) || el.btn.contains(e.target)) return;
    el.panel.classList.add('hidden');
    el.panel.setAttribute('aria-hidden', 'true');
  }

  function onPanelChange(e) {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;

    if (t.name === 'theme') s.theme = t.value;
    else if (t.name === 'engine') s.engine = t.value;
    else if (t.dataset.block) s.blocks[t.dataset.block] = t.checked;
    else if (t.dataset.row) s.rows[t.dataset.row] = t.checked;
    else if (t.dataset.eid) patchLink(t);

    persist();
    schedulePaint();
  }

  function onPanelClick(e) {
    const b = e.target.closest('button[data-del]');
    if (!b) return;
    const delId = b.getAttribute('data-del');
    s.links = s.links.filter(x => x.id !== delId);
    persist();
    renderLinks();
    renderEditor();
  }

  function onSearch(e) {
    if (e.key !== 'Enter') return;
    const qv = el.searchInput.value.trim();
    if (!qv) return;
    const base = ENGINES[s.engine] || ENGINES.google;
    window.open(base + encodeURIComponent(qv), '_blank', 'noopener');
  }

  function onAddLink() {
    const n = el.newName.value.trim() || 'link';
    const u0 = el.newUrl.value.trim();
    if (!u0) return;
    const u = normalizeUrl(u0);
    if (!u) return;

    s.links.push({ id: id(), n, u, e: 1 });
    el.newName.value = '';
    el.newUrl.value = '';
    persist();
    renderLinks();
    renderEditor();
  }

  function patchLink(input) {
    const linkId = input.dataset.eid;
    const field = input.dataset.f;
    const item = s.links.find(x => x.id === linkId);
    if (!item) return;

    if (field === 'e') item.e = input.checked ? 1 : 0;
    if (field === 'n') item.n = input.value.trim() || 'link';
    if (field === 'u') {
      const nu = normalizeUrl(input.value.trim());
      if (nu) item.u = nu;
      input.value = item.u;
    }
  }

  function schedulePaint() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      raf = 0;
      paintAll();
    });
  }

  function paintAll() {
    applyStateControls();
    applyTheme();
    renderLinks();
    renderEditor();
    renderInfo();
  }

  function applyStateControls() {
    document.documentElement.setAttribute('data-theme', s.theme);
    check(`input[name="theme"][value="${s.theme}"]`, true);
    check(`input[name="engine"][value="${s.engine}"]`, true);

    check('input[data-block="search"]', !!s.blocks.search);
    check('input[data-block="links"]', !!s.blocks.links);
    check('input[data-block="info"]', !!s.blocks.info);

    for (const k of Object.keys(s.rows)) check(`input[data-row="${k}"]`, !!s.rows[k]);

    el.searchBlock.style.display = s.blocks.search ? '' : 'none';
    el.linksBlock.style.display = s.blocks.links ? '' : 'none';
    el.infoBlock.style.display = s.blocks.info ? '' : 'none';

    if (s.blocks.search) focusSearch();
  }

  function applyTheme() {
    document.documentElement.setAttribute('data-theme', s.theme);
  }

  function renderLinks() {
    const arr = s.links.filter(x => x.e);
    if (!s.blocks.links || arr.length === 0) {
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
    el.linksBlock.style.display = '';
  }

  function renderEditor() {
    const frag = document.createDocumentFragment();
    for (const x of s.links) {
      const row = document.createElement('div');
      row.className = 'e-row';
      row.innerHTML =
        `<input type="checkbox" data-eid="${x.id}" data-f="e" ${x.e ? 'checked' : ''}>` +
        `<input type="text" data-eid="${x.id}" data-f="n" value="${escapeAttr(x.n)}">` +
        `<input type="text" data-eid="${x.id}" data-f="u" value="${escapeAttr(x.u)}">` +
        `<button type="button" data-del="${x.id}">✕</button>`;
      frag.appendChild(row);
    }
    el.editorList.replaceChildren(frag);
  }

  function renderInfo() {
    setText(el.vLang, navigator.language || 'Unknown');
    setText(el.vTz, Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown');
    setText(el.vUa, ua());

    const dnt = ['1', 'yes'].includes((navigator.doNotTrack || '').toLowerCase()) || ['1', 'yes'].includes((window.doNotTrack || '').toLowerCase());
    setState(el.vDnt, dnt ? 'Enabled' : 'Disabled', dnt ? 'ok' : 'warn');

    const gpc = navigator.globalPrivacyControl;
    if (gpc === undefined) setState(el.vGpc, 'Unsupported', 'dim');
    else setState(el.vGpc, gpc ? 'Enabled' : 'Disabled', gpc ? 'ok' : 'warn');

    const rtc = typeof window.RTCPeerConnection !== 'undefined';
    setState(el.vWebrtc, rtc ? 'Available' : 'Unavailable', rtc ? 'ok' : 'warn');

    const rows = el.infoBlock.querySelectorAll('[data-row-id]');
    let any = false;
    rows.forEach(r => {
      const on = !!s.rows[r.dataset.rowId];
      r.style.display = on ? '' : 'none';
      if (on) any = true;
    });
    if (!any) el.infoBlock.style.display = 'none';
    else if (s.blocks.info) el.infoBlock.style.display = '';
  }

  function focusSearch() {
    requestAnimationFrame(() => {
      if (!s.blocks.search) return;
      el.searchInput.focus({ preventScroll: true });
      el.searchInput.select();
    });
  }

  function hydrate() {
    const raw = safeParse(localStorage.getItem(K.CFG)) || {};
    const links = safeParse(localStorage.getItem(K.LINKS));
    return {
      theme: raw.theme || DEF.theme,
      engine: raw.engine || DEF.engine,
      blocks: { ...DEF.blocks, ...(raw.blocks || {}) },
      rows: { ...DEF.rows, ...(raw.rows || {}) },
      links: Array.isArray(links) && links.length ? links : DEF_LINKS
    };
  }

  function persist() {
    localStorage.setItem(K.CFG, JSON.stringify({
      theme: s.theme,
      engine: s.engine,
      blocks: s.blocks,
      rows: s.rows
    }));
    localStorage.setItem(K.LINKS, JSON.stringify(s.links));
  }

  function normalizeUrl(v) {
    if (!v) return '';
    const u = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const x = new URL(u);
      if (x.protocol !== 'http:' && x.protocol !== 'https:') return '';
      return x.href;
    } catch {
      return '';
    }
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

  function check(sel, v) {
    const x = document.querySelector(sel);
    if (x) x.checked = !!v;
  }

  function setText(node, text) {
    node.textContent = text;
    node.className = '';
  }

  function setState(node, text, cls) {
    node.textContent = text;
    node.className = cls;
  }

  function safeParse(sv) {
    try { return sv ? JSON.parse(sv) : null; } catch { return null; }
  }

  function escapeAttr(v) {
    return String(v).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  }

  function id() {
    return Math.random().toString(36).slice(2, 10);
  }
})();
