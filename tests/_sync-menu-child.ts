/**
 * Per-test child harness for sync-init wireSyncMenu() click wiring.
 *
 * Stubs DOM (querySelector/addEventListener/fireClick/removeAttribute) + global
 * navigator/window.confirm, then imports sync-init.client.ts via tsx dynamic
 * import and calls wireSyncMenu(). With the Clerk env stub providing
 * getClerkInstance() returning a user, we expect:
 *   - [data-sync-menu] hidden attribute removed
 *   - 3 click listeners installed (sync-now, sync-export, sync-delete)
 *   - firing the now-button calls syncNow (which in turn calls pullCollection)
 *   - firing the export-button calls exportAll (which calls pullCollection 3x)
 *   - firing the delete-button (with confirm=true) calls deleteCloudData
 *
 * Test scenarios are selected via process.env.__TEST_SCENARIO.
 * Outputs JSON result on stdout.
 */

// ---------- DOM stub ----------
class StubElement {
  public tagName = 'DIV';
  public hidden = true;
  public textContent = '';
  private attrs: Record<string, string> = { hidden: '' };
  private listeners: Array<{ event: string; handler: (e: any) => void }> = [];
  public dataset: Record<string, string> = {};
  constructor(label = '') { if (label) this.dataset['label'] = label; }
  setAttribute(name: string, value: string) {
    this.attrs[name] = String(value);
    if (name === 'hidden') this.hidden = false;
  }
  removeAttribute(name: string) {
    delete this.attrs[name];
    if (name === 'hidden') this.hidden = false;
  }
  getAttribute(name: string) { return this.attrs[name] ?? null; }
  addEventListener(event: string, handler: (e: any) => void) {
    this.listeners.push({ event, handler });
  }
  removeEventListener(_event: string, _handler: (e: any) => void) { /* noop */ }
  click() { this.fireClick(); }
  fireClick() {
    for (const { event, handler } of this.listeners) {
      if (event === 'click') handler({ preventDefault() {}, stopPropagation() {} });
    }
  }
  getListenerCount(eventType: string): number {
    return this.listeners.filter(l => l.event === eventType).length;
  }
  isHidden(): boolean {
    return this.attrs['hidden'] !== undefined;
  }
}

// One StubElement per data-sync-* selector, all attached to a synthetic document.
const menuEl = new StubElement('menu');
const nowEl = new StubElement('now');
const lastEl = new StubElement('last');
const exportEl = new StubElement('export');
const deleteEl = new StubElement('delete');
const clerkMountEl = new StubElement('clerk-mount');

const SELECTOR_MAP: Record<string, StubElement> = {
  '[data-sync-menu]': menuEl,
  '[data-sync-now]': nowEl,
  '[data-sync-last]': lastEl,
  '[data-sync-export]': exportEl,
  '[data-sync-delete]': deleteEl,
  '[data-clerk-mount]': clerkMountEl,
};

(globalThis as any).document = {
  readyState: 'complete',
  querySelector: (sel: string) => SELECTOR_MAP[sel] ?? null,
  addEventListener: (_event: string, _handler: any) => { /* no-op for visibilitychange subscription in installVisibilityFlush */ },
  removeEventListener: (_event: string, _handler: any) => { /* no-op */ },
  visibilityState: 'visible',
  hidden: false,
};

(globalThis as any).window = {
  confirm: (_msg: string) => process.env.CONFIRM_RETURN === '1',
  location: { pathname: process.env.LANG_PREFIX || '/en/' },
  setInterval: (_cb: any, _ms?: number): any => 0,
  setTimeout: (_cb: any, _ms?: number): any => 0,
  clearInterval: (_id: any) => { /* noop */ },
  clearTimeout: (_id: any) => { /* noop */ },
  addEventListener: (_event: string, _handler: any) => { /* noop */ },
  removeEventListener: (_event: string, _handler: any) => { /* noop */ },
};

(globalThis as any).navigator = { sendBeacon: undefined };

// Stable in-memory localStorage so sync.ts can read/write envelopes.
const lsStore = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => lsStore.has(k) ? lsStore.get(k)! : null,
  setItem: (k: string, v: string) => { lsStore.set(k, v); },
  removeItem: (k: string) => { lsStore.delete(k); },
  clear: () => { lsStore.clear(); },
  key: (i: number) => Array.from(lsStore.keys())[i] ?? null,
  get length() { return lsStore.size; },
};
const ssStore = new Map<string, string>();
(globalThis as any).sessionStorage = {
  getItem: (k: string) => ssStore.has(k) ? ssStore.get(k)! : null,
  setItem: (k: string, v: string) => { ssStore.set(k, v); },
  removeItem: (k: string) => { ssStore.delete(k); },
  clear: () => { ssStore.clear(); },
  key: (i: number) => Array.from(ssStore.keys())[i] ?? null,
  get length() { return ssStore.size; },
};

