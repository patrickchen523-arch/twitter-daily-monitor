// bili-report-*.json -> xlsx (无依赖, 手写最小 xlsx 结构)
// 用法: node tools/bili_report_xlsx.js <report.json> <输出.xlsx>
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const [,, srcPath, outPath] = process.argv;
if (!srcPath || !outPath) { console.error('usage: node bili_report_xlsx.js <report.json> <out.xlsx>'); process.exit(1); }
const rows = JSON.parse(fs.readFileSync(srcPath, 'utf8'));

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const COLS = ['名次', '视频标题', '播放量', '关联游戏', '处理结果', '视频标签(原始)', 'BV号', '链接'];

const header = COLS.map((c, i) => `<c r="${String.fromCharCode(65 + i)}1" t="inlineStr" s="1"><is><t>${esc(c)}</t></is></c>`).join('');
const body = rows.map((r, ri) => {
  const cells = [
    r.rank, r.title, r.views, r.game, r.result, r.tags, r.bvid, r.link
  ].map((v, ci) => {
    const ref = String.fromCharCode(65 + ci) + (ri + 2);
    return typeof v === 'number'
      ? `<c r="${ref}"><v>${v}</v></c>`
      : `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
  }).join('');
  return `<row r="${ri + 2}">${cells}</row>`;
}).join('');

const sheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<cols><col min="1" max="1" width="6"/><col min="2" max="2" width="46"/><col min="3" max="3" width="10"/><col min="4" max="4" width="26"/><col min="5" max="5" width="18"/><col min="6" max="6" width="60"/><col min="7" max="7" width="14"/><col min="8" max="8" width="46"/></cols>
<sheetData><row r="1">${header}</row>${body}</sheetData></worksheet>`;

const files = {
  '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
  '_rels/.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="视频游戏关联明细" sheetId="1" r:id="rId1"/></sheets></workbook>`,
  'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  'xl/styles.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs></styleSheet>`,
  'xl/worksheets/sheet1.xml': sheet
};

const tmp = path.join(process.env.TEMP, 'xlsx_build_' + Date.now());
for (const [rel, content] of Object.entries(files)) {
  const fp = path.join(tmp, rel);
  fs.mkdirSync(path.dirname(fp), { recursive: true });
  fs.writeFileSync(fp, content, 'utf8');
}
const zipPath = outPath + '.zip';
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${tmp}\\*' -DestinationPath '${zipPath}' -Force"`);
fs.renameSync(zipPath, outPath);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('xlsx written:', outPath);
