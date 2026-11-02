// P165 —— 改动文件的字节体检：U+FFFD / CRLF / BOM。
//
// 为什么需要它
// ------------
// Write/Edit 工具偶发产生 U+FFFD；`.gitattributes` 是 `* text=auto eol=lf`
// ⇒ 仓库统一 LF，但工作区可能残留 CRLF（blob 是 LF ⇒ `git diff` 为空 ⇒
// 「改了但没 diff」与「没改」在 diff 上长得一样）。
//
// 跑法（必须从仓库根目录跑）：
//   node tests/scripts/p165-byte-check.mjs
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync('git status --porcelain', { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .map((l) => l.slice(3).trim())
  .filter((p) => p && !p.startsWith('bing-block-urls.csv'));

let bad = 0;
for (const f of files) {
  if (f.endsWith('.csv')) continue;
  let buf;
  try {
    buf = readFileSync(f);
  } catch {
    console.log(`  ?? 读不到（可能是目录）：${f}`);
    continue;
  }
  const text = buf.toString('utf8');
  // ⚠️ 必须用 `⧵uFFFD` 转义而不是字面量 U+FFFD 字符 —— 否则这个脚本**自己**
  //    就带着 2 个 U+FFFD ⇒ 它会把自己判成「有问题」（实测：正是如此）。
  const fffd = (text.match(/\uFFFD/g) ?? []).length;
  const crlf = (text.match(/\r\n/g) ?? []).length;
  const cr = (text.match(/\r/g) ?? []).length;
  const bom = buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
  const flags = [];
  if (fffd) flags.push(`U+FFFD x${fffd}`);
  if (crlf) flags.push(`CRLF x${crlf}`);
  if (cr > crlf) flags.push(`裸 CR x${cr - crlf}`);
  if (bom) flags.push('BOM');
  if (flags.length) {
    bad++;
    console.log(`  ✗ ${f} —— ${flags.join(', ')}`);
  }
}

// 目录里的新文件逐个查
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
for (const f of walk('src/data/category-decision-layers')) {
  const text = readFileSync(f, 'utf8');
  const fffd = (text.match(/\uFFFD/g) ?? []).length;
  const crlf = (text.match(/\r\n/g) ?? []).length;
  const flags = [];
  if (fffd) flags.push(`U+FFFD x${fffd}`);
  if (crlf) flags.push(`CRLF x${crlf}`);
  if (flags.length) {
    bad++;
    console.log(`  ✗ ${f} —— ${flags.join(', ')}`);
  }
}

console.log(bad === 0 ? '\n✅ 全部干净：无 U+FFFD、无 CRLF、无 BOM' : `\n⛔ ${bad} 个文件有问题`);
process.exitCode = bad > 0 ? 1 : 0;
