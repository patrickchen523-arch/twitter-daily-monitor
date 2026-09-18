/* 游戏关注页全图渲染校验(只读): node tools\verify_launched_imgs.cjs [日期] */
const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');
const root = path.join(__dirname, '..');
const dataDir = path.join(root, 'data');
const launchedDir = path.join(dataDir, 'launched');
const manifest = JSON.parse(fs.readFileSync(path.join(launchedDir, 'manifest.json'), 'utf8'));
const date = process.argv.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a)) || manifest.dates.at(-1);
const day = JSON.parse(fs.readFileSync(path.join(launchedDir, `${date}.json`), 'utf8'));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const assert = (ok, message) => { if (!ok) throw new Error(`${date}: ${message}`); };
assert(day.date === date, '数据日期不一致');
assert(JSON.stringify(manifest.dates) === JSON.stringify([...new Set(manifest.dates)].sort()), '日期索引未按升序去重');
for (const id of ['steamdb', 'bilibili', 'twitter', 'roblox']) {
  const board = day.boards.find(b => b.id === id);
  assert(board && board.items && board.items.length, `${id} 榜单为空`);
  if (id === 'twitter') assert(board.items.length >= 10, '推特热游不足10款');
  if (id === 'steamdb') assert(board.items.length === 50, `steamdb 榜单应满50款，当前 ${board.items.length}`);
  if (id === 'bilibili') assert(board.items.length >= 20, `bilibili 榜单不足20款，当前 ${board.items.length}`);
  if (id === 'roblox') assert(board.items.length === 10, `roblox 榜单应满10款，当前 ${board.items.length}`);
  // 推特榜支持数据截止日刷新（分支C）：已发售校验以 board.data_through 为准（缺省=档期日期）
  const releaseLimit = id === 'twitter' ? (board.data_through || date) : date;
  assert(board.items.every(it => !it.release || it.release <= releaseLimit), `${id} 混入未来发售游戏`);
  assert(board.items.every(it => /^https?:\/\//.test(it.thumb || '')), `${id} 存在无效封面`);
}
// 档期连续性：历史断档仅告警，最新一期必须与上一期相邻（缺档=漏跑游戏关注页更新）
{
  const ds = manifest.dates;
  const gaps = [];
  for (let i = 1; i < ds.length; i++) {
    const diffDays = (new Date(ds[i]) - new Date(ds[i - 1])) / 86400000;
    if (diffDays !== 1) gaps.push(`${ds[i - 1]}→${ds[i]}(${diffDays}天)`);
  }
  if (gaps.length) console.log('warn: 历史日期断档:', gaps.join(', '));
  const tailGap = (new Date(ds.at(-1)) - new Date(ds.at(-2))) / 86400000;
  assert(tailGap === 1, `最新一期 ${ds.at(-1)} 与上一期 ${ds.at(-2)} 存在断档，请补建缺失日期`);
}
// roblox 榜档期必须与 roblox/ 目录最新周报一致（周报上传后必须跑 update_roblox_board 链）
{
  const rbxFiles = fs.readdirSync(path.join(root, 'roblox')).filter(f => /^roblox-\d{4}-\d{2}-\d{2}-to-\d{2}-\d{2}\.html$/.test(f)).sort();
  if (rbxFiles.length) {
    const dm = rbxFiles.at(-1).match(/^roblox-(\d{4})-(\d{2})-(\d{2})-to-(\d{2})-(\d{2})\.html$/);
    const expectWeek = `${+dm[2]}.${+dm[3]} - ${+dm[4]}.${+dm[5]}`;
    const robloxBoard = day.boards.find(b => b.id === 'roblox');
    assert(robloxBoard.week === expectWeek, `roblox 榜档期(${robloxBoard.week})与最新周报(${expectWeek})不一致，请运行 node tools/update_roblox_board.cjs 及配套链`);
  }
}
// 推特热游榜必须新鲜：榜内最新条目距数据截止日 ≤3 天，防止榜单陈旧
// （数据截止日=board.data_through，缺省=档期日期。检查"最新条目"而非"榜首"：
//   半衰期热度排序可能让几天前的超爆款推文稳居榜首，此时榜单并非陈旧）
const twitterBoard = day.boards.find(b => b.id === 'twitter');
const through = twitterBoard.data_through || date;
{
  const newestDay = twitterBoard.items.map(it => it.day).filter(Boolean).sort().at(-1);
  assert(newestDay && (new Date(through) - new Date(newestDay)) / 86400000 <= 3, `推特热游最新条目 ${newestDay} 距数据截止 ${through} 超3天，请重跑 node tools/import_twitter_board.js ${date} <当日>`);
}
assert(day.picks.length === 5, '今日推荐未生成5款');
assert(new Set(day.picks.map(p => p.link)).size === 5, '今日推荐重复');
assert(day.picks.every(p => /^https?:\/\//.test(p.cover || '')), '推荐存在无效封面');
assert(day.picks_generated_from === hash(day.boards), '榜单已变更，必须重新生成今日推荐');
const dailyManifest = JSON.parse(fs.readFileSync(path.join(dataDir, 'manifest.json'), 'utf8'));
const sources = dailyManifest.dates.filter(d => d <= through).sort().reverse()
  .map(d => ({ date: d, path: path.join(dataDir, `${d}.json`) })).filter(s => fs.existsSync(s.path))
  .map(s => ({
    date: s.date,
    items: (JSON.parse(fs.readFileSync(s.path, 'utf8')).sections || []).find(sec => sec.id === 'indie')?.items || []
  }));
assert(twitterBoard.generated_from === hash(sources), '日报源已变更，必须重新生成推特热游');
console.log('data verified:', date, day.boards.map(b => `${b.id}:${b.items.length}`).join(' '));
if (process.argv.includes('--data-only')) process.exit(0);
const { chromium } = require('G:/教理问答/教理问答/node_modules/playwright-core');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  p.on('pageerror', e => pageErrors.push(e.message));
  const badResp = [];
  p.on('response', r => { if (/\.(jpg|jpeg|png|webp|gif)|hdslb|rbxcdn|steamstatic/i.test(r.url()) && r.status() >= 400) badResp.push(r.status() + ' ' + r.url()); });
  await p.goto('http://localhost:8899/', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => switchView('launched'));
  await p.waitForFunction(() => document.querySelector('.ld-mosaic'));
  await p.evaluate(d => loadLaunchedDate(d), date);
  await p.waitForFunction(d => document.querySelector(".ld-date-strip .ed-date-btn.on")?.getAttribute('data-ld-date') === d, date);
  await p.evaluate(async () => {
    await Promise.all([...document.querySelectorAll('.ld-mosaic img')].map(i => i.decode().catch(() => {})));
  });
  if (process.argv.includes('--screenshots')) {
    await p.screenshot({ path: path.join(__dirname, `shot_${date}_top.png`) });
    await p.locator('.ld-boards').scrollIntoViewIfNeeded();
    await p.screenshot({ path: path.join(__dirname, `shot_${date}_boards.png`) });
  }
  await p.evaluate(() => {
    document.querySelectorAll('#launchedContent img').forEach(img => { img.loading = 'eager'; });
  });
  await p.waitForFunction(() => [...document.querySelectorAll('#launchedContent img')].every(img => img.complete), null, { timeout: 45000 });
  const info = await p.evaluate(() => {
    const host = document.getElementById('launchedContent');
    const imgs = [...host.querySelectorAll('img')];
    return {
      total: imgs.length,
      broken: imgs.filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.src.slice(0, 110))
    };
  });
  console.log('date:', date || 'latest', '| imgs:', info.total, '| broken:', info.broken.length);
  info.broken.slice(0, 30).forEach(u => console.log('  BROKEN', u));
  console.log('bad http responses:', badResp.length);
  badResp.slice(0, 15).forEach(u => console.log('  HTTP', u));
  const rendered = await p.locator('#launchedContent .ld-mos-name').allTextContents();
  assert(JSON.stringify(rendered) === JSON.stringify(day.picks.map(p => p.name)), '页面推荐与日期数据不一致');
  assert(await p.locator('#ld-list-2 .ld-col-rank-item').count() === 10, '页面推特热游未渲染10款');
  assert(!pageErrors.length, `页面脚本错误: ${pageErrors.join('; ')}`);
  await b.close();
  assert(!info.broken.length, '页面存在未加载图片');
})().catch(e => { console.error(e); process.exitCode = 1; });
