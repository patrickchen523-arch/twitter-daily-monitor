const { chromium } = require('G:/教理问答/教理问答/node_modules/playwright-core');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto('http://localhost:8899/', { waitUntil: 'networkidle' });
  await p.evaluate(() => switchView('launched'));
  await p.waitForTimeout(600);
  for (const d of ['2026-09-07', '2026-09-11']) {
    await p.evaluate(dt => loadLaunchedDate(dt), d);
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${__dirname}/shot_${d}_top.png` });
    await p.evaluate(() => window.scrollTo(0, 1500));
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${__dirname}/shot_${d}_boards.png` });
    await p.evaluate(() => window.scrollTo(0, 0));
  }
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await b.close();
})();
