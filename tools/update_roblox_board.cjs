/* Roblox 周榜更新: 解析最新周报HTML(roblox/roblox-*.html)的CCU榜单 -> 更新所有 launched 日期的 roblox board */
/* 用法: node tools\update_roblox_board.cjs [周报html文件名，缺省=目录内最新] */
/* 流程: 1.本脚本写榜(保留同名游戏的旧详情) 2.node tools\fetch_roblox_details.js <最新日期> 3.node tools\fetch_roblox_thumbs.js <最新日期> 4.node tools\update_roblox_board.cjs --propagate */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const launchedDir = path.join(root, 'data', 'launched');
const manifest = JSON.parse(fs.readFileSync(path.join(launchedDir, 'manifest.json'), 'utf8'));
const latestDate = manifest.dates[manifest.dates.length - 1];

if (process.argv[2] === '--propagate') {
  const src = JSON.parse(fs.readFileSync(path.join(launchedDir, latestDate + '.json'), 'utf8'));
  const board = src.boards.find(b => b.id === 'roblox');
  for (const d of manifest.dates) {
    if (d === latestDate) continue;
    const p = path.join(launchedDir, d + '.json');
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const b = j.boards.find(x => x.id === 'roblox');
    if (b) { b.week = board.week; b.items = board.items; fs.writeFileSync(p, JSON.stringify(j, null, 1), 'utf8'); }
  }
  console.log('propagated week=' + board.week + ' to', manifest.dates.length - 1, 'dates');
  process.exit(0);
}

const rbxDir = path.join(root, 'roblox');
const file = process.argv[2] || fs.readdirSync(rbxDir).filter(f => /^roblox-\d{4}-\d{2}-\d{2}-to-\d{2}-\d{2}\.html$/.test(f)).sort().pop();
const html = fs.readFileSync(path.join(rbxDir, file), 'utf8');
const dm = file.match(/roblox-(\d{4})-(\d{2})-(\d{2})-to-(\d{2})-(\d{2})\.html/);
const week = `${+dm[2]}.${+dm[3]} - ${+dm[4]}.${+dm[5]}`;

const re = /rank-name">([^<]+)<\/div>[\s\S]*?rank-ccu">([\d,]+)<\/span>/g;
const rows = [];
let m;
while ((m = re.exec(html)) && rows.length < 10) rows.push({ name: m[1].trim(), ccu: +m[2].replace(/,/g, '') });
if (rows.length < 10) { console.error('榜单解析不足10条, 实际:', rows.length); process.exit(1); }

const fmtWan = n => (n / 10000).toFixed(1) + '万';
const latestPath = path.join(launchedDir, latestDate + '.json');
const latest = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
const board = latest.boards.find(b => b.id === 'roblox');
const oldByName = {};
for (const it of board.items) oldByName[it.name] = it;

board.week = week;
board.items = rows.map(r => {
  const old = oldByName[r.name] || {};
  const it = { ...old, name: r.name, metric: fmtWan(r.ccu) };
  if (old.name !== r.name) { delete it.thumb; delete it.universeId; delete it.desc; delete it.genre; delete it.release; delete it.playing; delete it.visits; delete it.link; }
  return it;
});
fs.writeFileSync(latestPath, JSON.stringify(latest, null, 1), 'utf8');
console.log('report:', file, '| week:', week);
board.items.forEach((it, i) => console.log(`${i + 1}. ${it.name} ${it.metric}${it.thumb ? ' [旧详情保留]' : ' [待拉取]'}`));
console.log('下一步: node tools\\fetch_roblox_details.js ' + latestDate + ' && node tools\\fetch_roblox_thumbs.js ' + latestDate + ' && node tools\\update_roblox_board.cjs --propagate');
