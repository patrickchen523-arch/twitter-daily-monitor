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
  const top = src.items.slice(0, 10);
  const items = [];
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
    try {
      const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${it.appid}&l=schinese`);
      const d = j[it.appid];
      thumb = d && d.success && d.data && d.data.header_image;
      if (d && d.success && d.data && d.data.name) officialName = d.data.name;
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
    items.push({
      name,
      metric: gain,
      sub,
      thumb,
      link: `https://store.steampowered.com/app/${it.appid}/`
    });
    console.log(`${items.length}. ${name} ${gain} ${thumb ? '' : '(无图)'}`);
    await sleep(300);
  }
  const board = launched.boards.find(b => b.id === 'steamdb');
  if (board) {
    board.title = 'SteamDB 趋势榜';
    board.title_en = 'STEAMDB TRENDING';
    board.demo = false;
    board.items = items;
    board.more = { label: '查看完整榜单', href: 'https://steamdb.info/stats/trendingfollowers/' };
  }
  fs.writeFileSync(launchedPath, JSON.stringify(launched, null, 1), 'utf8');
  console.log('written:', launchedPath);
})();
