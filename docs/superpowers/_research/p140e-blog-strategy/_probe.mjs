// P141-B3-T7f: 清洗 — 绝对 Windows 路径与个人用户名已脱敏。
import xlsx from 'xlsx';
const SRC = '<redacted-gsc-source>/forgeflowkit-search-performance.xlsx';
const wb = xlsx.readFile(SRC);
for (const sn of wb.SheetNames) {
  const ws = wb.Sheets[sn];
  const r = xlsx.utils.decode_range(ws['!ref']);
  const rows = xlsx.utils.sheet_to_json(ws, { defval: '' });
  console.log(`\n=== [${sn}] rows=${r.e.r - r.s.r + 1} sample_count=${rows.length} ===`);
  if (rows.length) {
    console.log('  headers:', Object.keys(rows[0]));
    console.log('  sample row 0:', JSON.stringify(rows[0]));
  }
}
