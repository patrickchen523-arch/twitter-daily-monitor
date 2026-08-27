/* 0824/0826期: bili-rank导出封面为懒加载占位图 → 按BV号拉真实封面修复 thumb/pick cover/watch cover */
/* 用法: node tools\fix_bili_covers_0824_26.cjs */
const fs = require('fs');
const path = require('path');
const https = require('https');
const root = path.join(__dirname, '..');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = url => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.bilibili.com/' } }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    res.on('error', reject);
  }).on('error', reject);
});
const isBad = u => !u || u.startsWith('https:data:');
(async () => {
  const picCache = {};
  const picOf = async link => {
    const bv = (String(link || '').match(/video\/(BV\w+)/) || [])[1];
    if (!bv) return null;
    if (picCache[bv]) return picCache[bv];
    try {
      const j = await getJson('https://api.bilibili.com/x/web-interface/view?bvid=' + bv);
      picCache[bv] = (j.code === 0 && j.data && j.data.pic) || null;
    } catch (e) { picCache[bv] = null; }
    await sleep(400);
    return picCache[bv];
  };
  for (const date of ['2026-08-24', '2026-08-25', '2026-08-26']) {
    const p = path.join(root, 'data', 'launched', date + '.json');
    const day = JSON.parse(fs.readFileSync(p, 'utf8'));
    let fixed = 0;
    const targets = [];
    for (const b of day.boards) for (const it of b.items || []) targets.push({ it, f: 'thumb' });
    for (const w of (day.watch && day.watch.featured) || []) targets.push({ it: w, f: 'cover' });
    for (const pk of day.picks || []) targets.push({ it: pk, f: 'cover' });
    for (const { it, f } of targets) {
      if (!isBad(it[f])) continue;
      const pic = await picOf(it.link);
      if (pic) { it[f] = pic; fixed++; }
      else console.log(date, '仍无图:', it.name, it.link);
    }
    if (fixed) fs.writeFileSync(p, JSON.stringify(day, null, 1), 'utf8');
    console.log(date, 'fixed', fixed);
  }
})();
