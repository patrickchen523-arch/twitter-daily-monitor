/* 旧式Steam封面(cloudflare /steam/apps/<id>/header.jpg)校验: 失效则换 appdetails 哈希直链 */
/* 用法: node tools\fix_steam_legacy_covers.cjs [日期...] 缺省=manifest全部日期 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const root = path.join(__dirname, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const head = url => new Promise(resolve => {
  const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 8000 }, res => resolve(res.statusCode));
  req.on('error', () => resolve(0));
  req.on('timeout', () => { req.destroy(); resolve(0); });
  req.end();
});
const getJson = url => new Promise(resolve => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(null); } });
    res.on('error', () => resolve(null));
  }).on('error', () => resolve(null));
});
const LEGACY = /cdn\.cloudflare\.steamstatic\.com\/steam\/apps\/(\d+)\/header\.jpg/;
(async () => {
  const man = JSON.parse(fs.readFileSync(path.join(root, 'data', 'launched', 'manifest.json'), 'utf8'));
  const dates = process.argv.slice(2).length ? process.argv.slice(2) : man.dates;
  const cache = {}; // appid -> hashed url | null
  for (const date of dates) {
    const p = path.join(root, 'data', 'launched', date + '.json');
    if (!fs.existsSync(p)) continue;
    const day = JSON.parse(fs.readFileSync(p, 'utf8'));
    const spots = [];
    for (const b of day.boards || []) for (const it of b.items || []) spots.push({ it, k: 'thumb' });
    for (const w of (day.watch && day.watch.featured) || []) spots.push({ it: w, k: 'cover' });
    for (const pk of day.picks || []) spots.push({ it: pk, k: 'cover' });
    let fixed = 0;
    for (const { it, k } of spots) {
      const m = LEGACY.exec(String(it[k] || ''));
      if (!m) continue;
      const appid = m[1];
      if (!(appid in cache)) {
        if ((await head(it[k])) === 200) { cache[appid] = 'OK'; }
        else {
          const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${appid}&filters=header_image`);
          cache[appid] = (j && j[appid] && j[appid].success && j[appid].data && j[appid].data.header_image) || null;
        }
        await sleep(300);
      }
      const c = cache[appid];
      if (c && c !== 'OK') { it[k] = c; fixed++; }
      else if (c === null) { delete it[k]; fixed++; console.log(date, '无哈希图,置空:', it.name, appid); }
    }
    if (fixed) fs.writeFileSync(p, JSON.stringify(day, null, 1), 'utf8');
    console.log(date, 'fixed', fixed);
  }
})();
