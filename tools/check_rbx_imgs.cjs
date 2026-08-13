const { chromium } = require('G:/教理问答/教理问答/node_modules/playwright-core');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await b.newPage();
  const bad = [];
  p.on('response', r => { if (/rbxcdn/.test(r.url()) && r.status() !== 200) bad.push(r.status() + ' ' + r.url()); });
  await p.goto('http://localhost:8899/', { waitUntil: 'networkidle' });
  await p.evaluate(() => switchView('launched'));
  await p.waitForTimeout(500);
  await p.evaluate(() => loadLaunchedDate('2026-08-10'));
  await p.waitForTimeout(1200);
  const info = await p.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter(i => /rbxcdn/.test(i.src));
    return imgs.map(i => ({ src: i.src.slice(0, 80), ok: i.complete && i.naturalWidth > 0 }));
  });
  console.log(JSON.stringify(info, null, 1));
  console.log('bad responses:', bad.join('\n') || 'none');
  await b.close();
})();
