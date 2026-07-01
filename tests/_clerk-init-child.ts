/**
 * Per-test child harness for clerk-init.
 * Mocks @clerk/clerk-js via dynamic import + global override.
 * Reads scenario flags from process.env to set up DOM + Clerk mock.
 * Prints JSON result to stdout.
 */

// --- DOM stub (minimal: querySelector + addEventListener + innerHTML) ---
class StubElement {
  public innerHTML = '';
  public textContent = '';
  private listeners: Array<{ event: string; handler: (e: any) => void }> = [];
  querySelector(_sel: string): StubElement | null {
    if (_sel.startsWith('[data-')) return new StubElement();
    return null;
  }
  addEventListener(event: string, handler: (e: any) => void) {
    this.listeners.push({ event, handler });
  }
  fireClick() {
    for (const { event, handler } of this.listeners) {
      if (event === 'click') handler({ preventDefault() {} });
    }
  }
}

const mountEl = new StubElement();
(globalThis as any).document = {
  querySelector: (sel: string) => {
    if (sel === '[data-clerk-mount]') {
      return process.env.HAS_MOUNT === '1' ? mountEl : null;
    }
    return null;
  },
};

// --- Clerk mock ---
let loadShouldFail = process.env.LOAD_FAIL === '1';
let simulatedUser: any = process.env.LOGGED_IN === '1' ? { id: 'user_123' } : null;
let openSignInCalled = false;
let mountUserButtonCalled = false;

const mockClerkInstance: any = {
  load: async () => {
    if (loadShouldFail) throw new Error('mock load failure');
  },
  get user() { return simulatedUser; },
  openSignIn: () => { openSignInCalled = true; },
  mountUserButton: (_el: any) => { mountUserButtonCalled = true; },
};

// Mock the @clerk/clerk-js module via require.cache
const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request: string, ...rest: any[]) {
  if (request === '@clerk/clerk-js') return 'mock-clerk-js';
  return origResolve.call(this, request, ...rest);
};
require.cache['mock-clerk-js'] = {
  id: 'mock-clerk-js',
  filename: 'mock-clerk-js',
  loaded: true,
  exports: { Clerk: function () { return mockClerkInstance; } },
} as any;

// --- Import after mock is in place ---
import('../src/scripts/clerk-init.client.ts').then(async (mod) => {
  await mod.initClerk();

  // Trigger click if test requests it
  if (process.env.FIRE_CLICK === '1') {
    mountEl.fireClick();
  }

  process.stdout.write(JSON.stringify({
    innerHTML: mountEl.innerHTML,
    openSignInCalled,
    mountUserButtonCalled,
    instanceExists: mod.getClerkInstance() !== null,
  }) + '\n');
}).catch((err) => {
  process.stdout.write(JSON.stringify({ error: String(err) }) + '\n');
  process.exit(1);
});