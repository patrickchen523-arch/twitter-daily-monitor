// 今日推荐(1大4小)自动生成: 当日三榜并集 - 成熟名单
// 评分: 推特浏览/榜首*40 + SteamDB关注增长/榜首*30 + B站机会分*0.3
// 加成: 好评率>=85且评测>=100 ×1.1; 同时在>=2榜 ×1.25; Top5, 第1名进大卡
// 用法: node tools/gen_picks.cjs <日期> [--dry]
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const date = process.argv[2];
const DRY = process.argv.includes('--dry');
if (!date) { console.log('用法: node tools/gen_picks.cjs <日期> [--dry]'); process.exit(1); }

const dayPath = path.join(root, 'data', 'launched', `${date}.json`);
const day = JSON.parse(fs.readFileSync(dayPath, 'utf8'));
const matureMap = JSON.parse(fs.readFileSync(path.join(root, 'data', 'launched', 'bili-mature.json'), 'utf8'));
const det = JSON.parse(fs.readFileSync(path.join(root, 'data', 'game-details.json'), 'utf8'));
const byNameLow = {};
for (const k of Object.keys(det.byName || {})) byNameLow[k.toLowerCase()] = det.byName[k];

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
const num = s => {
  if (s == null) return 0;
  const str = String(s).replace(/[,+\s]/g, '');
  const m = str.match(/([\d.]+)/);
  if (!m) return 0;
  let v = parseFloat(m[1]);
  if (/万/.test(str)) v *= 10000;
  return v || 0;
};
const appidOf = it => (String(it.link || it.steam || '').match(/app\/(\d+)/) || [])[1] || '';
const keyOf = it => { const a = appidOf(it); return a ? 'app:' + a : 'nm:' + norm(it.name); };
const detailOf = (it, appid) => {
  if (appid && det.byAppid && det.byAppid[appid]) return det.byAppid[appid];
  return (det.byName || {})[it.name] || byNameLow[String(it.name || '').toLowerCase()] || null;
};
const isMature = it => it.mature === true || matureMap[it.name] === '是';

function boardKind(b) {
  const t = ((b.id || '') + (b.title || '')).toLowerCase();
  if (/steam/.test(t)) return 'steamdb';
  if (/bili|哔哩/.test(t)) return 'bilibili';
  if (/twitter|推特/.test(t)) return 'twitter';
  return 'other'; // roblox 周榜等不参与推荐
}

const cand = {};
for (const b of day.boards || []) {
  const kind = boardKind(b);
  if (kind === 'other') continue;
  for (const it of b.items || []) {
    if (!it.name || isMature(it)) continue;
    const k = keyOf(it);
    const c = cand[k] || (cand[k] = { name: it.name, appid: appidOf(it), boards: {}, thumb: '', link: it.link || '' });
    if (!c.appid) c.appid = appidOf(it);
    if (!c.thumb && it.thumb) c.thumb = it.thumb;
    if (!c.link && it.link) c.link = it.link;
    if (kind === 'steamdb') {
      c.boards.steamdb = { gain: num(it.metric), raw: it.metric, sub: it.sub || '' };
    } else if (kind === 'twitter') {
      c.boards.twitter = { views: num(it.metric), raw: it.metric };
    } else if (kind === 'bilibili') {
      const opp = (String(it.sub || '').match(/机会分\s*(\d+)/) || [])[1];
      c.boards.bilibili = { opp: opp ? +opp : 0, raw: it.metric };
    }
  }
}

const list = Object.values(cand);
const maxViews = Math.max(0, ...list.map(c => (c.boards.twitter || {}).views || 0));
const maxGain = Math.max(0, ...list.map(c => (c.boards.steamdb || {}).gain || 0));

for (const c of list) {
  const d = detailOf(c, c.appid);
  c.detail = d;
  const tw = c.boards.twitter, sd = c.boards.steamdb, bl = c.boards.bilibili;
  let s = 0;
  if (tw && maxViews) s += tw.views / maxViews * 40;
  if (sd && maxGain) s += sd.gain / maxGain * 30;
  if (bl) s += bl.opp * 0.3;
  const rating = d && d.rating != null ? +d.rating : (sd ? +((sd.sub.match(/好评\s*([\d.]+)%/) || [])[1] || 0) : 0);
  const reviews = d && d.reviews != null ? +d.reviews : 0;
  if (rating >= 85 && reviews >= 100) s *= 1.1;
  if (Object.keys(c.boards).length >= 2) s *= 1.25;
  c.score = Math.round(s * 10) / 10;
  c.rating = rating;
}

list.sort((a, b) => b.score - a.score);
const top5 = list.slice(0, 5);

console.log(`${date} 候选 ${list.length} 款(已剔除成熟名单), Top5:`);
top5.forEach((c, i) => {
  const bs = Object.keys(c.boards).map(k => ({ steamdb: 'SteamDB', twitter: '推特', bilibili: 'B站' })[k]).join('+');
  const sig = [];
  if (c.boards.twitter) sig.push(`浏览${c.boards.twitter.raw}`);
  if (c.boards.steamdb) sig.push(`日增${c.boards.steamdb.raw}`);
  if (c.boards.bilibili) sig.push(`${c.boards.bilibili.raw}·机会分${c.boards.bilibili.opp}`);
  console.log(` ${i + 1}. ${c.name}  ${c.score}分  [${bs}]  ${sig.join(' / ')}${c.rating ? `  好评${c.rating}%` : ''}`);
});

if (DRY) { console.log('--dry, 未写入'); process.exit(0); }

const srcLabel = { steamdb: 'SteamDB趋势', twitter: '推特热游', bilibili: 'B站热门' };
const https = require('https');
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
day.picks = top5.map(c => {
  const d = c.detail || {};
  const sig = [];
  if (c.boards.twitter) sig.push(`推特浏览 ${c.boards.twitter.raw}`);
  if (c.boards.steamdb) sig.push(`SteamDB 关注日增 ${c.boards.steamdb.raw}`);
  if (c.boards.bilibili) sig.push(`B站${c.boards.bilibili.raw}`);
  if (c.rating >= 85) sig.push(`好评率 ${c.rating}%`);
  return {
    name: d.name_cn || d.name || c.name,
    cover: d.cover || c.thumb || '',
    hook: sig.join(' + '),
    source: Object.keys(c.boards).map(k => srcLabel[k]).join(' · '),
    link: (c.appid ? `https://store.steampowered.com/app/${c.appid}/` : '') || c.link || d.link || ''
  };
});
// 大背景用首张实机截图(与卡片 header 图错开)
for (const p of day.picks) {
  const a = (String(p.link).match(/app\/(\d+)/) || [])[1];
  if (!a) continue;
  try {
    const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${a}&filters=screenshots`);
    const ss = j && j[a] && j[a].data && j[a].data.screenshots;
    if (ss && ss[0]) p.bg = ss[0].path_full;
  } catch (e) {}
  await sleep(300);
}
fs.writeFileSync(dayPath, JSON.stringify(day, null, 1), 'utf8');
console.log(`已写入 ${dayPath}`);
})();
