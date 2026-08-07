// 人工补充的 PCU CSV 回录 -> patch -> 重建游戏库
// 用法: node tools/import_pcu_csv.js <csv路径>
const fs = require('fs');
const path = require('path');

const csvPath = process.argv[2];
if (!csvPath) { console.error('usage: node import_pcu_csv.js <csv>'); process.exit(1); }
const root = path.join(__dirname, '..');
const patchPath = path.join(root, 'data', 'games-appid-patch.json');
const patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'));

const rows = [];
let row = [], field = '', inQ = false;
const s = fs.readFileSync(csvPath, 'utf8').replace(/^﻿/, '');
for (let i = 0; i < s.length; i++) {
  const c = s[i];
  if (inQ) {
    if (c === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
    else field += c;
  } else if (c === '"') inQ = true;
  else if (c === ',') { row.push(field); field = ''; }
  else if (c === '\n' || c === '\r') {
    if (c === '\r' && s[i + 1] === '\n') i++;
    row.push(field); field = '';
    if (row.some(x => x !== '')) rows.push(row);
    row = [];
  } else field += c;
}
if (field !== '' || row.length) { row.push(field); if (row.some(x => x !== '')) rows.push(row); }

let ok = 0;
for (const r of rows.slice(1)) {
  const [name, , appid, , pcu] = r.map(x => String(x || '').trim());
  const n = parseInt(pcu, 10);
  if (!name || !Number.isFinite(n)) continue;
  patch[name] = Object.assign({}, patch[name], { appid, pcu_peak: n });
  ok++;
}
fs.writeFileSync(patchPath, JSON.stringify(patch, null, 1), 'utf8');
console.log('imported:', ok);
