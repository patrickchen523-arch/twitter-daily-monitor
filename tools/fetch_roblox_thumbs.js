// Roblox 周榜游戏缩略图: omni-search 拿 universeId -> 官方图标 CDN -> 写入 launched JSON
// 用法: node tools/fetch_roblox_thumbs.js [日期]
const fs = require('fs');
const path = require('path');
const { getJson } = require('./_roblox_http.cjs');  // 直连失败自动走代理（公司网络直连 roblox API 会挂起）

const date = process.argv[2] || '2026-08-05';
const launchedPath = path.join(__dirname, '..', 'data', 'launched', `${date}.json`);
const launched = JSON.parse(fs.readFileSync(launchedPath, 'utf8'));

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const board = launched.boards.find(b => b.id === 'roblox');
  if (!board) { console.log('no roblox board'); return; }
  for (const it of board.items) {
    try {
      // omni-search 偶发风控返回空组：未命中时换新 sessionId 重试一次
      let first = null;
      for (let attempt = 0; attempt < 2 && !first; attempt++) {
        if (attempt) await sleep(1200);
        const q = encodeURIComponent(it.name);
        const s = await getJson(`https://apis.roblox.com/search-api/omni-search?searchQuery=${q}&pageType=all&sessionId=s${Date.now()}${attempt}`);
        const groups = (s && s.searchResults || []).filter(r => r.contentGroupType === 'Game');
        first = groups.flatMap(g => g.contents || [])[0] || null;
      }
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
