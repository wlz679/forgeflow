import xlsx from 'xlsx';
const SRC = 'C:/Users/元始天尊/Downloads/forgeflowkit.com-Performance-on-Search-2026-08-04.xlsx';
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
