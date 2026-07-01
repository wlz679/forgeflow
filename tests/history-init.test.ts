/**
 * P2c history-init component tests.
 * Hand-rolled DOM stub via per-test child process (no jsdom).
 * Run via: node tests/run.mjs tests/history-init.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type ChildResult = { ok: boolean; stdout: string; stderr: string };

// Build the file:// URL for the init module. On Windows, paths look like
// D:/E/独立站/youtube-tools — we must not strip the colon from the drive letter.
const CWD_PATH = process.cwd().replace(/\\/g, '/');
const INIT_MOD_URL = 'file:///' + CWD_PATH.replace(/^\/+/, '') + '/src/scripts/history-init.client.ts';

function runChild(scenario: string, opts: { pathname?: string; lsStore?: Record<string, string>; lang?: string; search?: string } = {}): ChildResult {
  const dir = mkdtempSync(join(tmpdir(), 'p2c-test-'));
  const tmpFile = join(dir, 'scenario.mjs');

  const lsStoreJson = JSON.stringify(opts.lsStore ?? {});
  const pathname = opts.pathname ?? '/en/';
  const search = opts.search ?? '';
  const lang = opts.lang ?? 'en';

  // Build inline shim + scenario. The child:
  // 1. sets up globalThis.document/window with our StubElement
  // 2. sets globalThis.localStorage
  // 3. sets globalThis.window.location
  // 4. sets globalThis.window.__i18n_history__
  // 5. imports the init module
  // 6. awaits DOMContentLoaded callback
  // 7. prints scenario-defined assertions as JSON to stdout
  const code = `
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// === Stub DOM (same as P2b) ===
class StubNode {
  constructor() {
    this.children = [];
    this.attributes = {};
    this._textContent = '';
    this._innerHTML = '';
    this.dataset = {};
    this.style = {};
    this.classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
  }
  get textContent() { return this._textContent; }
  set textContent(v) { this._textContent = String(v); }
  get innerHTML() { return this._innerHTML; }
  set innerHTML(v) { this._innerHTML = String(v); }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  removeChild(c) { c.parent = null; this.children = this.children.filter(x => x !== c); return c; }
  get firstChild() { return this.children[0] ?? null; }
  get parentElement() { return this.parent ?? null; }
  setAttribute(k, v) { this.attributes[k] = String(v); }
  removeAttribute(k) { delete this.attributes[k]; }
  getAttribute(k) { return this.attributes[k] ?? null; }
  hasAttribute(k) { return k in this.attributes; }
  addEventListener() {}
  removeEventListener() {}
  querySelector(sel) { return this._findAll(sel)[0] ?? null; }
  querySelectorAll(sel) { return this._findAll(sel); }
  _findAll(sel) {
    const out = [];
    const sels = sel.split(',').map(s => s.trim());
    const walk = (n) => {
      for (const s of sels) {
        if (n._matches && n._matches(s)) { out.push(n); break; }
      }
      for (const c of n.children) walk(c);
    };
    walk(this);
    return out;
  }
  get className() { return this.attributes.class ?? ''; }
  set className(v) { this.attributes.class = v; }
}
class StubElement extends StubNode {
  constructor() { super(); this._isElement = true; this.tagName = 'DIV'; this.id = ''; }
  get value() { return this.attributes.value ?? ''; }
  set value(v) { this.attributes.value = String(v); }
  submit() { /* fire submit event */ if (this._onsubmit) this._onsubmit(); }
  click() {
    /* fire click event */
    if (this._onclick) this._onclick();
    if (this._listeners && this._listeners['click']) {
      for (const cb of this._listeners['click']) cb({ type: 'click', preventDefault() {}, stopPropagation() {}, target: this, currentTarget: this });
    }
    // Also dispatch to document-level listeners (event delegation)
    if (globalThis.document && globalThis.document._listeners && globalThis.document._listeners['click']) {
      const ev = { type: 'click', preventDefault() {}, stopPropagation() {}, target: this, currentTarget: this };
      for (const cb of globalThis.document._listeners['click']) cb(ev);
    }
  }
  addEventListener(type, cb) { this._listeners = this._listeners || {}; this._listeners[type] = this._listeners[type] || []; this._listeners[type].push(cb); }
  removeEventListener() {}
  _matches(sel) {
    if (sel.startsWith('[data-')) {
      const m = sel.match(/^\\[data-([a-z-]+)(?:=([\\\"\\\']?)([^\\\"\\\']+)\\2)?\\]$/);
      if (!m) return false;
      const [, key, , val] = m;
      const attrKey = 'data-' + key;
      if (val) return this.attributes[attrKey] === val;
      return attrKey in this.attributes;
    }
    return this.tagName === sel.toUpperCase();
  }
  closest(sel) {
    // Walk up parent chain. Support [data-attr] selectors.
    const sels = sel.split(',').map(s => s.trim());
    let cur = this;
    while (cur) {
      for (const s of sels) {
        if (cur._matches && cur._matches(s)) return cur;
      }
      cur = cur.parent ?? null;
    }
    return null;
  }
}
class StubDocument {
  constructor() {
    this.body = new StubElement();
    this.body.tagName = 'BODY';
    this.head = new StubElement();
    this.head.tagName = 'HEAD';
    this._listeners = {};
  }
  addEventListener(ev, cb) {
    this._listeners[ev] = this._listeners[ev] || [];
    this._listeners[ev].push(cb);
    if (ev === 'DOMContentLoaded') setImmediate(cb);
  }
  dispatchEvent(ev) {
    const cbs = this._listeners[ev.type] ?? [];
    for (const cb of cbs) cb(ev);
  }
  createElement(tag) {
    const e = new StubElement();
    e.tagName = tag.toUpperCase();
    return e;
  }
  createTextNode(t) { const n = new StubNode(); n._textContent = t; return n; }
  getElementById(id) {
    const walk = (n) => {
      if (n.id === id) return n;
      for (const c of n.children) { const r = walk(c); if (r) return r; }
      return null;
    };
    return walk(this.body) || walk(this.head);
  }
  querySelector(sel) { return this.body._findAll(sel)[0] ?? null; }
  querySelectorAll(sel) { return this.body._findAll(sel); }
}

globalThis.document = new StubDocument();
const winListeners = {};
globalThis.window = {
  location: { pathname: ${JSON.stringify(pathname)}, search: ${JSON.stringify(search)}, href: 'http://localhost${pathname}${search}' },
  addEventListener(ev, cb) { winListeners[ev] = winListeners[ev] || []; winListeners[ev].push(cb); },
  removeEventListener() {},
  dispatchEvent(ev) { const cbs = winListeners[ev.type] || []; for (const cb of cbs) cb(ev); },
  history: { replaceState() {}, pushState() {} },
  __i18n_history__: {
    en: {
      'history.title': 'History',
      'history.subtitle': '{count} snapshots saved',
      'history.empty.title': 'No history yet',
      'history.empty.body': 'Save a calculation to see it here',
      'history.empty.browse': 'Browse all tools',
      'history.header_label': 'History',
      'history.dropdown.view_all': 'View all ({count}) →',
      'history.dropdown.empty': 'No history yet',
      'history.btn.save': 'Save',
      'history.btn.saved': 'Saved',
      'history.btn.restore': '↺ Restore',
      'history.btn.delete': '🗑',
      'history.clear_all': 'Clear all',
      'history.clear_all.confirm': 'Delete all {count} snapshots? This cannot be undone.',
    },
    zh: {
      'history.title': '历史快照',
      'history.subtitle': '已保存 {count} 个快照',
      'history.empty.title': '暂无历史',
      'history.empty.body': '保存计算后将在此显示',
      'history.empty.browse': '浏览全部工具',
      'history.header_label': '历史快照',
      'history.dropdown.view_all': '查看全部 ({count}) →',
      'history.dropdown.empty': '暂无历史',
      'history.btn.save': '保存',
      'history.btn.saved': '已保存',
      'history.btn.restore': '↺ 恢复',
      'history.btn.delete': '🗑',
      'history.clear_all': '清空全部',
      'history.clear_all.confirm': '删除全部 {count} 个快照？此操作不可撤销。',
    },
  },
};
const lsStore = ${lsStoreJson};
globalThis.localStorage = {
  getItem(k) { return lsStore[k] ?? null; },
  setItem(k, v) { lsStore[k] = v; },
  removeItem(k) { delete lsStore[k]; },
  clear() { for (const k of Object.keys(lsStore)) delete lsStore[k]; },
  key(i) { return Object.keys(lsStore)[i] ?? null; },
  get length() { return Object.keys(lsStore).length; },
};
globalThis.Event = class Event { constructor(t) { this.type = t; } };
globalThis.CustomEvent = class CustomEvent { constructor(t, init) { this.type = t; this.detail = init?.detail; } };
globalThis.HTMLElement = StubElement;
globalThis.Storage = class {};
// Note: Node 20+ exposes globalThis.crypto.randomUUID natively — no shim needed.
globalThis.btoa = (s) => Buffer.from(s, 'utf-8').toString('base64');
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('utf-8');

// === Pre-populate document with shared scenarios ===

// ResultCard with [💾 保存] button
const resultCard = document.createElement('div');
resultCard.id = 'result-card';
const saveBtn = document.createElement('button');
saveBtn.setAttribute('data-history-save', '');
resultCard.appendChild(saveBtn);
document.body.appendChild(resultCard);

// Header dropdown preview container
const previewContainer = document.createElement('div');
previewContainer.setAttribute('data-history-container', '');
previewContainer.setAttribute('data-mode', 'preview');
previewContainer.id = 'header-history';
document.body.appendChild(previewContainer);

// === Import init module ===
const initUrl = ${JSON.stringify(INIT_MOD_URL)};
const initMod = await import(initUrl + '?t=' + Date.now());

// Give the setImmediate(DOMContentLoaded) one tick to fire
await new Promise(r => setImmediate(r));
await new Promise(r => setImmediate(r));

// === Scenario-specific assertions ===
const out = { ok: true, checks: [] };
function check(name, pass, info) {
  out.checks.push({ name, pass: !!pass, info });
  if (!pass) out.ok = false;
}

${scenario}

// Write JSON to stdout (parent will parse)
process.stdout.write('JSONRESULT_BEGIN' + JSON.stringify(out) + 'JSONRESULT_END');
`;

  writeFileSync(tmpFile, code);
  const result = spawnSync('node', ['--import', 'tsx', tmpFile], {
    encoding: 'utf-8',
    cwd: process.cwd(),
    shell: process.platform === 'win32',
  });
  const m = result.stdout.match(/JSONRESULT_BEGIN(.+?)JSONRESULT_END/);
  if (!m) {
    return { ok: false, stdout: result.stdout, stderr: result.stderr };
  }
  const parsed = JSON.parse(m[1]);
  return { ok: parsed.ok, stdout: JSON.stringify(parsed, null, 2), stderr: result.stderr };
}

// === Tests ===

test('init: prefill from URL ?prefill= fills form fields', () => {
  const scenario = `
  // init() ran during module load with the URL set in spawn options. Since the
  // form didn't exist at that time, init's prefill call no-op'd and cleared the
  // URL. Now we have a form, so re-inject the prefill param into window.location
  // and call the test seam to verify the fill path.
  const form = document.createElement('form');
  form.id = 'tool-form';
  const input1 = document.createElement('input');
  input1.setAttribute('name', 'subscriberCount');
  input1.setAttribute('id', 'subscriberCount');
  form.appendChild(input1);
  const input2 = document.createElement('input');
  input2.setAttribute('name', 'monthlyPrice');
  input2.setAttribute('id', 'monthlyPrice');
  form.appendChild(input2);
  document.body.appendChild(form);

  // Stub history.replaceState so the handler's URL-cleanup is observable.
  let replaceStateArgs = null;
  globalThis.window.history.replaceState = (_state, _title, url) => { replaceStateArgs = url; };

  // Re-stamp the prefill param onto location.search and re-run the handler.
  const prefillParam = ${JSON.stringify(`?prefill=${Buffer.from(JSON.stringify({ subscriberCount: '1000', monthlyPrice: '5.99' }), 'utf-8').toString('base64')}`)};
  globalThis.window.location.search = prefillParam;
  globalThis.window.location.href = 'http://localhost/en/solopreneur-mrr-calculator/' + prefillParam;
  // Set form + input IDs directly on the stub's instance field (StubElement.getElementById
  // walks \`n.id === id\`, not the attribute map — setAttribute alone wouldn't be queryable).
  form.id = 'tool-form';
  input1.id = 'subscriberCount';
  input2.id = 'monthlyPrice';
  initMod.handlePrefillFromURL();

  // Assert: form fields are filled from decoded base64
  check('subscriberCount filled from prefill', input1.value === '1000', 'got: ' + input1.value);
  check('monthlyPrice filled from prefill', input2.value === '5.99', 'got: ' + input2.value);

  // Assert: URL was cleaned (replaceState called with search without prefill)
  check('replaceState called with cleaned URL', replaceStateArgs !== null && !replaceStateArgs.includes('prefill='), 'replaceStateArgs: ' + replaceStateArgs);

  // Assert: handler did not throw
  check('handler did not throw', true);
  `;
  const inputs = { subscriberCount: '1000', monthlyPrice: '5.99' };
  const encoded = Buffer.from(JSON.stringify(inputs), 'utf-8').toString('base64');
  const r = runChild(scenario, {
    pathname: '/en/solopreneur-mrr-calculator/',
    search: `?prefill=${encoded}`,
  });
  assert.equal(r.ok, true, r.stdout + '\n' + r.stderr);
});

test('init: invalid prefill base64 is silently ignored', () => {
  const scenario = `
  // No form, just verify init doesn't crash
  check('no crash', true);
  `;
  const r = runChild(scenario, {
    pathname: '/en/solopreneur-mrr-calculator/',
    search: '?prefill=not-valid-base64!!!',
  });
  assert.equal(r.ok, true, r.stdout + '\n' + r.stderr);
});

test('init: [data-history-save] click writes LS with form data', () => {
  const scenario = `
  // Pre-populate form
  const form = document.createElement('form');
  form.id = 'tool-form';
  const input = document.createElement('input');
  input.setAttribute('name', 'subscriberCount');
  input.setAttribute('id', 'subscriberCount');
  input.value = '1000';
  form.appendChild(input);
  document.body.appendChild(form);
  // Manually trigger save by simulating click on saveBtn
  saveBtn.click();
  await new Promise(r => setImmediate(r));
  const ls = JSON.parse(globalThis.localStorage.getItem('forgeflowkit:history:v1'));
  check('LS has 1 entry', ls?.entries?.length === 1, 'got: ' + ls?.entries?.length);
  check('entry slug is correct', ls?.entries?.[0]?.slug === 'solopreneur-mrr-calculator');
  check('entry inputs has subscriberCount', ls?.entries?.[0]?.inputs?.subscriberCount === '1000');
  `;
  const r = runChild(scenario, {
    pathname: '/en/solopreneur-mrr-calculator/',
  });
  assert.equal(r.ok, true, r.stdout + '\n' + r.stderr);
});

test('init: preview mode renders top 5 + view_all link', () => {
  const scenario = `
  // Pre-seed 6 entries
  const ls = JSON.parse(globalThis.localStorage.getItem('forgeflowkit:history:v1'));
  check('6 entries pre-seeded', ls.entries.length === 6);
  const container = document.getElementById('header-history');
  const links = container.querySelectorAll('a');
  check('has 5+ links (top 5 + view_all)', links.length >= 5, 'got: ' + links.length);
  `;
  const lsStore: Record<string, string> = {
    'forgeflowkit:history:v1': JSON.stringify({
      version: 1,
      entries: Array.from({ length: 6 }, (_, i) => ({
        id: `e-${i}`, slug: 'mrr', inputs: {x: String(i)}, result: 'r',
        savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z',
      })),
      lastUpdated: '2026-07-01T10:00:00Z',
    }),
  };
  const r = runChild(scenario, { pathname: '/en/', lsStore });
  assert.equal(r.ok, true, r.stdout + '\n' + r.stderr);
});

test('init: full mode renders all entries as cards with restore + delete buttons', () => {
  const scenario = `
  // Add full-mode container
  const fullContainer = document.createElement('div');
  fullContainer.setAttribute('data-history-container', '');
  fullContainer.setAttribute('data-mode', 'full');
  fullContainer.id = 'full-history';
  document.body.appendChild(fullContainer);
  // Force re-render via test seam (P2b precedent: \`?t=\` cache-buster doesn't work under tsx)
  initMod.renderAll();
  await new Promise(r => setImmediate(r));
  const fc = document.getElementById('full-history');
  check('full container has children', fc.children.length > 0);
  // Should have restore + delete buttons
  const restoreBtns = fc.querySelectorAll('[data-history-restore]');
  const deleteBtns = fc.querySelectorAll('[data-history-delete]');
  check('has restore buttons', restoreBtns.length >= 1, 'got: ' + restoreBtns.length);
  check('has delete buttons', deleteBtns.length >= 1, 'got: ' + deleteBtns.length);
  `;
  const lsStore: Record<string, string> = {
    'forgeflowkit:history:v1': JSON.stringify({
      version: 1,
      entries: [
        { id: 'a', slug: 'mrr', inputs: {x: '1'}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      ],
      lastUpdated: '2026-07-01T10:00:00Z',
    }),
  };
  const r = runChild(scenario, { pathname: '/en/', lsStore });
  assert.equal(r.ok, true, r.stdout + '\n' + r.stderr);
});

test('init: [data-history-restore] click navigates to tool page with prefill', () => {
  const scenario = `
  // Stub window.location.href assignment
  let navigated = null;
  Object.defineProperty(globalThis.window.location, 'href', {
    get() { return ''; },
    set(v) { navigated = v; },
    configurable: true,
  });
  const fullContainer = document.createElement('div');
  fullContainer.setAttribute('data-history-container', '');
  fullContainer.setAttribute('data-mode', 'full');
  fullContainer.id = 'full-history';
  document.body.appendChild(fullContainer);
  // Force re-render via test seam
  initMod.renderAll();
  await new Promise(r => setImmediate(r));
  const restoreBtn = document.querySelector('[data-history-restore]');
  check('restore button exists', restoreBtn !== null);
  restoreBtn.click();
  await new Promise(r => setImmediate(r));
  check('navigated to tool page', navigated !== null && navigated.includes('mrr-calculator'), 'navigated: ' + navigated);
  check('navigated URL has prefill', navigated !== null && navigated.includes('prefill='), 'navigated: ' + navigated);
  `;
  const lsStore: Record<string, string> = {
    'forgeflowkit:history:v1': JSON.stringify({
      version: 1,
      entries: [
        { id: 'a', slug: 'solopreneur-mrr-calculator', inputs: {subscriberCount: '1000'}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      ],
      lastUpdated: '2026-07-01T10:00:00Z',
    }),
  };
  const r = runChild(scenario, { pathname: '/en/', lsStore });
  assert.equal(r.ok, true, r.stdout + '\n' + r.stderr);
});

test('init: [data-history-delete] click removes entry from LS', () => {
  const scenario = `
  const fullContainer = document.createElement('div');
  fullContainer.setAttribute('data-history-container', '');
  fullContainer.setAttribute('data-mode', 'full');
  fullContainer.id = 'full-history';
  document.body.appendChild(fullContainer);
  // Force re-render via test seam
  initMod.renderAll();
  await new Promise(r => setImmediate(r));
  const deleteBtn = document.querySelector('[data-history-delete]');
  check('delete button exists', deleteBtn !== null);
  deleteBtn.click();
  await new Promise(r => setImmediate(r));
  const ls = JSON.parse(globalThis.localStorage.getItem('forgeflowkit:history:v1'));
  check('LS has 0 entries after delete', ls.entries.length === 0, 'got: ' + ls.entries.length);
  `;
  const lsStore: Record<string, string> = {
    'forgeflowkit:history:v1': JSON.stringify({
      version: 1,
      entries: [
        { id: 'a', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      ],
      lastUpdated: '2026-07-01T10:00:00Z',
    }),
  };
  const r = runChild(scenario, { pathname: '/en/', lsStore });
  assert.equal(r.ok, true, r.stdout + '\n' + r.stderr);
});

test('init: [data-history-clear-all] click clears all entries', () => {
  const scenario = `
  // Stub confirm() to return true
  globalThis.confirm = () => true;
  const fullContainer = document.createElement('div');
  fullContainer.setAttribute('data-history-container', '');
  fullContainer.setAttribute('data-mode', 'full');
  fullContainer.id = 'full-history';
  document.body.appendChild(fullContainer);
  const clearAllBtn = document.createElement('button');
  clearAllBtn.setAttribute('data-history-clear-all', '');
  document.body.appendChild(clearAllBtn);
  // Force re-render via test seam
  initMod.renderAll();
  await new Promise(r => setImmediate(r));
  clearAllBtn.click();
  await new Promise(r => setImmediate(r));
  const ls = JSON.parse(globalThis.localStorage.getItem('forgeflowkit:history:v1'));
  check('LS entries empty after clear all', ls.entries.length === 0, 'got: ' + ls.entries.length);
  `;
  const lsStore: Record<string, string> = {
    'forgeflowkit:history:v1': JSON.stringify({
      version: 1,
      entries: [
        { id: 'a', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
        { id: 'b', slug: 'cac', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      ],
      lastUpdated: '2026-07-01T10:00:00Z',
    }),
  };
  const r = runChild(scenario, { pathname: '/en/', lsStore });
  assert.equal(r.ok, true, r.stdout + '\n' + r.stderr);
});

test('init: [data-history-clear-all] cancelled (confirm false) does not clear', () => {
  const scenario = `
  globalThis.confirm = () => false;
  const fullContainer = document.createElement('div');
  fullContainer.setAttribute('data-history-container', '');
  fullContainer.setAttribute('data-mode', 'full');
  fullContainer.id = 'full-history';
  document.body.appendChild(fullContainer);
  const clearAllBtn = document.createElement('button');
  clearAllBtn.setAttribute('data-history-clear-all', '');
  document.body.appendChild(clearAllBtn);
  // Force re-render via test seam
  initMod.renderAll();
  await new Promise(r => setImmediate(r));
  clearAllBtn.click();
  await new Promise(r => setImmediate(r));
  const ls = JSON.parse(globalThis.localStorage.getItem('forgeflowkit:history:v1'));
  check('LS entries still present after cancel', ls.entries.length === 2, 'got: ' + ls.entries.length);
  `;
  const lsStore: Record<string, string> = {
    'forgeflowkit:history:v1': JSON.stringify({
      version: 1,
      entries: [
        { id: 'a', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
        { id: 'b', slug: 'cac', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      ],
      lastUpdated: '2026-07-01T10:00:00Z',
    }),
  };
  const r = runChild(scenario, { pathname: '/en/', lsStore });
  assert.equal(r.ok, true, r.stdout + '\n' + r.stderr);
});

test('init: storage event triggers re-render (cross-tab sync)', () => {
  const scenario = `
  // Pre-seed 1 entry
  const initialLs = JSON.parse(globalThis.localStorage.getItem('forgeflowkit:history:v1'));
  check('initial 1 entry', initialLs.entries.length === 1);
  // Simulate storage event with new data. Storage events don't update the local tab's LS
  // in real browsers, but in this test the LS shim is a regular object — update it
  // manually to mirror what a real cross-tab sync would look like.
  const newValue = JSON.stringify({
    version: 1,
    entries: [
      { id: 'new', slug: 'cac', inputs: {}, result: 'r2', savedAt: '2026-07-01T14:00:00Z', accessedAt: '2026-07-01T14:00:00Z' },
    ],
    lastUpdated: '2026-07-01T14:00:00Z',
  });
  globalThis.localStorage.setItem('forgeflowkit:history:v1', newValue);
  const ev = new Event('storage');
  ev.key = 'forgeflowkit:history:v1';
  ev.newValue = newValue;
  globalThis.window.dispatchEvent(ev);
  await new Promise(r => setImmediate(r));
  const container = document.getElementById('header-history');
  // Walk descendants to find the slug text
  function walkText(n, acc) {
    if (n._textContent) acc.push(n._textContent);
    for (const c of (n.children || [])) walkText(c, acc);
  }
  const parts = [];
  walkText(container, parts);
  const text = parts.join(' | ');
  check('preview shows new entry after storage event', text.includes('cac'), 'text: ' + text.slice(0, 200));
  `;
  const lsStore: Record<string, string> = {
    'forgeflowkit:history:v1': JSON.stringify({
      version: 1,
      entries: [
        { id: 'old', slug: 'mrr', inputs: {}, result: 'r', savedAt: '2026-07-01T10:00:00Z', accessedAt: '2026-07-01T10:00:00Z' },
      ],
      lastUpdated: '2026-07-01T10:00:00Z',
    }),
  };
  const r = runChild(scenario, { pathname: '/en/', lsStore });
  assert.equal(r.ok, true, r.stdout + '\n' + r.stderr);
});

test('init: empty state shown when LS has no history', () => {
  const scenario = `
  const container = document.getElementById('header-history');
  function walkText(n, acc) {
    if (n._textContent) acc.push(n._textContent);
    for (const c of (n.children || [])) walkText(c, acc);
  }
  const parts = [];
  walkText(container, parts);
  const text = parts.join(' | ');
  check('empty state in English', text.includes('No history yet'), 'text: ' + text);
  `;
  const r = runChild(scenario, { pathname: '/en/', lsStore: {} });
  assert.equal(r.ok, true, r.stdout + '\n' + r.stderr);
});

test('init: zh language path uses Chinese strings', () => {
  const scenario = `
  const container = document.getElementById('header-history');
  function walkText(n, acc) {
    if (n._textContent) acc.push(n._textContent);
    for (const c of (n.children || [])) walkText(c, acc);
  }
  const parts = [];
  walkText(container, parts);
  const text = parts.join(' | ');
  check('empty state in Chinese', text.includes('暂无历史'), 'text: ' + text);
  `;
  const r = runChild(scenario, { pathname: '/zh/', lang: 'zh', lsStore: {} });
  assert.equal(r.ok, true, r.stdout + '\n' + r.stderr);
});

test('init: error path — init does not crash when document is empty', () => {
  const scenario = `
  // Working LS but no form, no containers — verify init doesn't crash
  const container = document.getElementById('header-history');
  check('container exists', container !== null);
  check('no uncaught error', true);
  `;
  const r = runChild(scenario, { pathname: '/en/' });
  assert.equal(r.ok, true, r.stdout + '\n' + r.stderr);
});
