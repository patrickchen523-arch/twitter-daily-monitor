// 导出缺 PCU 峰值的游戏清单 CSV(供人工补充)
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const lib = JSON.parse(fs.readFileSync(path.join(root, 'data', 'games-library.json'), 'utf8'));
const miss = lib.games.filter(g => !g.pcu_peak);

const esc = s => `"${String(s == null ? '' : s).replace(/"/g, '""')}"`;
const rows = [['游戏名称', '中文名', 'Steam App ID', 'Steam链接', 'PCU峰值(请填)'].join(',')];
for (const g of miss) {
  rows.push([esc(g.name), esc(g.name_cn || ''), g.appid, esc(g.steam || ''), ''].join(','));
}
const out = 'G:\\创意部\\推送看板＆游戏库\\游戏库缺PCU峰值_待补充_2026-08-07.csv';
fs.writeFileSync(out, '﻿' + rows.join('\r\n'), 'utf8');
console.log('written', miss.length, 'games ->', out);
