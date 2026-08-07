// Roblox 周榜游戏详情: 简介/类型/创建时间/实时在线 -> 写入 launched JSON 条目
// 用法: node tools/fetch_roblox_details.js [日期]
const https = require('https');
const fs = require('fs');
const path = require('path');

const date = process.argv[2] || '2026-08-05';
const launchedPath = path.join(__dirname, '..', 'data', 'launched', `${date}.json`);
const launched = JSON.parse(fs.readFileSync(launchedPath, 'utf8'));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = url => new Promise(resolve => {
  const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 12000 }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(null); } });
    res.on('error', () => resolve(null));
  });
  req.on('timeout', () => { req.destroy(); resolve(null); });
  req.on('error', () => resolve(null));
});

(async () => {
  const board = launched.boards.find(b => b.id === 'roblox');
  if (!board) { console.log('no roblox board'); return; }

  // 1. 每个游戏搜 universeId
  for (const it of board.items) {
    if (it.universeId) continue;
    const q = encodeURIComponent(it.name);
    const s = await getJson(`https://apis.roblox.com/search-api/omni-search?searchQuery=${q}&pageType=all&sessionId=s${Date.now()}`);
    const games = s && s.searchResults && s.searchResults.find(r => r.contentGroupType === 'Game');
    const first = games && games.contents && games.contents[0];
    if (first && first.universeId) it.universeId = first.universeId;
    await sleep(150);
  }

  // 2. 批量取详情
  const ids = board.items.map(it => it.universeId).filter(Boolean);
  const j = await getJson(`https://games.roblox.com/v1/games?universeIds=${ids.join(',')}`);
  const byId = {};
  (j && j.data || []).forEach(g => { byId[g.id] = g; });
  const GENRE_CN = {
    'Simulation': '模拟', 'Incremental Simulator': '增量模拟', 'Roleplay & Avatar Sim': '角色扮演',
    'Life': '生活模拟', 'Survival': '生存', '1 vs All': '一对多对抗', 'Tycoon': '大亨经营',
    'RPG': 'RPG', 'Action RPG': '动作RPG', 'Pet Care': '宠物养成', 'Shooter': '射击',
    'Deathmatch Shooter': '死斗竞技', 'Adventure': '冒险', 'Horror': '恐怖', 'Obby': '跑酷',
    'Fighting': '格斗', 'Strategy': '策略', 'Puzzle': '解谜', 'Sports': '体育', 'Racing': '竞速'
  };
  const hasCn = s => /[\u4e00-\u9fa5]/.test(s || '');
  for (const it of board.items) {
    const g = byId[it.universeId];
    if (!g) { console.log('无详情:', it.name); continue; }
    // 已有中文简介/类型不覆盖(人工翻译优先)
    if (!hasCn(it.desc)) it.desc = (g.description || '').replace(/\s+/g, ' ').trim().slice(0, 300) || null;
    if (!hasCn(it.genre)) {
      it.genre = [g.genre_l1, g.genre_l2].filter(x => x && x !== 'All').map(x => GENRE_CN[x] || x).join(' / ') || null;
    }
    it.release = g.created ? g.created.slice(0, 10) : null;
    it.playing = g.playing || null;
    it.visits = g.visits || null;
    console.log(`OK ${it.name}: genre=${it.genre || '-'} created=${it.release} playing=${it.playing}`);
  }
  fs.writeFileSync(launchedPath, JSON.stringify(launched, null, 1), 'utf8');
  console.log('written');
})();
