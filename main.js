(() => {
  const K = { CFG: 'sp_cfg_v8', LINKS: 'sp_links_v4' };

  const ENGINES = {
    google:     'https://www.google.com/search?q=',
    duckduckgo: 'https://duckduckgo.com/?q=',
    yandex:     'https://yandex.com/search/?text=',
    bing:       'https://www.bing.com/search?q=',
    brave:      'https://search.brave.com/search?q=',
    startpage:  'https://www.startpage.com/do/search?q='
  };

  const DEF = {
    theme:  'gruvbox-dark',
    engine: 'google',
    blocks: { search: true, links: true, ip: true }
  };

  const DEF_LINKS = [
    { id: id(), n: 'claude',      u: 'https://claude.ai/new',  e: 1 },
    { id: id(), n: 'github',      u: 'https://github.com',      e: 1 },
    { id: id(), n: 'reddit',      u: 'https://reddit.com',      e: 1 },
    { id: id(), n: 'distrowatch', u: 'https://distrowatch.com', e: 1 },
    { id: id(), n: 'x',           u: 'https://x.com',           e: 1 }
  ];

  const s  = hydrate();
  const el = {};
  let   ipInited = false;

  document.addEventListener('DOMContentLoaded', () => {
    mapEls();
    bind();
    renderAll();
    if (s.blocks.search) focusSearch();
    if (s.blocks.ip) initIp();
  });

  function mapEls() {
    el.btn         = document.getElementById('settings-btn');
    el.panel       = document.getElementById('settings-panel');
    el.searchBlock = document.getElementById('search-block');
    el.searchInput = document.getElementById('search-input');
    el.linksBlock  = document.getElementById('links-block');
    el.linksList   = document.getElementById('links-list');
    el.ipBlock     = document.getElementById('ip-block');
    el.editorList  = document.getElementById('editor-list');
    el.newName     = document.getElementById('new-name');
    el.newUrl      = document.getElementById('new-url');
    el.addBtn      = document.getElementById('add-link');
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
  }

  function onPanelChange(e) {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;

    if      (t.name === 'theme')  s.theme = t.value;
    else if (t.name === 'engine') s.engine = t.value;
    else if (t.dataset.block)     s.blocks[t.dataset.block] = t.checked;
    else if (t.dataset.eid)       updateLinkField(t);

    persist();
    renderAll();
    if (s.blocks.ip && !ipInited) initIp();
  }

  function onPanelClick(e) {
    const btn = e.target.closest('button[data-del]');
    if (!btn) return;
    s.links = s.links.filter(x => x.id !== btn.dataset.del);
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
    el.newUrl.value  = '';
    persist();
    renderLinks();
    renderEditor();
  }

  function updateLinkField(input) {
    const item = s.links.find(x => x.id === input.dataset.eid);
    if (!item) return;
    const f = input.dataset.f;
    if (f === 'e') item.e = input.checked ? 1 : 0;
    if (f === 'n') item.n = input.value.trim() || 'link';
    if (f === 'u') {
      const u = normalizeUrl(input.value.trim());
      if (u) item.u = u;
      input.value = item.u;
    }
  }

  function renderAll() {
    document.documentElement.dataset.theme = s.theme;
    syncControls();
    applyBlocks();
    renderLinks();
    renderEditor();
  }

  function syncControls() {
    setChecked(`input[name="theme"][value="${s.theme}"]`,   true);
    setChecked(`input[name="engine"][value="${s.engine}"]`, true);
    setChecked('input[data-block="search"]', !!s.blocks.search);
    setChecked('input[data-block="links"]',  !!s.blocks.links);
    setChecked('input[data-block="ip"]',     !!s.blocks.ip);
  }

  function applyBlocks() {
    el.searchBlock.style.display = s.blocks.search ? '' : 'none';
    el.linksBlock.style.display  = s.blocks.links  ? '' : 'none';
    el.ipBlock.style.display     = s.blocks.ip     ? '' : 'none';
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
      const a  = document.createElement('a');
      a.href        = x.u;
      a.textContent = x.n;
      a.rel         = 'noopener noreferrer';
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


  function initIp() {
    if (ipInited) return;
    ipInited = true;
    el.ipCheckBtn = document.getElementById('ip-check-btn');
    el.ipOutput   = document.getElementById('ip-output');
    el.ipCheckBtn.addEventListener('click', fetchIp);
  }

  async function fetchIp() {
    el.ipCheckBtn.disabled    = true;
    el.ipCheckBtn.textContent = '…';
    el.ipOutput.innerHTML     = '';

    try {
      const res = await fetch('https://api.ipapi.is/');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();

      el.ipOutput.innerHTML = colorizeJson({
        ip:            d.ip,
        country:       d.location?.country_code,
        city:          d.location?.city,
        timezone:      d.location?.timezone,
        asn:           `AS${d.asn?.asn}`,
        provider:      d.asn?.org,
        type:          d.company?.type,
        is_vpn:        d.is_vpn,
        is_proxy:      d.is_proxy,
        is_tor:        d.is_tor,
        is_datacenter: d.is_datacenter
      });

    } catch (err) {
      el.ipOutput.innerHTML = `<span class="j-warn">"${esc(err.message)}"</span>`;
    } finally {
      el.ipCheckBtn.disabled    = false;
      el.ipCheckBtn.textContent = 'check';
    }
  }

  function colorizeJson(obj) {
    const vpnFields = new Set(['is_vpn', 'is_proxy', 'is_tor']);
    const keys  = Object.keys(obj);
    const lines = ['{'];

    keys.forEach((key, i) => {
      const val   = obj[key];
      const comma = i < keys.length - 1 ? ',' : '';
      const k     = `<span class="j-key">"${key}"</span>`;
      let v;

      if (typeof val === 'boolean') {
        if (vpnFields.has(key))
          v = `<span class="${val ? 'j-ok' : 'j-dim'}">${val}</span>`;
        else if (key === 'is_datacenter')
          v = `<span class="${val ? 'j-warn' : 'j-dim'}">${val}</span>`;
        else
          v = `<span class="j-dim">${val}</span>`;
      } else if (val == null) {
        v = `<span class="j-dim">null</span>`;
      } else {
        let cls = 'j-str';
        if (key === 'type' && val === 'isp')                        cls = 'j-warn';
        if (key === 'type' && (val === 'vpn' || val === 'hosting')) cls = 'j-ok';
        v = `<span class="${cls}">"${esc(String(val))}"</span>`;
      }

      lines.push(`  ${k}: ${v}${comma}`);
    });

    lines.push('}');
    return lines.join('\n');
  }


  function focusSearch() {
    requestAnimationFrame(() => {
      if (!s.blocks.search) return;
      el.searchInput.focus({ preventScroll: true });
      el.searchInput.select();
    });
  }

  function normalizeUrl(v) {
    if (!v) return '';
    const raw = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const u = new URL(raw);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
      return u.href;
    } catch { return ''; }
  }

  function hydrate() {
    const raw   = parse(localStorage.getItem(K.CFG)) || {};
    const links = parse(localStorage.getItem(K.LINKS));
    return {
      theme:  raw.theme  || DEF.theme,
      engine: raw.engine || DEF.engine,
      blocks: { ...DEF.blocks, ...(raw.blocks || {}) },
      links:  Array.isArray(links) && links.length ? links : DEF_LINKS
    };
  }

  function persist() {
    localStorage.setItem(K.CFG, JSON.stringify({
      theme:  s.theme,
      engine: s.engine,
      blocks: s.blocks
    }));
    localStorage.setItem(K.LINKS, JSON.stringify(s.links));
  }

  function setChecked(selector, checked) {
    const node = document.querySelector(selector);
    if (node) node.checked = !!checked;
  }

  function parse(v) {
    try { return v ? JSON.parse(v) : null; } catch { return null; }
  }

  function esc(v) {
    return String(v)
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  function id() {
    return Math.random().toString(36).slice(2, 10);
  }
})();
