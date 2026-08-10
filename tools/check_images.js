// 检查上线日推所有图片URL(榜单缩略图/观测区封面/详情封面), 404 的用 API 哈希直链修复
const https = require('https');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const date = process.argv[2] || '2026-08-05';
const launchedPath = path.join(root, 'data', 'launched', `${date}.json`);
const detPath = path.join(root, 'data', 'game-details.json');
const launched = JSON.parse(fs.readFileSync(launchedPath, 'utf8'));
const det = JSON.parse(fs.readFileSync(detPath, 'utf8'));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const head = url => new Promise(resolve => {
  const req = https.request(url, { method: 'HEAD', headers: { 'User-Agent': 'Mozilla/5.0' } }, res => resolve(res.statusCode));
  req.on('error', () => resolve(0));
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

async function fixUrl(url, appid) {
  const code = await head(url);
  if (code === 200) return url;
  // 用 appdetails 哈希直链兜底
  if (appid) {
    const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${appid}`);
    const img = j && j[appid] && j[appid].success && j[appid].data && j[appid].data.header_image;
    if (img && (await head(img)) === 200) {
      console.log(`  修复 ${appid}: ${url.slice(0, 70)} -> hashed`);
      return img;
    }
  }
  console.log(`  仍裂 ${appid || ''}: ${url.slice(0, 90)}`);
  return null;
}

(async () => {
  // 1. launched JSON: 榜单 thumb / watch cover / picks cover / hero_bg
  const spots = [];
  (launched.boards || []).forEach(b => (b.items || []).forEach(it => it.thumb && spots.push({ obj: it, key: 'thumb' })));
  if (launched.watch && launched.watch.featured) launched.watch.featured.forEach(w => w.cover && spots.push({ obj: w, key: 'cover' }));
  (launched.picks || []).forEach(p => p.cover && spots.push({ obj: p, key: 'cover' }));
  if (launched.hero_bg) spots.push({ obj: launched, key: 'hero_bg' });
  for (const s of spots) {
    const appid = (String(s.obj.link || s.obj.steam || '').match(/app\/(\d+)/) || [])[1];
    const fixed = await fixUrl(s.obj[s.key], appid);
    if (fixed === null) delete s.obj[s.key];
    else s.obj[s.key] = fixed;
    await sleep(120);
  }
  fs.writeFileSync(launchedPath, JSON.stringify(launched, null, 1), 'utf8');

  // 2. game-details covers
  for (const d of Object.values(det.byAppid)) {
    if (!d.cover) continue;
    const fixed = await fixUrl(d.cover, d.appid);
    if (fixed === null) d.cover = null;
    else d.cover = fixed;
    await sleep(120);
  }
  fs.writeFileSync(detPath, JSON.stringify(det, null, 1), 'utf8');
  console.log('done');
})();
