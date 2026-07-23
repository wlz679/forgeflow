/**
 * Header dropdown mutex — unit tests.
 *
 * Spec: docs/superpowers/specs/2026-07-22-header-dropdown-mutex-design.md §3
 *
 * Pattern: hand-rolled DOM stub + spawnSync per-test (no jsdom/vitest).
 * Mirrors tests/favorites-init.test.ts but extends StubElement with
 * .closest(selector) + boolean .open (HTMLDetailsElement-ish) because
 * the mutex script calls element.closest() and reads .open.
 *
 * Run via: node tests/run.mjs tests/header-dropdown-mutex.test.ts
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// file:// URL for the mutex module under test.
const CWD_PATH = process.cwd().replace(/\\/g, '/');
const MUTEX_MOD_URL =
  'file:///' + CWD_PATH.replace(/^\/+/, '') + '/src/scripts/header-dropdown-mutex.client.ts';

// Shape of the JSON printed by every child scenario.
interface TestResult { h: boolean; r: boolean; f: boolean; c: boolean }

// ============== DOM Stub (extended vs favorites-init) ==============
// Adds .closest() + boolean .open because the mutex script uses both.
// NOTE: kept at top level (vs favorites-init's template-string embed) for
// readability + static checking; field declarations give TS strict mode
// the type info it needs without a `// @ts-nocheck`.

class StubElement {
  tagName!: string;
  children!: StubElement[];
  parent: StubElement | null = null;
  attrs!: Record<string, string>;
  dataset!: Record<string, string>;
  _listeners!: Array<{ type: string; fn: (ev: StubEvent) => void }>;
  open!: boolean;

  constructor(tag: string, attrs: Record<string, string> = {}, dataset: Record<string, string> = {}) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parent = null;
    this.attrs = { ...attrs };
    this.dataset = { ...dataset };
    this._listeners = [];
    // HTMLDetailsElement — boolean open
    this.open = false;
  }
  appendChild(child: StubElement): StubElement { this.children.push(child); child.parent = this; return child; }
  addEventListener(t: string, fn: (ev: StubEvent) => void): void { this._listeners.push({ type: t, fn }); }
  removeEventListener(t: string, fn: (ev: StubEvent) => void): void {
    this._listeners = this._listeners.filter(l => !(l.type === t && l.fn === fn));
  }
  dispatchEvent(ev: StubEvent): boolean {
    ev.target = this as unknown as StubElement;
    for (const l of this._listeners.filter(l => l.type === ev.type)) l.fn(ev);
    return !ev.defaultPrevented;
  }
  click(): void {
    // Mirror real HTMLSummaryElement.click — fires a bubbling MouseEvent
    this.dispatchEvent({ type: 'click', defaultPrevented: false } as StubEvent);
  }
  // Walk up the parent chain looking for an element matching the selector.
  // Supports tag-only selectors (e.g. 'summary') and a single [attr="value"]
  // form used by the mutex script: closest('[data-dropdown] > *:not(summary)')
  // — implemented as "this element has the attribute and is a direct child
  // of [data-dropdown] and tag is not summary".
  closest(selector: string): StubElement | null {
    let cur: StubElement | null = this;
    // Direct child-of-[data-dropdown]-and-not-summary check first
    if (selector === '[data-dropdown] > *:not(summary)') {
      while (cur) {
        if (cur.parent && cur.parent.matches?.('details[data-dropdown]') && cur.tagName.toLowerCase() !== 'summary') {
          return cur;
        }
        cur = cur.parent;
      }
      return null;
    }
    // Generic tag selector (e.g. 'summary')
    const tagMatch = selector.match(/^([a-zA-Z][a-zA-Z0-9-]*)$/);
    if (tagMatch) {
      const tag = tagMatch[1].toLowerCase();
      while (cur) {
        if (cur.tagName && cur.tagName.toLowerCase() === tag) return cur;
        cur = cur.parent;
      }
      return null;
    }
    return null;
  }
  matches(selector: string): boolean {
    // Minimal selector matcher for 'details[data-dropdown]'
    const m = selector.match(/^([a-zA-Z][a-zA-Z0-9-]*)\[(\w[\w-]*)\]$/);
    if (!m) return false;
    const [, tag, attr] = m;
    if (this.tagName.toLowerCase() !== tag.toLowerCase()) return false;
    return this.attrs[attr] !== undefined;
  }
  querySelectorAll(sel: string): StubElement[] {
    const out: StubElement[] = [];
    const matches = (n: StubElement, s: string): boolean => {
      s = s.trim();
      const m = s.match(/^([a-zA-Z][a-zA-Z0-9-]*)?\[(\w[\w-]*)(?:="([^"]*)")?\]$/);
      if (m) {
        const [, tag, attr, val] = m;
        if (tag && n.tagName.toLowerCase() !== tag.toLowerCase()) return false;
        if (val === undefined) {
          return n.attrs[attr] !== undefined;
        }
        return n.attrs[attr] === val;
      }
      return n.tagName.toLowerCase() === s.toLowerCase();
    };
    const walk = (n: StubElement): void => {
      if (matches(n, sel)) out.push(n);
      for (const c of n.children) walk(c);
    };
    for (const c of this.children) walk(c);
    return out;
  }
}

class StubEvent {
  type: string;
  defaultPrevented = false;
  target: unknown = null;

  constructor(type: string, init: Record<string, unknown> = {}) {
    this.type = type;
    Object.assign(this, init);
  }
  preventDefault(): void { this.defaultPrevented = true; }
}

class StubKeyboardEvent extends StubEvent {
  key: string;

  constructor(type: string, init: { key?: string } & Record<string, unknown> = {}) {
    super(type, init);
    this.key = init.key ?? '';
  }
}

// ============== Test DOM factory ==============

interface WindowEl {
  location: { pathname: string };
  addEventListener: (t: string, fn: (ev: StubEvent) => void) => void;
  removeEventListener: (t: string, fn: (ev: StubEvent) => void) => void;
  document?: Doc;
  _listeners: Array<{ type: string; fn: (ev: StubEvent) => void }>;
}
interface Doc {
  body: StubElement;
  addEventListener: (t: string, fn: (ev: StubEvent) => void) => void;
  removeEventListener: (t: string, fn: (ev: StubEvent) => void) => void;
  dispatchEvent: (ev: StubEvent) => boolean;
  querySelectorAll: (sel: string) => StubElement[];
}

function buildDom(): { body: StubElement; doc: Doc; windowEl: WindowEl } {
  const body = new StubElement('body');
  const windowEl: WindowEl = {
    location: { pathname: '/en/' },
    addEventListener() {},
    removeEventListener() {},
    _listeners: [],
  };

  function makeDetails(name: string): StubElement {
    const d = new StubElement('details', { class: 'relative group', 'data-dropdown': name });
    const s = new StubElement('summary');
    const inner = new StubElement('div');
    d.appendChild(s);
    d.appendChild(inner);
    return d;
  }
  for (const n of ['history', 'recent', 'favorites', 'categories']) {
    body.appendChild(makeDetails(n));
  }

  const doc: Doc = {
    body,
    addEventListener(t: string, fn: (ev: StubEvent) => void) {
      windowEl._listeners.push({ type: t, fn });
    },
    removeEventListener(t: string, fn: (ev: StubEvent) => void) {
      windowEl._listeners = windowEl._listeners.filter(l => !(l.type === t && l.fn === fn));
    },
    dispatchEvent(ev: StubEvent): boolean {
      ev.target = doc;
      for (const l of windowEl._listeners.filter(l => l.type === ev.type)) l.fn(ev);
      return !ev.defaultPrevented;
    },
    querySelectorAll(sel: string) { return body.querySelectorAll(sel); },
  };
  windowEl.document = doc;
  return { body, doc, windowEl };
}

// ============== Per-test runner ==============

function runScenario(scenarioBody: string): TestResult {
  const tmp = mkdtempSync(join(tmpdir(), 'mutex-'));
  const scenarioPath = join(tmp, 'scenario.mjs');
  // __name polyfill: tsx injects `static { __name(this, "StubElement") }` into
  // the transpiled class source for .ts files. The child scenario.mjs file is
  // a .mjs entry — tsx does NOT transpile it (only .ts/.tsx), so __name would
  // be undefined at class-definition time without this shim.
  const fullBody = `
// __name polyfill (tsx esbuild helper; Node 20 has no global)
const __name = (t, n) => Object.defineProperty(t, 'name', { value: n, configurable: true });
const MUTEX_MOD_URL = '${MUTEX_MOD_URL.replace(/'/g, "\\'")}';
${StubElement.toString()}
${StubEvent.toString()}
${StubKeyboardEvent.toString()}
${buildDom.toString()}
const { body, doc, windowEl } = buildDom();
globalThis.document = doc;
globalThis.window = windowEl;
globalThis.HTMLElement = StubElement;
globalThis.Event = StubEvent;
globalThis.KeyboardEvent = StubKeyboardEvent;
${scenarioBody}
`;
  writeFileSync(scenarioPath, fullBody);
  const r = spawnSync('node', ['--import', 'tsx', scenarioPath], {
    cwd: process.cwd(),
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_NO_WARNINGS: '1' },
  });
  if (r.status !== 0) {
    // Expected for TDD red: module-not-found for mutex. Throw with stderr so
    // the parent test assertion catches the expected failure mode.
    throw new Error(`child failed (status ${r.status}): stderr=${r.stderr.toString().slice(0, 500)}`);
  }
  const lastLine = r.stdout.toString().trim().split('\n').filter(Boolean).pop()!;
  return JSON.parse(lastLine) as TestResult;
}

// ============== Tests ==============

test('test 1: default state — all 4 details are closed', () => {
  const result = runScenario(`
(async () => {
  await import(MUTEX_MOD_URL);
  const h = doc.querySelectorAll('details[data-dropdown="history"]')[0].open;
  const r = doc.querySelectorAll('details[data-dropdown="recent"]')[0].open;
  const f = doc.querySelectorAll('details[data-dropdown="favorites"]')[0].open;
  const c = doc.querySelectorAll('details[data-dropdown="categories"]')[0].open;
  console.log(JSON.stringify({ h, r, f, c }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.h, false);
  assert.equal(result.r, false);
  assert.equal(result.f, false);
  assert.equal(result.c, false);
});

test('test 2: click history summary → only history opens', () => {
  const result = runScenario(`
(async () => {
  await import(MUTEX_MOD_URL);
  const history = doc.querySelectorAll('details[data-dropdown="history"]')[0];
  const recent = doc.querySelectorAll('details[data-dropdown="recent"]')[0];
  const fav = doc.querySelectorAll('details[data-dropdown="favorites"]')[0];
  const cat = doc.querySelectorAll('details[data-dropdown="categories"]')[0];
  history.children[0].click();
  console.log(JSON.stringify({ h: history.open, r: recent.open, f: fav.open, c: cat.open }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.h, true);
  assert.equal(result.r, false);
  assert.equal(result.f, false);
  assert.equal(result.c, false);
});

test('test 3: click history then click recent → only recent open (mutual exclusion)', () => {
  const result = runScenario(`
(async () => {
  await import(MUTEX_MOD_URL);
  const history = doc.querySelectorAll('details[data-dropdown="history"]')[0];
  const recent = doc.querySelectorAll('details[data-dropdown="recent"]')[0];
  const fav = doc.querySelectorAll('details[data-dropdown="favorites"]')[0];
  const cat = doc.querySelectorAll('details[data-dropdown="categories"]')[0];
  history.children[0].click();
  recent.children[0].click();
  console.log(JSON.stringify({ h: history.open, r: recent.open, f: fav.open, c: cat.open }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.h, false);
  assert.equal(result.r, true);
  assert.equal(result.f, false);
  assert.equal(result.c, false);
});

test('test 4: ESC key closes all open dropdowns', () => {
  const result = runScenario(`
(async () => {
  await import(MUTEX_MOD_URL);
  const history = doc.querySelectorAll('details[data-dropdown="history"]')[0];
  const recent = doc.querySelectorAll('details[data-dropdown="recent"]')[0];
  const fav = doc.querySelectorAll('details[data-dropdown="favorites"]')[0];
  const cat = doc.querySelectorAll('details[data-dropdown="categories"]')[0];
  history.children[0].click();
  recent.children[0].click();
  doc.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  console.log(JSON.stringify({ h: history.open, r: recent.open, f: fav.open, c: cat.open }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.h, false);
  assert.equal(result.r, false);
  assert.equal(result.f, false);
  assert.equal(result.c, false);
});

test('test 5: click outside (body) closes open dropdown', () => {
  const result = runScenario(`
(async () => {
  await import(MUTEX_MOD_URL);
  const history = doc.querySelectorAll('details[data-dropdown="history"]')[0];
  const recent = doc.querySelectorAll('details[data-dropdown="recent"]')[0];
  const fav = doc.querySelectorAll('details[data-dropdown="favorites"]')[0];
  const cat = doc.querySelectorAll('details[data-dropdown="categories"]')[0];
  history.children[0].click();
  body.click();
  console.log(JSON.stringify({ h: history.open, r: recent.open, f: fav.open, c: cat.open }));
})().catch(e => { console.error(e); process.exit(1); });
`);
  assert.equal(result.h, false);
  assert.equal(result.r, false);
  assert.equal(result.f, false);
  assert.equal(result.c, false);
});