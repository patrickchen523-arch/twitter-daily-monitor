// 回填各日期 picks 的 bg 字段(首张实机截图, 用作大背景, 与卡片 header 错开)
// 用法: node tools/fill_pick_bg.cjs [日期...]  (缺省=manifest全部日期)
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');
const man = JSON.parse(fs.readFileSync(path.join(root, 'data', 'launched', 'manifest.json'), 'utf8'));
const dates = process.argv.slice(2).length ? process.argv.slice(2) : man.dates;

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = url => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    res.on('error', reject);
  }).on('error', reject);
});

(async () => {
  for (const date of dates) {
    const p = path.join(root, 'data', 'launched', `${date}.json`);
    if (!fs.existsSync(p)) { console.log(date, '缺文件,跳过'); continue; }
    const day = JSON.parse(fs.readFileSync(p, 'utf8'));
    let changed = false;
    for (const pick of day.picks || []) {
      if (pick.bg) continue;
      const a = (String(pick.link || '').match(/app\/(\d+)/) || [])[1];
      if (!a) { console.log(date, pick.name, '无appid'); continue; }
      try {
        const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${a}&filters=screenshots`);
        const ss = j && j[a] && j[a].data && j[a].data.screenshots;
        if (ss && ss[0]) { pick.bg = ss[0].path_full; changed = true; console.log(date, pick.name, 'bg ok'); }
        else console.log(date, pick.name, '无截图');
      } catch (e) { console.log(date, pick.name, 'fetch失败'); }
      await sleep(300);
    }
    if (changed) fs.writeFileSync(p, JSON.stringify(day, null, 1), 'utf8');
  }
  console.log('done');
})();
