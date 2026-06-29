import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tools } from '../src/data/tools/index.ts';

const distDir = resolve(process.cwd(), 'dist');

function extractJsonLd(html: string): any[] {
  const blocks: any[] = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try { blocks.push(JSON.parse(m[1])); } catch { /* skip malformed */ }
  }
  return blocks;
}

test('EEAT — every tool page HTML has SoftwareApplication with author/dateModified/reviewedBy', { skip: !existsSync(distDir) }, () => {
  for (const tool of tools) {
    const path = resolve(distDir, 'en', tool.slug, 'index.html');
    assert.ok(existsSync(path), `dist missing: ${path}`);
    const html = readFileSync(path, 'utf-8');
    const blocks = extractJsonLd(html);
    const graph = blocks.flatMap(b => b['@graph'] ?? [b]);
    const sa = graph.find(b => b['@type'] === 'SoftwareApplication');
    assert.ok(sa, `${tool.slug}: no SoftwareApplication schema`);
    assert.ok(sa.author, `${tool.slug}: missing author`);
    assert.equal(sa.author['@type'], 'Organization', `${tool.slug}: author should be Organization`);
    assert.ok(sa.dateModified, `${tool.slug}: missing dateModified`);
    assert.match(sa.dateModified, /^\d{4}-\d{2}-\d{2}$/, `${tool.slug}: dateModified must be YYYY-MM-DD`);
    assert.ok(sa.reviewedBy, `${tool.slug}: missing reviewedBy`);
    assert.equal(sa.reviewedBy['@type'], 'Organization', `${tool.slug}: reviewedBy should be Organization`);
  }
});

test('EEAT — author is uniform ForgeFlowKit across 32 tools', { skip: !existsSync(distDir) }, () => {
  for (const tool of tools) {
    assert.equal(tool.author, 'ForgeFlowKit', `${tool.slug}: author must be ForgeFlowKit`);
    assert.equal(tool.reviewedBy, 'ForgeFlowKit Team', `${tool.slug}: reviewedBy must be ForgeFlowKit Team`);
    assert.match(tool.dataReviewedAt, /^\d{4}-\d{2}-\d{2}$/, `${tool.slug}: dataReviewedAt must be YYYY-MM-DD`);
    assert.ok(Array.isArray(tool.sources) && tool.sources.length >= 2, `${tool.slug}: sources must be array of 2+ items`);
  }
});
