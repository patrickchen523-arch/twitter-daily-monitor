/* 经 Chrome 拉 Steam appdetails header_image, 补 launched 各日期中"有Steam链接但无图"的条目 */
/* 用法: node tools\fill_steam_covers_via_chrome.cjs [日期...] 缺省=manifest全部日期 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('G:/教理问答/教理问答/node_modules/playwright-core');
const root = path.join(__dirname, '..');
const launchedDir = path.join(root, 'data', 'launched');
const man = JSON.parse(fs.readFileSync(path.join(launchedDir, 'manifest.json'), 'utf8'));
const dates = process.argv.slice(2).length ? process.argv.slice(2) : man.dates;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  // 1. 收集缺失 appid
  const missing = new Set();
  const days = {};
  for (const d of dates) {
    const p = path.join(launchedDir, d + '.json');
    if (!fs.existsSync(p)) continue;
    const day = JSON.parse(fs.readFileSync(p, 'utf8'));
    days[d] = day;
    const scan = (arr, k) => {
      for (const it of arr || []) {
        const m = /store\.steampowered\.com\/app\/(\d+)/.exec(it.link || it.steam || '');
        if (m && !it[k]) missing.add(m[1]);
      }
    };
    for (const b of day.boards || []) if (b.id !== 'roblox') scan(b.items, 'thumb');
    scan(day.watch && day.watch.featured, 'cover');
    scan(day.picks, 'cover');
  }
  console.log('missing appids:', missing.size);
  if (!missing.size) process.exit(0);
  // 2. Chrome 拉 header_image
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const ctx = await b.newContext({ userAgent: 'Mozilla/5.0' });
  const page = await ctx.newPage();
  const cover = {};
  for (const appid of missing) {
    try {
      const r = await page.goto(`https://store.steampowered.com/api/appdetails?appids=${appid}&cc=us&l=en`, { timeout: 25000, waitUntil: 'domcontentloaded' });
      const j = r && r.ok() ? JSON.parse(await page.evaluate(() => document.body.innerText)) : null;
      cover[appid] = (j && j[appid] && j[appid].success && j[appid].data && j[appid].data.header_image) || null;
    } catch (e) { cover[appid] = null; }
    if (!cover[appid]) console.log('  无图:', appid);
    await sleep(250);
  }
  await b.close();
  // 3. 回填
  let total = 0;
  for (const d of Object.keys(days)) {
    const day = days[d];
    let n = 0;
    const fill = (arr, k) => {
      for (const it of arr || []) {
        const m = /store\.steampowered\.com\/app\/(\d+)/.exec(it.link || it.steam || '');
        if (m && !it[k] && cover[m[1]]) { it[k] = cover[m[1]]; n++; }
      }
    };
    for (const b of day.boards || []) if (b.id !== 'roblox') fill(b.items, 'thumb');
    fill(day.watch && day.watch.featured, 'cover');
    fill(day.picks, 'cover');
    if (n) { fs.writeFileSync(path.join(launchedDir, d + '.json'), JSON.stringify(day, null, 1), 'utf8'); total += n; }
    console.log(d, 'filled', n);
  }
  console.log('total filled:', total);
})();
