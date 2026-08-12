/* 建 launched/<日期>.json 脚手架：复制上一期结构，清空 steamdb/bilibili/twitter 待重建，保留 roblox 榜与观测区 */
/* 用法: node tools\make_day.cjs <日期YYYY-MM-DD>；manifest.dates 升序追加（页面默认期=最后一个） */
const fs = require('fs');
const path = require('path');
const date = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) { console.error('usage: node tools\\make_day.cjs YYYY-MM-DD'); process.exit(1); }
const root = path.join(__dirname, '..');
const manPath = path.join(root, 'data', 'launched', 'manifest.json');
const man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
const prevDate = man.dates[man.dates.length - 1];
const target = path.join(root, 'data', 'launched', date + '.json');
if (man.dates.includes(date) || fs.existsSync(target)) { console.error(date + ' 已存在，跳过'); process.exit(1); }
const prev = JSON.parse(fs.readFileSync(path.join(root, 'data', 'launched', prevDate + '.json'), 'utf8'));
const next = JSON.parse(JSON.stringify(prev));
next.date = date;
next.note = date + ' 期';
for (const b of next.boards) {
  if (b.id === 'steamdb' || b.id === 'bilibili' || b.id === 'twitter') b.items = [];
}
fs.writeFileSync(target, JSON.stringify(next, null, 1));
man.dates.push(date);
fs.writeFileSync(manPath, JSON.stringify(man, null, 1));
console.log('scaffold ok | prev=' + prevDate + ' | dates:', man.dates.join(','));
