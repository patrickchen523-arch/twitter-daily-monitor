// 推特热游榜: 从日报 data/*.json 逐日回溯,收集已上线游戏(按推文浏览量排序,取前10)
// 用法: node tools/import_twitter_board.js [日期]
const fs = require('fs');
const path = require('path');

const date = process.argv[2] || '2026-08-05';
const root = path.join(__dirname, '..');
const launchedPath = path.join(root, 'data', 'launched', `${date}.json`);
const launched = JSON.parse(fs.readFileSync(launchedPath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data', 'manifest.json'), 'utf8'));

const TODAY = new Date();
function isLaunched(e) {
  const sr = String((e && e.steam_rating) || '');
  if (/无Steam页面/.test(sr)) return false; // 日报口径: 无Steam页面且无发售日 = 未上线
  if (!/未发售|playtest|测试/i.test(sr)) return true; // 有评价/已发售
  const m = String((e && e.release_date) || '').match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]) <= TODAY; // 发售日已到
  return false;
}
const fmtViews = v => v >= 10000 ? (Math.round(v / 1000) / 10) + '万' : String(v || '');

const games = new Map(); // 规范化名 -> item (保留先出现/最新的)
const watchAdds = []; // 未上线(进观测区)
const normKey = s => String(s || '').toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '');
const dates = (manifest.dates || []).filter(d => d <= date).sort().reverse();
for (const d of dates) {
  const fp = path.join(root, 'data', `${d}.json`);
  if (!fs.existsSync(fp)) continue;
  const daily = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const sec = (daily.sections || []).find(s => s.id === 'indie');
  if (!sec) continue;
  (sec.items || []).forEach((it, idx) => {
    const e = it.enrichment || {};
    const name = it.game_ref || e.game_name;
    if (!name) return;
    if (!isLaunched(e)) {
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
    const relM = String(e.release_date || '').match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    games.set(normKey(name), {
      name,
      metric: fmtViews(it.views),
      sub: `${d.slice(5)} · ${it.recommendation || it.title}`,
      thumb: e.header_image || (it.media && it.media.url) || null,
      link: e.steam_url || it.link,
      release: relM ? `${relM[1]}-${String(relM[2]).padStart(2, '0')}-${String(relM[3]).padStart(2, '0')}` : null,
      views: it.views || 0,
      day: d,
      idx
    });
  });
  if (games.size >= 14) break; // 多收集一些候选
}

const items = [...games.values()]
  .sort((a, b) => b.views - a.views)
  .slice(0, 10)
  .map(({ views, ...rest }) => rest);

const board = launched.boards.find(b => b.id === 'twitter');
if (board) {
  board.title = '推特热游';
  board.title_en = 'TWITTER';
  board.demo = false;
  board.items = items;
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
