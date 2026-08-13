/* 建 launched/2026-08-10.json 脚手架：复制 08-07 结构，清空待重建板块，保留 roblox 榜与观测区 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const prev = JSON.parse(fs.readFileSync(path.join(root, 'data', 'launched', '2026-08-07.json'), 'utf8'));
const next = JSON.parse(JSON.stringify(prev));
next.date = '2026-08-10';
next.note = '2026-08-10 期';
for (const b of next.boards) {
  if (b.id === 'steamdb' || b.id === 'bilibili' || b.id === 'twitter') b.items = [];
}
fs.writeFileSync(path.join(root, 'data', 'launched', '2026-08-10.json'), JSON.stringify(next, null, 1));
const man = JSON.parse(fs.readFileSync(path.join(root, 'data', 'launched', 'manifest.json'), 'utf8'));
if (!man.dates.includes('2026-08-10')) man.dates.unshift('2026-08-10');
fs.writeFileSync(path.join(root, 'data', 'launched', 'manifest.json'), JSON.stringify(man, null, 1));
console.log('scaffold ok | dates:', man.dates.join(','));
