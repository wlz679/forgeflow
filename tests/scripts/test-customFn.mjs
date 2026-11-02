#!/usr/bin/env node
// Focused parse+run test for specific engines.
//
// P164: this used to re-parse the engine *source* with a local extractor.
// That extractor had an escape-decoding bug (it only handled \uXXXX and
// dropped the backslash for everything else, so `\n` was read as the letter
// `n`), and it only understood the `const customFn = "..."` form — the
// template-literal / inline / array forms were silently skipped, and the
// file path it read (`src/engines/<slug>.ts`) did not even exist for the
// engines that live in a category subdirectory.
//
// The only source of truth for "what does the browser run" is the engine
// module itself: `engine.clientConfig.customFn`. So this tool now loads the
// real modules through tsx and reports on the real value.
//
// Usage:
//   node tests/scripts/test-customFn.mjs <slug> [<slug>...]
//   <slug> may be the full slug (solopreneur-revenue-projector) or the short
//   file base name (revenue-projector).
//
// Exit code: 0 = all OK, 1 = at least one broken / not found.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const RUNNER = path.join(ROOT, 'scripts', '_runner-customfn-probe.ts');

const targets = process.argv.slice(2);
if (targets.length === 0) {
  console.log('Usage: node tests/scripts/test-customFn.mjs <slug> [<slug>...]');
  console.log('Example: node tests/scripts/test-customFn.mjs revenue-projector');
  process.exit(1);
}

const RUNNER_SRC = `
import { getAllEngines } from '../src/core/engines/registry.ts';
import '../src/engines/index.ts';

const names = process.argv.slice(2);
const engines = getAllEngines() as any[];
const out: any[] = [];

for (const name of names) {
  const hits = engines.filter(
    (e) => e.slug === name || e.slug === 'solopreneur-' + name || e.slug.endsWith('-' + name),
  );
  if (hits.length === 0) {
    out.push({ name, found: false });
    continue;
  }
  for (const e of hits) {
    const body = e.clientConfig?.customFn;
    const rec: any = { name, slug: e.slug, found: true };
    if (typeof body !== 'string' || body.length === 0) {
      rec.ok = false;
      rec.error = 'no customFn body (clientConfig.type=' + (e.clientConfig?.type ?? '?') + ')';
      out.push(rec);
      continue;
    }
    rec.len = body.length;
    try {
      const fn = new Function('inputs', 'pick', 'fill', body);
      rec.ok = true;
      try {
        const r = fn({}, (a: any[]) => a[0], (t: string) => t);
        rec.run = Array.isArray(r)
          ? 'returned ' + r.length + ' element(s); results[0] is ' + typeof r[0] +
            (typeof r[0] === 'string' ? ' (' + r[0].length + ' chars)' : '')
          : 'returned ' + typeof r;
      } catch (ex: any) {
        rec.ok = false;
        rec.error = 'exec: ' + ex.message;
      }
    } catch (ex: any) {
      rec.ok = false;
      rec.error = 'parse: ' + ex.message;
    }
    out.push(rec);
  }
}

process.stdout.write(JSON.stringify(out));
`;

fs.writeFileSync(RUNNER, RUNNER_SRC, 'utf8');

const tsxBin = process.platform === 'win32' ? 'node' : 'node';
const res = spawnSync(tsxBin, [path.join(ROOT, 'node_modules', 'tsx', 'dist', 'cli.mjs'), RUNNER, ...targets], {
  cwd: ROOT,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
  shell: false,
});

try { fs.unlinkSync(RUNNER); } catch { /* best effort cleanup */ }

if (res.status !== 0) {
  console.error('probe runner failed:');
  console.error(res.stdout);
  console.error(res.stderr);
  process.exit(1);
}

let report;
try {
  report = JSON.parse(res.stdout);
} catch {
  console.error('probe runner produced unparsable output:');
  console.error(res.stdout);
  process.exit(1);
}

let failed = 0;
for (const rec of report) {
  if (!rec.found) {
    console.log(`${rec.name}: NOT FOUND (no engine matches this slug)`);
    failed++;
    continue;
  }
  if (rec.ok) {
    console.log(`${rec.slug}: OK (${rec.len} chars) — ${rec.run}`);
  } else {
    console.log(`${rec.slug}: BROKEN — ${rec.error}`);
    failed++;
  }
}

process.exit(failed === 0 ? 0 : 1);
