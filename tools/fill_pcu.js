// 从 steamcharts 补全历史峰值 PCU -> patch pcu_peak
const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const libPath = path.join(root, 'data', 'games-library.json');
const patchPath = path.join(root, 'data', 'games-appid-patch.json');
const lib = JSON.parse(fs.readFileSync(libPath, 'utf8'));
const patch = fs.existsSync(patchPath) ? JSON.parse(fs.readFileSync(patchPath, 'utf8')) : {};

const sleep = ms => new Promise(r => setTimeout(r, ms));
const get = url => new Promise(resolve => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': 'gzip' } }, res => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
      try {
        let buf = Buffer.concat(chunks);
        if (res.headers['content-encoding'] === 'gzip') buf = zlib.gunzipSync(buf);
        resolve({ status: res.statusCode, body: buf.toString('utf8') });
      } catch (e) { resolve({ status: 0, body: '' }); }
    });
    res.on('error', () => resolve({ status: 0, body: '' }));
  }).on('error', () => resolve({ status: 0, body: '' }));
});

function parsePeak(html) {
  const i = html.indexOf('all-time peak');
  if (i < 0) return null;
  const before = html.slice(Math.max(0, i - 400), i);
  const nums = [...before.matchAll(/>(\d[\d,]*)</g)].map(x => x[1].replace(/,/g, ''));
  return nums.length ? Number(nums[nums.length - 1]) : null;
}

(async () => {
  const todo = lib.games.filter(g => !g.pcu_peak && g.appid);
  console.log('缺PCU待补:', todo.length);
  let ok = 0, notrack = 0;
  for (const g of todo) {
    const r = await get(`https://steamcharts.com/app/${g.appid}`);
    if (r.status === 200) {
      const peak = parsePeak(r.body);
      if (peak) {
        patch[g.name] = Object.assign({}, patch[g.name], { appid: g.appid, pcu_peak: peak });
        ok++;
      } else notrack++;
    } else notrack++;
    await sleep(200);
  }
  fs.writeFileSync(patchPath, JSON.stringify(patch, null, 1), 'utf8');
  console.log(`done. 补全${ok} 无收录${notrack}`);
})();
