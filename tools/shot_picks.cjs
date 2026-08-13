const { chromium } = require('G:/教理问答/教理问答/node_modules/playwright-core');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto('http://localhost:8899/', { waitUntil: 'networkidle' });
  await p.evaluate(() => switchView('launched'));
  for (const d of ['2026-08-07', '2026-08-11']) {
    await p.evaluate(dd => loadLaunchedDate(dd), d);
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${__dirname}/shot_picks_${d}.png` });
  }
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await b.close();
})();
