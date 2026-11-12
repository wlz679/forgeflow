import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

// P168 B3-2 收尾 —— seoTitle 漂移闸门 + 键位置守卫（source-only）
//
// ⭐ 本仓库的惯例（见 codegen-examples.mjs --check / codegen-customfn.mjs --check）：
//   「--check」拥有**漂移不变量**（接进 pnpm check），
//   独立守卫文件只守「闸门存在 / 可跑 / 非空转」三段。
//
// ⭐ 为什么「非空转」必须单独测：
//   一个只会打印 PASSED 的闸门照样能骗过 CI。
//   ⇒ 必须**真的制造一次漂移**（在 tmp/ 夹具里改坏一个 seoTitle），
//     证明闸门会 exit 1。
//
// ⭐ 夹具用 --root 指到 tmp/ ⇒ **不碰真实 locale**（崩了也不会留下污染）。

const root = resolve(import.meta.dirname, '..');
const SCRIPT_REL = 'scripts/generate-seo-titles.mjs';

test('P168 B3-2：⭐ 闸门存在 —— package.json 的 check 链里必须有 generate-seo-titles.mjs --check', () => {
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8').replace(/^\uFEFF/, '')) as {
    scripts: Record<string, string>;
  };
  assert.ok(existsSync(resolve(root, SCRIPT_REL)), SCRIPT_REL + ' 不存在');
  const check = pkg.scripts.check || '';
  assert.ok(
    check.includes('generate-seo-titles.mjs --check'),
    'package.json 的 check 链里没有 generate-seo-titles.mjs --check ⇒ 生成器与 locale 的漂移没有 CI 闸门',
  );
});

test('P168 B3-2：⭐ 闸门可跑 —— --check 必须 exit 0 且 stdout 含 PASSED', () => {
  const r = spawnSync('node', [resolve(root, SCRIPT_REL), '--check'], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, '--check 必须 exit 0，实际 ' + r.status + 
 + (r.stdout || '') + (r.stderr || ''));
  assert.ok(/PASSED/.test(r.stdout || ''), '--check 的 stdout 必须含 PASSED，实际: ' + (r.stdout || ''));
});

test('P168 B3-2：⭐ 闸门非空转 —— 夹具里改坏一个 seoTitle，--check 必须 exit 1', () => {
  const fx = resolve(root, 'tmp/b3-2-seo-title-fixture');
  rmSync(fx, { recursive: true, force: true });
  mkdirSync(resolve(fx, 'src/i18n/locales'), { recursive: true });
  mkdirSync(resolve(fx, 'scripts'), { recursive: true });
  copyFileSync(resolve(root, 'src/i18n/locales/en.json'), resolve(fx, 'src/i18n/locales/en.json'));
  copyFileSync(resolve(root, 'src/i18n/locales/zh.json'), resolve(fx, 'src/i18n/locales/zh.json'));
  copyFileSync(resolve(root, 'scripts/seo-title-overrides.json'), resolve(fx, 'scripts/seo-title-overrides.json'));
  // 改坏第一个 seoTitle 的值（不改键名 ⇒ 键集合不变，只制造**值**的漂移）
  const p = resolve(fx, 'src/i18n/locales/en.json');
  const txt = readFileSync(p, 'utf8');
  const m = /("tools\.[^"]+\.seoTitle"\s*:\s*")([^"]*)(")/.exec(txt);
  assert.ok(m, '夹具里找不到任何 seoTitle 键');
  const after = txt.slice(0, m.index) + m[1] + m[2] + 'DRIFT' + m[3] + txt.slice(m.index + m[0].length);
  writeFileSync(p, after, 'utf8');
  const r = spawnSync('node', [resolve(root, SCRIPT_REL), '--check', '--root', fx], { cwd: root, encoding: 'utf8' });
  assert.notEqual(r.status, 0,
    '改坏 seoTitle 后 --check 仍然 exit 0 ⇒ 闸门是空转的（只会打印 PASSED 的假绿）');
  assert.ok(/漂移/.test((r.stderr || '') + (r.stdout || '')),
    '报错信息里应说明是「漂移」，实际: ' + ((r.stderr || '') + (r.stdout || '')).slice(0, 300));
  rmSync(fx, { recursive: true, force: true });
});

test('P168 B3-2：⭐ 键位置 —— 每个工具的 seoTitle 键必须紧邻它自己的 title 键（en + zh 各 100 个）', () => {
  // ⭐ 为什么这条不变量成立（实测）：100 个工具里 99 个的 seoTitle 紧邻 title，
  //   唯一的例外是 solopreneur-claude-api-cost-calculator —— 它的 seoTitle
  //   被放进了 **openai** 的键段里（B3-2 批量加键时排错了位置）。
  // ⇒ 归位后 100/100 成立；这条断言把它钉住，防止再排错。
  for (const lang of ['en', 'zh']) {
    const lines = readFileSync(resolve(root, 'src/i18n/locales/' + lang + '.json'), 'utf8').split(/\r?\n/);
    const seo = new Map<string, number>();
    const title = new Map<string, number>();
    lines.forEach((t, i) => {
      let m = /^\s*"tools\.([^."]+)\.seoTitle"\s*:/.exec(t);
      if (m) seo.set(m[1], i + 1);
      m = /^\s*"tools\.([^."]+)\.title"\s*:/.exec(t);
      if (m) title.set(m[1], i + 1);
    });
    assert.equal(seo.size, 100, lang + ' locale 的 seoTitle 键数应为 100，实际 ' + seo.size);
    assert.equal(title.size, 100, lang + ' locale 的 title 键数应为 100，实际 ' + title.size);
    const bad: string[] = [];
    for (const [slug, ln] of seo) {
      const tLine = title.get(slug);
      if (tLine === undefined) { bad.push(slug + ' 没有 title 键'); continue; }
      if (Math.abs(ln - tLine) !== 1) {
        bad.push(slug + ' seoTitle@' + ln + ' title@' + tLine);
      }
    }
    assert.deepEqual(bad, [], lang + ' locale 里 seoTitle 不紧邻 title 的: ' + bad.join(' | '));
  }
});
