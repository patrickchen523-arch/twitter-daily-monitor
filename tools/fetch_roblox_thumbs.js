// Roblox 周榜游戏缩略图: omni-search 拿 universeId -> 官方图标 CDN -> 写入 launched JSON
// 用法: node tools/fetch_roblox_thumbs.js [日期]
const https = require('https');
const fs = require('fs');
const path = require('path');

const date = process.argv[2] || '2026-08-05';
const launchedPath = path.join(__dirname, '..', 'data', 'launched', `${date}.json`);
const launched = JSON.parse(fs.readFileSync(launchedPath, 'utf8'));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = url => new Promise(resolve => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(null); } });
    res.on('error', () => resolve(null));
  }).on('error', () => resolve(null));
});

(async () => {
  const board = launched.boards.find(b => b.id === 'roblox');
  if (!board) { console.log('no roblox board'); return; }
  for (const it of board.items) {
    try {
      const q = encodeURIComponent(it.name);
      const s = await getJson(`https://apis.roblox.com/search-api/omni-search?searchQuery=${q}&pageType=all&sessionId=s${Date.now()}`);
      const games = s && s.searchResults && s.searchResults.find(r => r.contentGroupType === 'Game');
      const first = games && games.contents && games.contents[0];
      if (!first || !first.universeId) { console.log('未找到:', it.name); continue; }
      await sleep(150);
      const t = await getJson(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${first.universeId}&size=512x512&format=Png&isCircular=false`);
      const url = t && t.data && t.data[0] && t.data[0].imageUrl;
      if (url) {
        it.thumb = url;
        it.link = `https://www.roblox.com/games/${first.rootPlaceId || ''}/`;
        console.log(`OK ${it.name} -> ${first.name} (${first.universeId})`);
      } else {
        console.log('无图:', it.name);
      }
    } catch (e) {
      console.log('error:', it.name, e.message);
    }
    await sleep(150);
  }
  fs.writeFileSync(launchedPath, JSON.stringify(launched, null, 1), 'utf8');
  console.log('written');
})();