// ---------- Clerk mock ----------
// Pre-populate the require cache so clerk-init.client.ts sees a fake Clerk
// that returns a user (so wireSyncMenu's guard is satisfied). Use the same
// Module._resolveFilename trick as _clerk-init-child.ts.
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request: string, ...rest: any[]) {
  if (request === '@clerk/clerk-js') return 'mock-clerk-js';
  return origResolve.call(this, request, ...rest);
};

const simulatedUser = process.env.LOGGED_IN === '1' ? { id: 'user_abc123' } : null;
const mockClerkInstance: any = {
  load: async () => { /* noop */ },
  get user() { return simulatedUser; },
  openSignIn: () => {},
  mountUserButton: (_el: any) => {},
};
require.cache['mock-clerk-js'] = {
  id: 'mock-clerk-js',
  filename: 'mock-clerk-js',
  loaded: true,
  exports: { Clerk: function () { return mockClerkInstance; } },
} as any;

// ---------- Test runner ----------
async function main(): Promise<void> {
  // Dynamic import AFTER all stubs are in place. Note: importing this module
  // triggers the IIFE at EOF (startSync + pollForAuthAndPull). Since
  // pollForAuthAndPull calls wireSyncMenu() once Clerk is detected, and our
  // Clerk mock has a user from the start (LOGGED_IN=1), wireSyncMenu has
  // already run by the time we reach this point. We explicitly re-invoke
  // wireSyncMenu() in the test scenarios to also verify direct-call wiring.
  const mod = await import('../src/scripts/sync-init.client.ts');

  const scenario = process.env.__TEST_SCENARIO;

  // Track fetch calls so we can verify syncNow/exportAll/deleteCloudData were reached.
  const fetchCalls: Array<{ url: string; method?: string }> = [];
  (globalThis as any).fetch = async (url: string, init?: any) => {
    fetchCalls.push({ url: String(url), method: init?.method });
    if (scenario === 'sync-now') {
      return new Response('[]', { status: 200 });
    }
    if (scenario === 'export-all') {
      return new Response(JSON.stringify([{ payload: { version: 1, slugs: ['a'], lastUpdated: '2026-07-01T10:00:00Z' } }]), { status: 200 });
    }
    if (scenario === 'delete') {
      return new Response('', { status: 204 });
    }
    return new Response('[]', { status: 200 });
  };

  if (scenario === 'wires-buttons-when-signed-in') {
    mod.wireSyncMenu();
    process.stdout.write(JSON.stringify({
      menuHidden: menuEl.isHidden(),
      nowClickListeners: nowEl.getListenerCount('click'),
      exportClickListeners: exportEl.getListenerCount('click'),
      deleteClickListeners: deleteEl.getListenerCount('click'),
    }) + '\n');
    return;
  }

  if (scenario === 'no-wire-when-not-signed-in') {
    mod.wireSyncMenu();
    process.stdout.write(JSON.stringify({
      menuHidden: menuEl.isHidden(),
      nowClickListeners: nowEl.getListenerCount('click'),
      wired: nowEl.getListenerCount('click') > 0,
    }) + '\n');
    return;
  }

  if (scenario === 'sync-now') {
    mod.wireSyncMenu();
    nowEl.click();
    // Wait briefly for async handlers to settle.
    await new Promise(r => setTimeout(r, 50));
    process.stdout.write(JSON.stringify({
      menuHidden: menuEl.isHidden(),
      fetchCalls: fetchCalls.length,
      pullCalls: fetchCalls.filter(c => c.method === undefined || c.method === 'GET').length,
      pushCalls: fetchCalls.filter(c => c.method === 'POST').length,
    }) + '\n');
    return;
  }

  if (scenario === 'export-all') {
    mod.wireSyncMenu();
    exportEl.click();
    await new Promise(r => setTimeout(r, 50));
    process.stdout.write(JSON.stringify({
      menuHidden: menuEl.isHidden(),
      fetchCalls: fetchCalls.length,
      allPulls: fetchCalls.every(c => !c.method || c.method === 'GET'),
    }) + '\n');
    return;
  }

  if (scenario === 'delete') {
    mod.wireSyncMenu();
    deleteEl.click();
    await new Promise(r => setTimeout(r, 50));
    process.stdout.write(JSON.stringify({
      menuHidden: menuEl.isHidden(),
      fetchCalls: fetchCalls.length,
      deleteCalls: fetchCalls.filter(c => c.method === 'DELETE').length,
    }) + '\n');
    return;
  }

  if (scenario === 'delete-cancelled') {
    mod.wireSyncMenu();
    // CONFIRM_RETURN not '1' → confirm returns false → no fetch calls
    deleteEl.click();
    await new Promise(r => setTimeout(r, 50));
    process.stdout.write(JSON.stringify({
      fetchCalls: fetchCalls.length,
    }) + '\n');
    return;
  }

  // Unknown scenario
  process.stdout.write(JSON.stringify({ error: 'unknown scenario' }) + '\n');
  process.exit(1);
}

main().then(() => process.exit(0)).catch((err) => {
  process.stdout.write(JSON.stringify({ error: String(err) }) + '\n');
  process.exit(1);
});
