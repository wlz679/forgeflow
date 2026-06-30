/**
 * P2a favorites init layer component tests.
 * Covers: DOM scan, click toggle, storage event, render modes, error fallback.
 *
 * Strategy: hand-rolled minimal DOM stub (no jsdom/happy-dom in deps).
 * Run via: node tests/run.mjs tests/favorites-init.test.ts
 *
 * IMPORTANT: tsx caches module instances by absolute file URL even
 * across querystrings. The favorites-init module has module-level state
 * (initialized flag + isAvailable probe) that would normally be reset
 * per test via a fresh import — but since tsx re-uses the cached
 * instance, the same `init()` export is shared. To get reliable per-test
 * isolation, we use `node:child_process.spawnSync` per test to run the
 * suite in a fresh Node process. Each test is its own .test.ts file
 * invoked via Node test runner; we re-purpose by spawning once per
 * test using `node --test` on its own file.
 *
 * Implementation: each test below serializes its setup via a small
 * in-line runner that loads the init module fresh in a child process.
 * Tests assert via stdout JSON.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ============== Per-test runner ==============
// Each "test" spawns a child Node process that imports the init module
// fresh and runs a single scenario, printing a JSON line on stdout
// describing what happened. The parent test parses that line and
// asserts on its fields.

type ChildResult = Record<string, unknown>;

function spawnScenario(scenarioName: string, scriptBody: string): ChildResult {
  const tmp = mkdtempSync(join(tmpdir(), 'fav-init-'));
  const scenarioPath = join(tmp, `${scenarioName}.mjs`);
  // Inject INIT_MOD_URL as a const inside the child script.
  // Inject INIT_MOD_URL as a const inside the child script.
  const fullBody = `
const INIT_MOD_URL = '${INIT_MOD_URL.replace(/'/g, "\\'")}';
const LS_KEY = 'forgeflowkit:favorites:v1';

class StubEvent {
  constructor(type, init = {}) { Object.assign(this, init); this.type = type;
    this.defaultPrevented = false; this.bubbles = init.bubbles ?? false;
    this.cancelable = init.cancelable ?? true; }
  preventDefault() { this.defaultPrevented = true; }
  stopPropagation() {}
}
class StubCustomEvent extends StubEvent { constructor(t, i = {}) { super(t, i); this.detail = i.detail; } }
class StubElement {
  constructor(tag, attrs = {}, dataset = {}) { this.tagName = tag.toUpperCase(); this.children = []; this.parent = null;
    this.attrs = { ...attrs }; this.dataset = { ...dataset }; this.style = { display: '' }; this.title = '';
    this._text = ''; this._innerHTML = ''; this._isAnchor = false; this._listeners = []; }
  get textContent() {
    const parts = [];
    if (this._text) parts.push(this._text);
    for (const c of this.children) parts.push(c.textContent);
    return parts.join('');
  }
  set textContent(v) { this._text = v; this.children = []; this._innerHTML = ''; }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) {
    this._innerHTML = v;
    this.children = [];
    const re = /<([a-zA-Z][a-zA-Z0-9-]*)\\b([^>]*)>([^<]*?)<\\/\\1>|<([a-zA-Z][a-zA-Z0-9-]*)\\b([^>]*)\\/>/g;
    let m;
    while ((m = re.exec(v)) !== null) {
      if (m[1] !== undefined) {
        const a = {};
        const ar = /(\\w[\\w-]*)=("[^"]*"|'[^']*')/g;
        let ma;
        while ((ma = ar.exec(m[2])) !== null) a[ma[1]] = ma[2].slice(1, -1);
        const t = m[1].toLowerCase();
        const el = new StubElement(t, a);
        if (m[3]) el._text = m[3];
        if (t === 'a') { el._isAnchor = true; el.attrs.href = a.href ?? ''; }
        el.parent = this;
        this.children.push(el);
      } else if (m[4] !== undefined) {
        const a = {};
        const ar = /(\\w[\\w-]*)=("[^"]*"|'[^']*')/g;
        let ma;
        while ((ma = ar.exec(m[5])) !== null) a[ma[1]] = ma[2].slice(1, -1);
        const el = new StubElement(m[4].toLowerCase(), a);
        el.parent = this;
        this.children.push(el);
      }
    }
  }
  setAttribute(n, v) { this.attrs[n] = String(v); }
  getAttribute(n) { return this.attrs[n] ?? null; }
  addEventListener(t, fn) { this._listeners.push({ type: t, fn }); }
  removeEventListener(t, fn) { this._listeners = this._listeners.filter(l => !(l.type === t && l.fn === fn)); }
  dispatchEvent(ev) { ev.target = this;
    for (const l of this._listeners.filter(l => l.type === ev.type)) l.fn(ev);
    return !ev.defaultPrevented; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] ?? null; }
  querySelectorAll(sel) {
    const out = [];
    const parts = sel.split(',').map(s => s.trim());
    const matches = (n, s) => {
      s = s.trim();
      const m = s.match(/^([a-zA-Z][a-zA-Z0-9-]*)?(\\[(\\w[\\w-]*)(?:="([^"]*)")?\\])(.*)$/);
      if (m) {
        const [, tag, , attr, val, rest] = m;
        if (tag && n.tagName.toLowerCase() !== tag.toLowerCase()) return false;
        const dsKey = attr.replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        const dsKeyAlt = attr.replace(/^data-/, '').replace(/-/g, '');
        if (val === undefined) {
          if (n.attrs[attr] === undefined && n.dataset[dsKey] === undefined &&
              n.dataset[dsKeyAlt] === undefined && n.dataset[attr] === undefined) return false;
        } else {
          if (n.attrs[attr] !== val && n.dataset[dsKey] !== val &&
              n.dataset[dsKeyAlt] !== val && n.dataset[attr] !== val) return false;
        }
        if (rest) return matches(n, rest);
        return true;
      }
      return n.tagName.toLowerCase() === s.toLowerCase();
    };
    const walk = (n) => {
      for (const p of parts) if (matches(n, p)) { out.push(n); break; }
      for (const c of n.children) walk(c);
    };
    for (const c of this.children) walk(c);
    return out;
  }
}

const body = new StubElement('body');
const windowEl = new StubElement('window');
const doc = {
  readyState: 'complete',
  body,
  addEventListener(t, fn) { windowEl.addEventListener(t, fn); },
  removeEventListener(t, fn) { windowEl.removeEventListener(t, fn); },
  querySelectorAll(sel) { return body.querySelectorAll(sel); }
};
function makeShim(initial = {}) {
  const store = new Map(Object.entries(initial));
  return { getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => { store.set(k, v); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); }, key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; } };
}
${scriptBody}
`;
  writeFileSync(scenarioPath, fullBody);
  const r = spawnSync('node', ['--import', 'tsx', scenarioPath], {
    cwd: process.cwd(),
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
  });
  if (r.status !== 0 || !r.stdout.toString().trim()) {
    throw new Error(`child failed (status ${r.status}): stdout=${r.stdout.toString().slice(0, 500)} stderr=${r.stderr.toString().slice(0, 500)}`);
  }
  const lastLine = r.stdout.toString().trim().split('\n').filter(Boolean).pop()!;
  return JSON.parse(lastLine);
}

// ============== Helpers ==============
const LS_KEY = 'forgeflowkit:favorites:v1';
const CWD_PATH = process.cwd().replace(/\\/g, '/').replace(/^\/+/, '');
const INIT_MOD_URL =
  'file:///' + CWD_PATH + '/src/scripts/favorites-init.client.ts';

// Each test body returns process.exit() arguments via console.log(JSON.stringify(...))
// and exits with 0 if successful, non-zero otherwise.

// ---------- DOM scan ----------

test('DOM scan: init finds all [data-favorite-toggle] elements', () => {
  const result = spawnScenario('scan-toggle', `
(async () => {
  globalThis.Event = StubEvent;
  globalThis.CustomEvent = StubCustomEvent;
  globalThis.document = doc;
  globalThis.window = windowEl;
  globalThis.HTMLElement = StubElement;
  const shim = makeShim();
  globalThis.localStorage = shim;
  const btn1 = new StubElement('button', {}, { favoriteToggle: '', favoriteSlug: 'mrr' });
  const btn2 = new StubElement('button', {}, { favoriteToggle: '', favoriteSlug: 'ltv' });
  body.children.push(btn1, btn2);
  const mod = await import(INIT_MOD_URL);
  mod.init();
  const found = doc.querySelectorAll('[data-favorite-toggle]');
  console.log(JSON.stringify({ foundLen: found.length, a1: btn1.getAttribute('aria-pressed'), a2: btn2.getAttribute('aria-pressed') }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.foundLen, 2);
  assert.equal(result.a1, 'false');
  assert.equal(result.a2, 'false');
});

test('DOM scan: init finds all [data-favorites-container] elements', () => {
  const result = spawnScenario('scan-container', `
(async () => {
  globalThis.Event = StubEvent; globalThis.CustomEvent = StubCustomEvent;
  globalThis.document = doc; globalThis.window = windowEl; globalThis.HTMLElement = StubElement;
  globalThis.localStorage = makeShim();
  const c1 = new StubElement('div', {}, { favoritesContainer: '', mode: 'preview' });
  const c2 = new StubElement('div', {}, { favoritesContainer: '', mode: 'full' });
  body.children.push(c1, c2);
  const mod = await import(INIT_MOD_URL);
  mod.init();
  const found = doc.querySelectorAll('[data-favorites-container]');
  console.log(JSON.stringify({ foundLen: found.length }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.foundLen, 2);
});

test('DOM scan: init is a no-op when no elements present', () => {
  const result = spawnScenario('scan-empty', `
(async () => {
  globalThis.Event = StubEvent; globalThis.CustomEvent = StubCustomEvent;
  globalThis.document = doc; globalThis.window = windowEl; globalThis.HTMLElement = StubElement;
  globalThis.localStorage = makeShim();
  const mod = await import(INIT_MOD_URL);
  let threw = false;
  try { mod.init(); } catch (_) { threw = true; }
  console.log(JSON.stringify({ threw,
    t: doc.querySelectorAll('[data-favorite-toggle]').length,
    c: doc.querySelectorAll('[data-favorites-container]').length }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.threw, false);
  assert.equal(result.t, 0);
  assert.equal(result.c, 0);
});

// ---------- Click toggle ----------

test('Click toggle: first click adds slug to LS and sets aria-pressed=true', () => {
  const result = spawnScenario('click-first', `
(async () => {
  globalThis.Event = StubEvent; globalThis.CustomEvent = StubCustomEvent;
  globalThis.document = doc; globalThis.window = windowEl; globalThis.HTMLElement = StubElement;
  const shim = makeShim();
  globalThis.localStorage = shim;
  const btn = new StubElement('button', {}, { favoriteToggle: '', favoriteSlug: 'mrr' });
  body.children.push(btn);
  const mod = await import(INIT_MOD_URL);
  mod.init();
  btn.dispatchEvent(new StubEvent('click'));
  const raw = shim.getItem('${LS_KEY}');
  let parsed = null;
  try { parsed = raw ? JSON.parse(raw).slugs : null; } catch (_) {}
  console.log(JSON.stringify({ slugs: parsed, aria: btn.getAttribute('aria-pressed') }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.deepEqual(result.slugs, ['mrr']);
  assert.equal(result.aria, 'true');
});

test('Click toggle: second click removes slug and sets aria-pressed=false', () => {
  const result = spawnScenario('click-second', `
(async () => {
  globalThis.Event = StubEvent; globalThis.CustomEvent = StubCustomEvent;
  globalThis.document = doc; globalThis.window = windowEl; globalThis.HTMLElement = StubElement;
  const seed = { '${LS_KEY}': JSON.stringify({ version: 1, slugs: ['mrr'], lastUpdated: 'x' }) };
  globalThis.localStorage = makeShim(seed);
  const btn = new StubElement('button', {}, { favoriteToggle: '', favoriteSlug: 'mrr' });
  body.children.push(btn);
  const mod = await import(INIT_MOD_URL);
  mod.init();
  const before = btn.getAttribute('aria-pressed');
  btn.dispatchEvent(new StubEvent('click'));
  const parsed = JSON.parse(globalThis.localStorage.getItem('${LS_KEY}'));
  console.log(JSON.stringify({ before, after: btn.getAttribute('aria-pressed'), slugs: parsed.slugs }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.before, 'true');
  assert.equal(result.after, 'false');
  assert.deepEqual(result.slugs, []);
});

test('Click toggle: clicking twice is idempotent at the set level (1 add, 1 remove = empty)', () => {
  const result = spawnScenario('click-twice', `
(async () => {
  globalThis.Event = StubEvent; globalThis.CustomEvent = StubCustomEvent;
  globalThis.document = doc; globalThis.window = windowEl; globalThis.HTMLElement = StubElement;
  globalThis.localStorage = makeShim();
  const btn = new StubElement('button', {}, { favoriteToggle: '', favoriteSlug: 'mrr' });
  body.children.push(btn);
  const mod = await import(INIT_MOD_URL);
  mod.init();
  btn.dispatchEvent(new StubEvent('click'));
  btn.dispatchEvent(new StubEvent('click'));
  const parsed = JSON.parse(globalThis.localStorage.getItem('${LS_KEY}'));
  console.log(JSON.stringify({ slugs: parsed.slugs, aria: btn.getAttribute('aria-pressed') }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.deepEqual(result.slugs, []);
  assert.equal(result.aria, 'false');
});

test("Click toggle: click doesn't bubble to ancestor <a> (preventDefault/stopPropagation)", () => {
  const result = spawnScenario('click-no-bubble', `
(async () => {
  globalThis.Event = StubEvent; globalThis.CustomEvent = StubCustomEvent;
  globalThis.document = doc; globalThis.window = windowEl; globalThis.HTMLElement = StubElement;
  globalThis.localStorage = makeShim();
  const link = new StubElement('a', { href: './mrr/' });
  let anchorClicks = 0;
  link.addEventListener('click', () => { anchorClicks++; });
  const btn = new StubElement('button', {}, { favoriteToggle: '', favoriteSlug: 'mrr' });
  link.children.push(btn);
  body.children.push(link);
  const mod = await import(INIT_MOD_URL);
  mod.init();
  const ev = new StubEvent('click');
  btn.dispatchEvent(ev);
  console.log(JSON.stringify({ defaultPrevented: ev.defaultPrevented, anchorClicks }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.defaultPrevented, true);
  assert.equal(result.anchorClicks, 0);
});

// ---------- Storage event ----------

test('Storage event: external LS write (storage event with key match) triggers re-render', () => {
  const result = spawnScenario('storage-external', `
(async () => {
  globalThis.Event = StubEvent; globalThis.CustomEvent = StubCustomEvent;
  globalThis.document = doc; globalThis.window = windowEl; globalThis.HTMLElement = StubElement;
  const shim = makeShim();
  globalThis.localStorage = shim;
  const c = new StubElement('div', {}, { favoritesContainer: '', mode: 'count' });
  body.children.push(c);
  const mod = await import(INIT_MOD_URL);
  mod.init();
  const before = c.textContent;
  // Simulate the browser's storage event by mutating the underlying LS
  // (browsers do this for us when another tab writes the same key)
  const newEnv = { version: 1, slugs: ['x', 'y', 'z'], lastUpdated: 'x' };
  shim.setItem(LS_KEY, JSON.stringify(newEnv));
  const ev = new StubEvent('storage');
  ev.key = LS_KEY;
  ev.newValue = JSON.stringify(newEnv);
  windowEl.dispatchEvent(ev);
  console.log(JSON.stringify({ before, after: c.textContent }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.before, '0');
  assert.equal(result.after, '3');
});

test('Storage event: same-tab write does NOT trigger via storage event (use CustomEvent instead)', () => {
  const result = spawnScenario('storage-same-tab', `
(async () => {
  globalThis.Event = StubEvent; globalThis.CustomEvent = StubCustomEvent;
  globalThis.document = doc; globalThis.window = windowEl; globalThis.HTMLElement = StubElement;
  globalThis.localStorage = makeShim();
  let storageCount = 0;
  windowEl.addEventListener('storage', () => { storageCount++; });
  const btn = new StubElement('button', {}, { favoriteToggle: '', favoriteSlug: 'mrr' });
  body.children.push(btn);
  const mod = await import(INIT_MOD_URL);
  mod.init();
  btn.dispatchEvent(new StubEvent('click'));
  console.log(JSON.stringify({ storageCount, aria: btn.getAttribute('aria-pressed') }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.storageCount, 0);
  assert.equal(result.aria, 'true');
});

// ---------- Render modes ----------

test('Render preview mode: shows top 3 + View all (N) link when > 3 favorites', () => {
  const result = spawnScenario('render-preview', `
(async () => {
  globalThis.Event = StubEvent; globalThis.CustomEvent = StubCustomEvent;
  globalThis.document = doc; globalThis.window = windowEl; globalThis.HTMLElement = StubElement;
  const seed = { '${LS_KEY}': JSON.stringify({ version: 1, slugs: ['ltv', 'cac', 'mrr', 'churn', 'valuation'], lastUpdated: 'x' }) };
  globalThis.localStorage = makeShim(seed);
  const c = new StubElement('div', {}, { favoritesContainer: '', mode: 'preview' });
  body.children.push(c);
  const mod = await import(INIT_MOD_URL);
  mod.init();
  const html = c.innerHTML;
  console.log(JSON.stringify({
    hasLtv: /href="\\.\\/ltv\\/"/.test(html),
    hasMrr: /href="\\.\\/mrr\\/"/.test(html),
    hasValuation: /valuation/.test(html),
    hasViewAll: /View all \\(5\\)/.test(html),
  }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.hasLtv, true);
  assert.equal(result.hasMrr, true);
  assert.equal(result.hasValuation, false);
  assert.equal(result.hasViewAll, true);
});

test('Render full mode: renders all slugs into [data-favorites-grid]', () => {
  const result = spawnScenario('render-full', `
(async () => {
  globalThis.Event = StubEvent; globalThis.CustomEvent = StubCustomEvent;
  globalThis.document = doc; globalThis.window = windowEl; globalThis.HTMLElement = StubElement;
  const seed = { '${LS_KEY}': JSON.stringify({ version: 1, slugs: ['a', 'b', 'c'], lastUpdated: 'x' }) };
  globalThis.localStorage = makeShim(seed);
  const c = new StubElement('div', {}, { favoritesContainer: '', mode: 'full' });
  const grid = new StubElement('div', {}, { favoritesGrid: '' });
  const empty = new StubElement('div', {}, { favoritesEmpty: '' });
  c.children.push(grid, empty);
  body.children.push(c);
  const mod = await import(INIT_MOD_URL);
  mod.init();
  const html = grid.innerHTML;
  console.log(JSON.stringify({
    a: /href="\\.\\/a\\/"[\\s\\S]*class="[^"]*fav-card/.test(html),
    b: /href="\\.\\/b\\/"[\\s\\S]*class="[^"]*fav-card/.test(html),
    c: /href="\\.\\/c\\/"[\\s\\S]*class="[^"]*fav-card/.test(html),
    emptyDisplay: empty.style.display,
    gridDisplay: grid.style.display,
  }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.a, true);
  assert.equal(result.b, true);
  assert.equal(result.c, true);
  assert.equal(result.emptyDisplay, 'none');
  assert.equal(result.gridDisplay, '');
});

test('Render full mode: empty state shows appropriate copy when slugs is empty', () => {
  const result = spawnScenario('render-full-empty', `
(async () => {
  globalThis.Event = StubEvent; globalThis.CustomEvent = StubCustomEvent;
  globalThis.document = doc; globalThis.window = windowEl; globalThis.HTMLElement = StubElement;
  globalThis.localStorage = makeShim();
  const c = new StubElement('div', {}, { favoritesContainer: '', mode: 'full' });
  const grid = new StubElement('div', {}, { favoritesGrid: '' });
  const empty = new StubElement('div', {}, { favoritesEmpty: '' });
  c.children.push(grid, empty);
  body.children.push(c);
  const mod = await import(INIT_MOD_URL);
  mod.init();
  console.log(JSON.stringify({
    emptyDisplay: empty.style.display,
    gridDisplay: grid.style.display,
    gridHtml: grid.innerHTML,
  }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.emptyDisplay, '');
  assert.equal(result.gridDisplay, 'none');
  assert.equal(result.gridHtml, '');
});

test('Render count mode: renders just the slug count as text', () => {
  const result = spawnScenario('render-count', `
(async () => {
  globalThis.Event = StubEvent; globalThis.CustomEvent = StubCustomEvent;
  globalThis.document = doc; globalThis.window = windowEl; globalThis.HTMLElement = StubElement;
  const seed = { '${LS_KEY}': JSON.stringify({ version: 1, slugs: ['x', 'y'], lastUpdated: 'x' }) };
  globalThis.localStorage = makeShim(seed);
  const c = new StubElement('div', {}, { favoritesContainer: '', mode: 'count' });
  body.children.push(c);
  const mod = await import(INIT_MOD_URL);
  mod.init();
  console.log(JSON.stringify({ text: c.textContent }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.text, '2');
});

// ---------- Error handling ----------

test('Error handling: FavoritesUnavailableError -> toggle button title="unavailable"', () => {
  const result = spawnScenario('err-unavailable', `
(async () => {
  globalThis.Event = StubEvent; globalThis.CustomEvent = StubCustomEvent;
  globalThis.document = doc; globalThis.window = windowEl; globalThis.HTMLElement = StubElement;
  // shim with no localStorage at all — probe() returns false,
  // isAvailable() returns false, init() takes the early-return path
  // and sets btn.title to "unavailable".
  const btn = new StubElement('button', {}, { favoriteToggle: '', favoriteSlug: 'mrr' });
  body.children.push(btn);
  // Empty getter that throws => probe fails => isAvailable()=false.
  const stub = new Proxy({}, {
    get() { throw new Error('SecurityError: localStorage blocked'); },
    has() { return true; }
  });
  globalThis.localStorage = stub;
  const mod = await import(INIT_MOD_URL);
  mod.init();
  console.log(JSON.stringify({ title: btn.title, aria: btn.getAttribute('aria-disabled') }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.match(result.title, /unavailable/i);
  assert.equal(result.aria, 'true');
});

test('Error handling: QuotaExceededError -> toggle button title includes "quota full" message', () => {
  const result = spawnScenario('err-quota', `
(async () => {
  globalThis.Event = StubEvent; globalThis.CustomEvent = StubCustomEvent;
  globalThis.document = doc; globalThis.window = windowEl; globalThis.HTMLElement = StubElement;
  const store = new Map();
  const shim = {
    getItem: (k) => store.has(k) ? store.get(k) : null,
    setItem: (k, v) => {
      if (k === '__fav_probe__') { store.set(k, v); return; }
      const e = new Error('quota exceeded');
      e.name = 'QuotaExceededError';
      throw e;
    },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size; }
  };
  globalThis.localStorage = shim;
  const btn = new StubElement('button', {}, { favoriteToggle: '', favoriteSlug: 'mrr' });
  body.children.push(btn);
  const mod = await import(INIT_MOD_URL);
  mod.init();
  btn.dispatchEvent(new StubEvent('click'));
  console.log(JSON.stringify({ title: btn.title, aria: btn.getAttribute('aria-pressed') }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.match(result.title, /storage limit/i);
});
