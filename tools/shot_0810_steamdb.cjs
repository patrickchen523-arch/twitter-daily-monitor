const { chromium } = require('G:/教理问答/教理问答/node_modules/playwright-core');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.goto('http://localhost:8899/', { waitUntil: 'networkidle' });
  await p.evaluate(() => switchView('launched'));
  await p.waitForTimeout(600);
  await p.evaluate(() => loadLaunchedDate('2026-08-10'));
  await p.waitForTimeout(2500);
  await p.evaluate(() => window.scrollTo(0, 900));
  await p.waitForTimeout(1500);
  await p.screenshot({ path: __dirname + '/shot_0810_steamdb.png' });
  const ok = await p.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter(i => /rbxcdn/.test(i.src));
    return imgs.map(i => (i.complete && i.naturalWidth > 0) ? 1 : 0).join('');
  });
  console.log('rbx imgs ok flags:', ok);
  await b.close();
})();
