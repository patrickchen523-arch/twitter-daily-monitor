// 构建游戏详情数据 -> data/game-details.json
// 覆盖: 游戏库132款全字段 + 上线日推榜单/观测中出现的 Steam 游戏(简介等)
const https = require('https');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const lib = JSON.parse(fs.readFileSync(path.join(root, 'data', 'games-library.json'), 'utf8'));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = url => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    res.on('error', reject);
  }).on('error', reject);
});

const norm = s => String(s || '').toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '');

async function fetchSteam(appid) {
  try {
    const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=schinese`);
    const d = j[String(appid)];
    if (!d || !d.success || !d.data) return null;
    const v = d.data;
    return {
      steam_name: v.name || null,
      desc: v.short_description ? String(v.short_description).replace(/<[^>]*>/g, '').trim() : null,
      dev: Array.isArray(v.developers) ? v.developers : [],
      pub: Array.isArray(v.publishers) ? v.publishers : []
    };
  } catch (e) { return null; }
}

(async () => {
  const byName = {};
  const byAppid = {};

  // 1. 游戏库全量
  for (const g of lib.games) {
    const det = {
      name: g.name,
      name_cn: g.name_cn || null,
      release: g.release_date || null,
      dev: g.developer || [],
      pub: g.publisher || [],
      tags: g.tags || [],
      desc: null,
      pcu: g.pcu_peak || null,
      sales: g.est_sales || null,
      revenue: g.est_revenue || null,
      reviews: g.reviews || null,
      rating: g.rating != null ? Math.round(g.rating) : null,
      cover: g.cover || (g.appid ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/header.jpg` : null),
      steam: g.steam || (g.appid ? `https://store.steampowered.com/app/${g.appid}/` : null),
      appid: g.appid || null
    };
    byName[norm(g.name)] = det;
    if (g.appid) byAppid[g.appid] = det;
  }

  // 2. 库内游戏补 Steam 简介
  let descOk = 0;
  for (const g of lib.games) {
    if (!g.appid) continue;
    const det = byAppid[g.appid];
    const s = await fetchSteam(g.appid);
    if (s) {
      det.desc = s.desc;
      if (!det.dev.length && s.dev.length) det.dev = s.dev;
      if (!det.pub.length && s.pub.length) det.pub = s.pub;
      if (s.desc) descOk++;
    }
    await sleep(220);
  }
  console.log('库内简介:', descOk, '/', lib.games.length);

  // 3. 上线日推 JSON 里出现但未入库的 Steam 游戏
  const launchedDir = path.join(root, 'data', 'launched');
  const seen = new Set(Object.keys(byAppid));
  const todo = [];
  for (const f of fs.readdirSync(launchedDir).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))) {
    const d = JSON.parse(fs.readFileSync(path.join(launchedDir, f), 'utf8'));
    const urls = [];
    (d.boards || []).forEach(b => (b.items || []).forEach(it => it.link && urls.push(it.link)));
    if (d.watch && d.watch.featured) d.watch.featured.forEach(w => w.link && urls.push(w.link));
    (d.picks || []).forEach(p => p.link && urls.push(p.link));
    for (const u of urls) {
      const m = String(u).match(/store\.steampowered\.com\/app\/(\d+)/);
      if (m && !seen.has(m[1]) && !todo.includes(m[1])) todo.push(m[1]);
    }
  }
  console.log('榜单独有 Steam 游戏:', todo.length);
  for (const appid of todo) {
    const s = await fetchSteam(appid);
    const det = {
      name: (s && s.steam_name) || `app ${appid}`,
      name_cn: null,
      release: null,
      dev: s ? s.dev : [],
      pub: s ? s.pub : [],
      tags: [],
      desc: s ? s.desc : null,
      pcu: null, sales: null, revenue: null, reviews: null, rating: null,
      cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`,
      steam: `https://store.steampowered.com/app/${appid}/`,
      appid
    };
    // 发售日期另取
    try {
      const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=schinese`);
      const v = j[String(appid)].data;
      const rd = v.release_date;
      if (rd && !rd.coming_soon) {
        const m = String(rd.date).match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})/);
        if (m) det.release = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
      }
      if (v.name && /[\u4e00-\u9fa5]/.test(v.name)) det.name_cn = v.name;
    } catch (e) {}
    byAppid[appid] = det;
    byName[norm(det.name)] = det;
    console.log('  +', det.name, det.name_cn || '');
    await sleep(250);
  }

  fs.writeFileSync(path.join(root, 'data', 'game-details.json'), JSON.stringify({ byName, byAppid }, null, 1), 'utf8');
  console.log('written. byName:', Object.keys(byName).length, 'byAppid:', Object.keys(byAppid).length);
})();
