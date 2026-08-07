// SteamDB trendingfollowers 导出 -> 上线日推 steamdb 板块
// 用法: node tools/import_steamdb_trending.js <导出json路径> [日期]
const https = require('https');
const fs = require('fs');
const path = require('path');

const srcPath = process.argv[2];
const date = process.argv[3] || '2026-08-05';
if (!srcPath) { console.error('usage: node import_steamdb_trending.js <json> [date]'); process.exit(1); }

const launchedPath = path.join(__dirname, '..', 'data', 'launched', `${date}.json`);
const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
const launched = JSON.parse(fs.readFileSync(launchedPath, 'utf8'));

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
  const top = src.items.slice(0, 100); // 取满前50名已上线(未上线的挪观测区)
  const items = [];
  const unreleased = [];
  for (const it of top) {
    const c = it.cells;
    let name = c[2] || it.name;
    const rating = c[5] && c[5] !== '—' ? c[5] : null;
    const release = c[6] || '';
    const gain = (c[8] || '').replace('+', '+');
    const total = c[7] || '';
    const sub = [
      release.includes('快') || release.includes('Soon') ? '即将发售' : null,
      rating ? `好评 ${rating}` : null,
      total ? `关注 ${total}` : null
    ].filter(Boolean).join(' · ');
    let thumb = null;
    let officialName = null;
    let comingSoon = false;
    let releaseIso = null;
    try {
      const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${it.appid}&l=schinese`);
      const d = j[it.appid];
      thumb = d && d.success && d.data && d.data.header_image;
      if (d && d.success && d.data && d.data.name) officialName = d.data.name;
      if (d && d.success && d.data && d.data.release_date) {
        comingSoon = !!d.data.release_date.coming_soon;
        const m = String(d.data.release_date.date || '').match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})/);
        if (m) releaseIso = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
      } else {
        // 简中接口区域限制时, 用英文接口兜底判定
        const je = await getJson(`https://store.steampowered.com/api/appdetails?appids=${it.appid}&cc=us&l=en`);
        const de = je && je[it.appid];
        if (de && de.success && de.data) {
          if (de.data.release_date) {
            comingSoon = !!de.data.release_date.coming_soon;
            const t = Date.parse(de.data.release_date.date || '');
            if (!comingSoon && !Number.isNaN(t)) releaseIso = new Date(t).toISOString().slice(0, 10);
          }
          if (!thumb && de.data.header_image) thumb = de.data.header_image;
        }
      }
    } catch (e) {}
    // 官方中文名: 简中商店名含中文字符才采用,否则拉英文官方名
    if (officialName && /[\u4e00-\u9fa5]/.test(officialName)) {
      name = officialName;
    } else {
      try {
        const je = await getJson(`https://store.steampowered.com/api/appdetails?appids=${it.appid}&l=en`);
        const de = je[it.appid];
        if (de && de.success && de.data && de.data.name) name = de.data.name;
      } catch (e) {}
      await sleep(200);
    }
    const entry = {
      name,
      metric: gain,
      sub,
      thumb,
      release: releaseIso,
      link: `https://store.steampowered.com/app/${it.appid}/`
    };
    if (comingSoon || release.includes('快') || release.includes('Soon')) {
      unreleased.push({
        name,
        date: comingSoon ? '即将发售' : '发售日期待定',
        note: `SteamDB 趋势榜在列：关注增长 ${gain} · 总关注 ${total}`,
        cover: thumb,
        link: entry.link
      });
      console.log(`(未上线->观测区) ${name} ${gain}`);
    } else {
      items.push(entry);
      console.log(`${items.length}. ${name} ${gain} ${thumb ? '' : '(无图)'}`);
    }
    await sleep(300);
    if (items.length >= 50) break;
  }
  const board = launched.boards.find(b => b.id === 'steamdb');
  if (board) {
    board.title = 'SteamDB Trending Games';
    board.title_en = 'STEAMDB';
    board.demo = false;
    board.items = items;
    board.more = { label: '查看完整榜单', href: 'https://steamdb.info/stats/trendingfollowers/' };
  }
  // 未上线游戏并入观测区 featured(按名称去重)
  if (unreleased.length) {
    launched.watch = launched.watch || { featured: [], calendar: [] };
    launched.watch.featured = launched.watch.featured || [];
    for (const u of unreleased) {
      if (!launched.watch.featured.some(w => w.name === u.name)) launched.watch.featured.push(u);
    }
  }
  fs.writeFileSync(launchedPath, JSON.stringify(launched, null, 1), 'utf8');
  console.log('written:', launchedPath);
})();
