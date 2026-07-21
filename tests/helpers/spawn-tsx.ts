// P52 helper — extract Windows/CJS inline-tsx runner pattern first surfaced
// in P51 (`tests/codegen-examples-mock-apply.test.ts`). Encapsulates:
//   - fs.mkdtempSync + try/finally cleanup
//   - async IIFE wrapper (CJS top-level await compatibility)
//   - pathToFileURL for Windows ESM absolute-path resolution
//   - direct node_modules/.bin/tsx[.cmd] invocation (no npx indirection)
//   - shell: true on win32 (Node refuses direct .cmd shim spawn)
//
// Why not at tests/ root: tests/run.mjs globs *.test.ts non-recursively;
// helpers/ avoids the glob (no .test.ts suffix).
//
// Caller's responsibility for dynamic-import ordering:
//   If the imported module has module-level side effects (e.g.
//   `registerEngine()` at import time) that depend on another module being
//   imported FIRST, the caller must use dynamic `await import(...)` inside
//   `runnerSource`, NOT in `imports[]` (which is module-level).
//   See P51 migration in tests/codegen-examples-mock-apply.test.ts for
//   the worked example.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export interface SpawnTsxInlineOptions {
  /** Repo root for cwd + relative path resolution */
  root: string;
  /** TypeScript source code to execute inside the async main() */
  runnerSource: string;
  /** Optional module-level imports to prepend (each as {path, as?}) */
  imports?: Array<{ path: string; as?: string }>;
  /** Override tsx binary path (for testing). Default: node_modules/.bin/tsx[.cmd] */
  tsxBin?: string;
}

export interface SpawnTsxInlineResult {
  stdout: string;
  stderr: string;
  status: number | null;
}

const defaultTsxBin = (root: string): string => {
  const name = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';
  return path.join(root, 'node_modules', '.bin', name);
};

export function spawnTsxInlineStdout(opts: SpawnTsxInlineOptions): SpawnTsxInlineResult {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spawn-tsx-'));
  const runnerPath = path.join(tmpDir, 'runner.ts');
  const tsxBin = opts.tsxBin ?? defaultTsxBin(opts.root);

  // Build import preamble — pathToFileURL for Windows ESM (raw absolute
  // paths throw ERR_UNSUPPORTED_ESM_URL_SCHEME on win32).
  const importLines = (opts.imports ?? [])
    .map(({ path: p, as }) =>
      as
        ? `import * as ${as} from '${pathToFileURL(p).href}';`
        : `import '${pathToFileURL(p).href}';`
    )
    .join('\n');

  // Async IIFE — tsx on Windows emits CJS by default, which doesn't support
  // top-level await. Mirror scripts/codegen-examples.mjs:251,267 pattern.
  const runnerSource = `
    ${importLines}
    async function main() {
      ${opts.runnerSource}
    }
    main().catch(e => { console.error(e); process.exit(1); });
  `;

  try {
    fs.writeFileSync(runnerPath, runnerSource, 'utf8');
    const result = spawnSync(tsxBin, [runnerPath], {
      cwd: opts.root,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      status: result.status,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export function spawnTsxInline(opts: SpawnTsxInlineOptions): string {
  const result = spawnTsxInlineStdout(opts);
  if (result.status !== 0) {
    throw new Error(
      `tsx runner exited ${result.status}.\n` +
        `stdout: ${result.stdout}\nstderr: ${result.stderr}`
    );
  }
  return result.stdout;
}
