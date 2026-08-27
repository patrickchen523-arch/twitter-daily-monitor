/* 0826期: Steam商店API限流, 26号榜与25号同批游戏 → 从25号板复制名称/图/发售日, 仅用raw更新metric/sub; 新游戏低速率单拉 */
/* 用法: node tools\backfill_0826_steamdb.cjs */
const fs = require('fs');
const path = require('path');
const https = require('https');
const root = path.join(__dirname, '..');
const raw = JSON.parse(fs.readFileSync(path.join(root, 'data', 'launched', 'raw', 'steamdb-trending-2026-08-26.json'), 'utf8'));
const d25 = JSON.parse(fs.readFileSync(path.join(root, 'data', 'launched', '2026-08-25.json'), 'utf8'));
const d26 = JSON.parse(fs.readFileSync(path.join(root, 'data', 'launched', '2026-08-26.json'), 'utf8'));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = url => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    res.on('error', reject);
  }).on('error', reject);
});

const byAppid = {};
for (const it of d25.boards.find(b => b.id === 'steamdb').items) {
  const a = (String(it.link).match(/app\/(\d+)/) || [])[1];
  if (a) byAppid[a] = it;
}
// 25号进观测区的appid = 未上线
const unrelAppid = new Set();
for (const w of d25.watch.featured) {
  const a = (String(w.link || '').match(/app\/(\d+)/) || [])[1];
  if (a) unrelAppid.add(a);
}
// 清掉限流导入误加的英文重复观测条目
const DUP = ['The Defiant', 'Alien: Isolation 2', 'Stray Dog: nobody cares'];
d26.watch.featured = d26.watch.featured.filter(w => !DUP.includes(w.name));

const buildSub = c => {
  const rating = c[5] && c[5] !== '—' ? c[5] : null;
  const total = c[7] || '';
  return [rating ? `好评 ${rating}` : null, total ? `关注 ${total}` : null].filter(Boolean).join(' · ');
};

(async () => {
const items = [];
for (const it of raw.items) {
  if (items.length >= 50) break;
  const a = String(it.appid);
  const c = it.cells;
  const release = c[6] || '';
  const coming = unrelAppid.has(a) || release.includes('快') || release.includes('Soon');
  if (coming) continue; // 观测区已由25号脚手架带入
  const prev = byAppid[a];
  if (prev) {
    items.push({ name: prev.name, metric: c[8] || '', sub: buildSub(c), thumb: prev.thumb, release: prev.release, link: prev.link });
    continue;
  }
  // 新游戏: 低速率拉商店接口
  let name = c[2] || it.name, thumb = null, releaseIso = null, comingSoon = false;
  try {
    const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${a}&l=schinese`);
    const d = j[a];
    if (d && d.success && d.data) {
      thumb = d.data.header_image || null;
      if (d.data.name && /[\u4e00-\u9fa5]/.test(d.data.name)) name = d.data.name;
      if (d.data.release_date) {
        comingSoon = !!d.data.release_date.coming_soon;
        const m = String(d.data.release_date.date || '').match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})/);
        if (m) releaseIso = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
      }
    }
  } catch (e) { console.log('API fail', a, e.message); }
  await sleep(900);
  if (comingSoon) {
    if (!d26.watch.featured.some(w => w.name === name)) {
      d26.watch.featured.push({ name, date: '即将发售', note: `SteamDB 趋势榜在列：关注增长 ${c[8]} · 总关注 ${c[7]}`, cover: thumb, link: `https://store.steampowered.com/app/${a}/` });
    }
    console.log('(未上线->观测区)', name);
    continue;
  }
  items.push({ name, metric: c[8] || '', sub: buildSub(c), thumb, release: releaseIso, link: `https://store.steampowered.com/app/${a}/` });
  console.log('(新游)', items.length + '.', name, c[8], thumb ? '' : '(无图)');
}
console.log('items:', items.length);
const board = d26.boards.find(b => b.id === 'steamdb');
board.title = 'SteamDB Trending Games';
board.title_en = 'STEAMDB';
board.demo = false;
board.items = items;
board.more = { label: '查看完整榜单', href: 'https://steamdb.info/stats/trendingfollowers/' };
fs.writeFileSync(path.join(root, 'data', 'launched', '2026-08-26.json'), JSON.stringify(d26, null, 1), 'utf8');
console.log('written 2026-08-26.json');
})();
