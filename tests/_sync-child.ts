/**
 * Per-test child harness for sync-init.
 * Imports sync core + Clerk init, invokes the action specified by __TEST_ACTION.
 * Prints JSON result. Exit 0 on success, 1 on exception.
 *
 * Note: brief's original stubbed `clerkInit.getClerkInstance` and `syncLib.onSyncStatus`
 * via namespace mutation — but ESM namespace bindings are read-only in CJS-compiled
 * tsx ("Cannot set property X of #<Object> which has only a getter"). Since the
 * tests below invoke `syncLib.pullCollection` directly (not sync-init.client.ts),
 * the stubs are vestigial and have been removed.
 */
import * as favorites from '../src/lib/favorites.ts';
import * as recent from '../src/lib/recent.ts';
import * as history from '../src/lib/history.ts';
import * as syncLib from '../src/lib/sync.ts';
import * as clerkInit from '../src/scripts/clerk-init.client.ts';

// Run the test action based on env var.
// Wrap in async IIFE to avoid top-level await (tsx compiles to CJS by default).
const action = process.env.__TEST_ACTION;

(async () => {
  try {
    if (action === 'pull-once') {
      const id = process.env.__TEST_CLERK_USER_ID;
      // Stub fetch to return empty arrays
      (globalThis as any).fetch = async () => new Response('[]', { status: 200 });
      await syncLib.pullCollection(id, 'favorites');
      await syncLib.pullCollection(id, 'recent');
      await syncLib.pullCollection(id, 'history');
      process.stdout.write(JSON.stringify({ ok: true, action }) + '\n');
    } else {
      process.stdout.write(JSON.stringify({ ok: true, action: 'noop' }) + '\n');
    }
    // Force exit — sync.ts may leave pending handles (e.g., fetch internals) that
    // keep the event loop alive. spawnSync would otherwise wait until timeout.
    process.exit(0);
  } catch (e: any) {
    process.stdout.write(JSON.stringify({ ok: false, error: e.message }) + '\n');
    process.exit(1);
  }
})();
