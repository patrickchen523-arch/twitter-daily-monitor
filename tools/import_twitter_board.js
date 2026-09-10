// 推特热游榜: 从日报 data/*.json 逐日回溯,收集已上线游戏(按推文浏览量排序,取前10)
// 用法: node tools/import_twitter_board.js [日期]
const fs = require('fs');
const path = require('path');

const date = process.argv[2] || '2026-08-05';
const root = path.join(__dirname, '..');
const launchedPath = path.join(root, 'data', 'launched', `${date}.json`);
const launched = JSON.parse(fs.readFileSync(launchedPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data', 'manifest.json'), 'utf8'));

const releaseOf = e => {
  const m = String(e.release_date || '').match(/(\d{4})\s*(?:年|[-/])\s*(\d{1,2})\s*(?:月|[-/])\s*(\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null;
};
function isLaunched(it) {
  const e = it.enrichment || {};
  const sr = String(e.steam_rating || '');
  const rel = String(e.release_date || '');
  const iso = releaseOf(e);
  if (iso && iso > date) return false;
  const appid = (String(e.steam_url || '').match(/app\/(\d+)/) || [])[1];
  const known = launched.boards.filter(b => b.id === 'steamdb' || b.id === 'bilibili')
    .flatMap(b => b.items || []).find(g => appid
      ? String(g.link || g.steam || '').includes(`/app/${appid}/`)
      : normKey(g.name) === normKey(it.game_ref || e.game_name));
  if (known && known.release && known.release <= date) return true;
  if (/未(?:正式)?发售|playtest|demo|体验版|试玩|测试|即将/i.test(sr)) return false;
  if (iso) return true;
  if (/已发售|已上线|已发布|运营中|发售初期|好评|\d.*(?:评价|reviews)/i.test(sr + ' ' + rel)) return true;
  if (/待公布|待定|即将|未发售/.test(rel)) return false;
  return /已发售|正式发售|现已上线|免费(?:公开|开放)|免费游玩|已公开|out now|released|無料公開中|配信開始/i.test(
    [it.title, it.full_text, it.summary].filter(Boolean).join(' '));
}
const fmtViews = v => v >= 10000 ? (Math.round(v / 1000) / 10) + '万' : String(v || '');

const games = new Map(); // 规范化名 -> item (保留先出现/最新的)
const watchAdds = []; // 未上线(进观测区)
const normKey = s => String(s || '').toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '');
const dates = (manifest.dates || []).filter(d => d <= date).sort().reverse();
const sources = dates.map(d => ({ date: d, path: path.join(root, 'data', `${d}.json`) }))
  .filter(s => fs.existsSync(s.path)).map(s => ({
    date: s.date,
    items: (JSON.parse(fs.readFileSync(s.path, 'utf8')).sections || []).find(sec => sec.id === 'indie')?.items || []
  }));
for (const { date: d, items: dailyItems } of sources) {
  dailyItems.forEach((it, idx) => {
    const e = it.enrichment || {};
    const name = it.game_ref || e.game_name;
    if (!name) return;
    if (!isLaunched(it)) {
      if (!watchAdds.some(w => normKey(w.name) === normKey(name)) && (it.views || 0) >= 10000) {
        watchAdds.push({
          name,
          date: e.release_date || '日期待定',
          note: `推特热游在榜：推文浏览 ${fmtViews(it.views)} · ${it.recommendation || ''}`.slice(0, 80),
          cover: e.header_image || (it.media && it.media.url) || null,
          link: e.steam_url || it.link
        });
      }
      return;
    }
    if (games.has(normKey(name))) return;
    games.set(normKey(name), {
      name,
      metric: fmtViews(it.views),
      sub: `${d.slice(5)} · ${it.recommendation || it.title}`,
      thumb: e.header_image || (it.media && it.media.url) || null,
      link: e.steam_url || it.link,
      release: releaseOf(e),
      views: it.views || 0,
      day: d,
      idx
    });
  });
  if (games.size >= 24) break; // 多收集候选, 供14天窗口过滤后仍凑满10款
}

// 半衰期衰减: 推文流量集中在前1-2天, heat=views×0.5^(age/1.5) 作为排序与推荐分值;
// 老爆款自动沉底, 展示仍用原始 metric; 超过14天的条目彻底出榜
const HALF_LIFE_DAYS = 1.5;
const ageDays = it => Math.max(0, Math.floor((new Date(date) - new Date(it.day)) / 86400000));
const items = [...games.values()]
  .map(it => ({ ...it, heat: Math.round(it.views * Math.pow(0.5, ageDays(it) / HALF_LIFE_DAYS)) }))
  .filter(it => ageDays(it) <= 14)
  .sort((a, b) => b.heat - a.heat)
  .slice(0, 10)
  .map(({ views, ...rest }) => rest);

const board = launched.boards.find(b => b.id === 'twitter');
if (board) {
  board.title = '推特热游';
  board.title_en = 'TWITTER';
  board.demo = false;
  board.items = items;
  board.generated_from = require('crypto').createHash('sha256').update(JSON.stringify(sources)).digest('hex');
  board.more = { label: '查看新游推文', tab: 'indie' };
}

// 未上线游戏进观测区 featured(按名称去重)
if (watchAdds.length) {
  launched.watch = launched.watch || { featured: [], calendar: [] };
  launched.watch.featured = launched.watch.featured || [];
  for (const w of watchAdds) {
    if (!launched.watch.featured.some(x => x.name === w.name)) launched.watch.featured.push(w);
  }
  console.log('未上线->观测区:', watchAdds.map(w => w.name).join(', '));
}
fs.writeFileSync(launchedPath, JSON.stringify(launched, null, 1), 'utf8');
console.log('twitter board updated:', items.length, '款');
items.forEach((it, i) => console.log(`${i + 1}. ${it.name} ${it.metric}`));
