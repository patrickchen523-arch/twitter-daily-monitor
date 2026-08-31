/* 经 Chrome 拉 Roblox 详情/图标(本机直连超时时的代理通道): node tools\fetch_roblox_via_chrome.cjs <日期> */
const fs = require('fs');
const path = require('path');
const { chromium } = require('G:/教理问答/教理问答/node_modules/playwright-core');
const root = path.join(__dirname, '..');
const date = process.argv[2];
if (!date) { console.error('usage: node tools\\fetch_roblox_via_chrome.cjs <date>'); process.exit(1); }
const launchedPath = path.join(root, 'data', 'launched', date + '.json');
const launched = JSON.parse(fs.readFileSync(launchedPath, 'utf8'));
const board = launched.boards.find(b => b.id === 'roblox');
const GENRE_CN = {
  'Simulation': '模拟', 'Incremental Simulator': '增量模拟', 'Roleplay & Avatar Sim': '角色扮演',
  'Life': '生活模拟', 'Survival': '生存', '1 vs All': '一对多对抗', 'Tycoon': '大亨经营',
  'RPG': 'RPG', 'Action RPG': '动作RPG', 'Pet Care': '宠物养成', 'Shooter': '射击',
  'Deathmatch Shooter': '死斗竞技', 'Adventure': '冒险', 'Horror': '恐怖', 'Obby': '跑酷',
  'Fighting': '格斗', 'Strategy': '策略', 'Puzzle': '解谜', 'Sports': '体育', 'Racing': '竞速'
};
const hasCn = s => /[\u4e00-\u9fa5]/.test(s || '');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await b.newContext({ userAgent: 'Mozilla/5.0' });
  const getJson = async url => {
    const r = await ctx.request.get(url, { timeout: 20000 }).catch(e => { console.log('REQ FAIL', e.message.slice(0, 80), url.slice(0, 60)); return null; });
    if (!r) return null;
    if (!r.ok()) { console.log('HTTP', r.status(), url.slice(0, 70)); return null; }
    return r.json().catch(() => null);
  };
  // games/thumbnails 子域 403/超时 → 浏览器页面导航取 JSON; 再不行走 roproxy 镜像
  const page = await ctx.newPage();
  const getJsonViaPage = async url => {
    try {
      const r = await page.goto(url, { timeout: 25000, waitUntil: 'domcontentloaded' });
      if (!r || !r.ok()) { console.log('PAGE HTTP', r && r.status(), url.slice(0, 70)); return null; }
      const txt = await page.evaluate(() => document.body.innerText);
      return JSON.parse(txt);
    } catch (e) { console.log('PAGE FAIL', e.message.slice(0, 60), url.slice(0, 60)); return null; }
  };
  const getJsonSmart = async url => {
    let j = await getJsonViaPage(url);
    if (!j) j = await getJson(url.replace('games.roblox.com', 'games.roproxy.com').replace('thumbnails.roblox.com', 'thumbnails.roproxy.com'));
    return j;
  };
  for (const it of board.items) {
    if (!it.universeId) {
      const s = await getJson(`https://apis.roblox.com/search-api/omni-search?searchQuery=${encodeURIComponent(it.name)}&pageType=all&sessionId=s${Date.now()}`);
      const games = s && s.searchResults && s.searchResults.find(r => r.contentGroupType === 'Game');
      const first = games && games.contents && games.contents[0];
      if (first && first.universeId) {
        it.universeId = first.universeId;
        it.link = `https://www.roblox.com/games/${first.rootPlaceId || ''}/`;
        console.log('universeId OK:', it.name, '->', first.name);
      } else console.log('未找到:', it.name);
    }
  }
  const ids = board.items.map(it => it.universeId).filter(Boolean);
  if (ids.length) {
    const j = await getJsonSmart(`https://games.roblox.com/v1/games?universeIds=${ids.join(',')}`);
    const byId = {};
    (j && j.data || []).forEach(g => { byId[g.id] = g; });
    for (const it of board.items) {
      const g = byId[it.universeId];
      if (!g) { console.log('无详情:', it.name); continue; }
      if (!hasCn(it.desc)) it.desc = (g.description || '').replace(/\s+/g, ' ').trim().slice(0, 300) || null;
      if (!hasCn(it.genre)) it.genre = [g.genre_l1, g.genre_l2].filter(x => x && x !== 'All').map(x => GENRE_CN[x] || x).join(' / ') || null;
      it.release = it.release || (g.created ? g.created.slice(0, 10) : null);
      it.playing = g.playing || null;
      it.visits = g.visits || null;
    }
    const t = await getJsonSmart(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${ids.join(',')}&size=512x512&format=Png&isCircular=false`);
    const thumbById = {};
    (t && t.data || []).forEach(x => { thumbById[x.targetId] = x.imageUrl; });
    for (const it of board.items) {
      if (!it.thumb && thumbById[it.universeId]) { it.thumb = thumbById[it.universeId]; console.log('thumb OK:', it.name); }
    }
  }
  fs.writeFileSync(launchedPath, JSON.stringify(launched, null, 1), 'utf8');
  console.log('written');
  await b.close();
})();
