/* 自动抓取 SteamDB Trending Games(trendingfollowers) → 保存为浏览器导出同款 JSON */
/* Cloudflare 挑战需有头 Chrome 自动过(约25s)；headless 必拦。需在已登录会话的桌面环境运行 */
/* 用法: node tools\fetch_steamdb_trending.cjs [日期YYYY-MM-DD] → 存 data/launched/raw/steamdb-trending-<日期>.json */
const fs = require('fs');
const path = require('path');
const { chromium } = require('G:/教理问答/教理问答/node_modules/playwright-core');

const pad = n => String(n).padStart(2, '0');
const now = new Date();
const date = process.argv[2] || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const outDir = path.join(__dirname, '..', 'data', 'launched', 'raw');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `steamdb-trending-${date}.json`);

(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--disable-blink-features=AutomationControlled'] });
  try {
    const p = await b.newPage();
    const r = await p.goto('https://steamdb.info/stats/trendingfollowers/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    console.log('status:', r.status());
    // 轮询等 Cloudflare 挑战自动过 + 表格渲染, 最多 90s, 中途卡死则刷新重试
    let items = [];
    for (let waited = 0; waited <= 90000; waited += 5000) {
      await p.waitForTimeout(5000);
      items = await p.evaluate(() => {
        const rows = document.querySelectorAll('table tbody tr');
        return Array.from(rows).map(tr => {
          const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
          const a = tr.querySelector('a[href*="/app/"]');
          const appid = a ? Number((a.href.match(/app\/(\d+)/) || [])[1]) : null;
          return { appid, name: cells[2] || '', cells };
        }).filter(it => it.appid && it.cells.length);
      });
      if (items.length) break;
      if (waited === 40000) { console.log('40s 无表格, 刷新重试'); await p.reload({ waitUntil: 'domcontentloaded' }); }
    }
    if (!items.length) {
      console.error('未抓到表格行, 标题:', await p.title());
      process.exitCode = 1;
      return;
    }
    fs.writeFileSync(outPath, JSON.stringify({ items }, null, 1), 'utf8');
    console.log('抓取', items.length, '行 →', outPath);
    console.log('榜首:', items[0].name, items[0].cells[items[0].cells.length - 1]);
  } finally {
    await b.close();
  }
})();
