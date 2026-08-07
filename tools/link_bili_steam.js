// B站榜单游戏按名称关联 Steam appid 并补全详情 -> game-details.json
// 用法: node tools/link_bili_steam.js [日期]
const https = require('https');
const fs = require('fs');
const path = require('path');

const date = process.argv[2] || '2026-08-05';
const root = path.join(__dirname, '..');
const detPath = path.join(root, 'data', 'game-details.json');
const det = JSON.parse(fs.readFileSync(detPath, 'utf8'));
const launched = JSON.parse(fs.readFileSync(path.join(root, 'data', 'launched', `${date}.json`), 'utf8'));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = url => new Promise(resolve => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(null); } });
    res.on('error', () => resolve(null));
  }).on('error', () => resolve(null));
});
const norm = s => String(s || '').toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '');

(async () => {
  const board = launched.boards.find(b => b.id === 'bilibili');
  const names = board.items.map(it => it.name);
  for (const name of names) {
    if (det.byName[norm(name)]) continue;
    // 别名拆分 "Hachishakusama | 八尺様がいた夏休み"
    const tries = name.split('|').map(s => s.trim()).filter(Boolean);
    let hit = null;
    for (const t of tries) {
      const res = await getJson(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(t)}&cc=cn&l=schinese`);
      hit = (res && res.items || []).find(x => norm(x.name) === norm(t));
      if (hit) break;
      await sleep(250);
    }
    if (!hit) { console.log('Steam 未找到(视为非Steam游戏):', name); continue; }
    const appid = String(hit.id);
    const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=schinese`);
    const v = j && j[appid] && j[appid].success ? j[appid].data : null;
    const entry = {
      name: v ? v.name : hit.name,
      name_cn: v && /[\u4e00-\u9fa5]/.test(v.name) ? v.name : (hit.name !== name ? name : null),
      release: null,
      dev: v && v.developers || [],
      pub: v && v.publishers || [],
      tags: [],
      desc: v && v.short_description ? String(v.short_description).replace(/<[^>]*>/g, '').trim() : null,
      pcu: null, sales: null, revenue: null, reviews: null, rating: null,
      cover: `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`,
      steam: `https://store.steampowered.com/app/${appid}/`,
      appid
    };
    if (v && v.release_date) {
      if (v.release_date.coming_soon) entry.release = '9999-12-31';
      else {
        const m = String(v.release_date.date).match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})/);
        if (m) entry.release = `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
      }
    }
    if (v && v.is_free) { entry.sales = null; entry.revenue = null; entry.free = true; }
    det.byAppid[appid] = entry;
    det.byName[norm(name)] = entry;
    if (entry.name) det.byName[norm(entry.name)] = entry;
    console.log(`关联: ${name} -> ${appid} ${entry.name}${entry.free ? ' (免费)' : ''}`);
    await sleep(300);
  }
  fs.writeFileSync(detPath, JSON.stringify(det, null, 1), 'utf8');
  console.log('written:', detPath);
})();
