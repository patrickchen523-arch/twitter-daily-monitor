const { chromium } = require('G:/教理问答/教理问答/node_modules/playwright-core');
(async () => {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.on('pageerror', e => errors.push(e.message));
  await p.goto('http://localhost:8899/', { waitUntil: 'networkidle' });
  await p.evaluate(() => switchView('launched'));
  await p.waitForTimeout(600);
  await p.evaluate(() => loadLaunchedDate('2026-10-14'));
  await p.waitForTimeout(1200);
  const info = await p.evaluate(() => {
    const el = document.querySelector('.ld-watch-wrap');
    if (!el) return null;
    el.scrollIntoView();
    return {
      cards: document.querySelectorAll('.ld-watch-card').length,
      head: (document.querySelector('.ld-watch-wrap .ld-cal-month') || {}).textContent
    };
  });
  await p.waitForTimeout(500);
  await p.screenshot({ path: __dirname + '/shot_watch_filter.png' });
  console.log('info:', JSON.stringify(info));
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await b.close();
})();
