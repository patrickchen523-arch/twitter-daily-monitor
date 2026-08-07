// 补齐榜单 Steam 游戏: 好评率/评价数(商店页) + PCU峰值(steamcharts) + 销量(评价数x45估算)
const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const detPath = path.join(__dirname, '..', 'data', 'game-details.json');
const det = JSON.parse(fs.readFileSync(detPath, 'utf8'));

const sleep = ms => new Promise(r => setTimeout(r, ms));
function get(url) {
  return new Promise(resolve => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36',
        'Accept-Encoding': 'gzip',
        'Cookie': 'birthtime=568022401; mature_content=1'
      }
    }, res => {
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
}

function parseStore(html) {
  // 页面有"近30天"和"全部"两行,取评价数最大者(=总好评率)
  const all = [...html.matchAll(/(\d+)% of the ([\d,]+) user reviews/g)];
  if (!all.length) return null;
  const best = all.sort((a, b) => Number(b[2].replace(/,/g, '')) - Number(a[2].replace(/,/g, '')))[0];
  return { rating: Number(best[1]), reviews: Number(best[2].replace(/,/g, '')) };
}
function parsePeak(html) {
  const i = html.indexOf('all-time peak');
  if (i < 0) return null;
  const before = html.slice(Math.max(0, i - 400), i);
  const nums = [...before.matchAll(/>(\d[\d,]*)</g)].map(x => x[1].replace(/,/g, ''));
  return nums.length ? Number(nums[nums.length - 1]) : null;
}

(async () => {
  const targets = Object.values(det.byAppid).filter(d => d.appid && d.rating == null);
  console.log('待补全:', targets.length);
  for (const d of targets) {
    const store = await get(`https://store.steampowered.com/app/${d.appid}/?l=en`);
    const st = store.status === 200 ? parseStore(store.body) : null;
    if (st) {
      d.rating = st.rating;
      d.reviews = st.reviews;
      d.sales = Math.round(st.reviews * 45 / 1000) * 1000; // 经验估算
    }
    await sleep(300);
    const sc = await get(`https://steamcharts.com/app/${d.appid}`);
    if (sc.status === 200) {
      const peak = parsePeak(sc.body);
      if (peak) d.pcu = peak;
    }
    await sleep(300);
    console.log(`${d.name}: rating=${d.rating ?? '-'} reviews=${d.reviews ?? '-'} pcu=${d.pcu ?? '-'} sales=${d.sales ?? '-'}`);
  }
  fs.writeFileSync(detPath, JSON.stringify(det, null, 1), 'utf8');
  console.log('written:', detPath);
})();
