// 新游雷达当月排期 -> watch.calendar
// 用法: node tools/sync_radar_calendar.js [日期]
const https = require('https');
const fs = require('fs');
const path = require('path');

const date = process.argv[2] || '2026-08-05';
const launchedPath = path.join(__dirname, '..', 'data', 'launched', `${date}.json`);
const launched = JSON.parse(fs.readFileSync(launchedPath, 'utf8'));

const get = url => new Promise(resolve => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => resolve(d));
    res.on('error', () => resolve(''));
  }).on('error', () => resolve(''));
});

(async () => {
  const app = await get('https://game-radar.zeabur.app/app.js');
  const start = app.indexOf('const events = [');
  let i = app.indexOf('[', start), depth = 0, end = -1;
  for (let j = i; j < app.length; j++) {
    if (app[j] === '[') depth++;
    if (app[j] === ']') { depth--; if (depth === 0) { end = j; break; } }
  }
  const events = new Function('return ' + app.slice(i, end + 1))();
  const month = date.slice(0, 7);
  const cal = events
    .filter(e => e.date && e.date.startsWith(month))
    .map(e => ({ date: e.date, name: e.name, type: e.type, platform: e.platform }))
    .sort((a, b) => a.date.localeCompare(b.date));
  // 保留人工补充(非雷达来源)
  const manual = (launched.watch && launched.watch.calendar || []).filter(e => e.manual);
  launched.watch.calendar = [...cal, ...manual];
  fs.writeFileSync(launchedPath, JSON.stringify(launched, null, 1), 'utf8');
  console.log(`calendar updated: ${cal.length} 雷达 + ${manual.length} 人工`);
})();
