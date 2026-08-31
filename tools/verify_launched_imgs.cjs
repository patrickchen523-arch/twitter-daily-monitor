/* 游戏关注页全图渲染校验(只读): node tools\verify_launched_imgs.cjs [日期] */
const { chromium } = require('G:/教理问答/教理问答/node_modules/playwright-core');
const date = process.argv[2];
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await b.newPage();
  const badResp = [];
  p.on('response', r => { if (/\.(jpg|jpeg|png|webp|gif)|hdslb|rbxcdn|steamstatic/i.test(r.url()) && r.status() >= 400) badResp.push(r.status() + ' ' + r.url()); });
  await p.goto('http://localhost:8899/', { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => switchView('launched'));
  await p.waitForTimeout(400);
  if (date) { await p.evaluate(d => loadLaunchedDate(d), date); await p.waitForTimeout(400); }
  await p.evaluate(() => new Promise(res => { let y = 0; const t = setInterval(() => { y += 1200; window.scrollTo(0, y); if (y >= document.body.scrollHeight) { clearInterval(t); res(); } }, 120); }));
  await p.waitForTimeout(2500);
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
  await b.close();
})();
