// Steam 全球热销榜(top sellers) -> data/steam-topsellers.json {appid: 名次}
const https = require('https');
const fs = require('fs');
const path = require('path');

const outPath = path.join(__dirname, '..', 'data', 'steam-topsellers.json');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const zlib = require('zlib');
const getJson = url => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': 'gzip, deflate' } }, res => {
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => {
      try {
        let buf = Buffer.concat(chunks);
        const enc = res.headers['content-encoding'];
        if (enc === 'gzip') buf = zlib.gunzipSync(buf);
        else if (enc === 'deflate') buf = zlib.inflateSync(buf);
        resolve(JSON.parse(buf.toString('utf8')));
      } catch (e) { reject(e); }
    });
    res.on('error', reject);
  }).on('error', reject);
});

(async () => {
  const ranks = {};
  let start = 0, total = Infinity;
  while (start < total) {
    let j = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        j = await getJson(`https://store.steampowered.com/search/results/?query&start=${start}&count=100&filter=topsellers&infinite=1&json=1`);
        if (j && j.results_html) break;
      } catch (e) {}
      j = null;
      await sleep(2500 * (attempt + 1));
    }
    if (!j) { console.log('rate limited at', start, '- saving partial'); break; }
    total = j.total_count || 0;
    const ids = [...j.results_html.matchAll(/data-ds-appid="(\d+)"/g)].map(m => m[1]);
    if (!ids.length) break;
    ids.forEach((id, i) => { ranks[id] = start + i + 1; });
    start += ids.length;
    console.log(`fetched ${start}/${total}`);
    await sleep(400);
  }
  fs.writeFileSync(outPath, JSON.stringify({ updated: new Date().toISOString().slice(0, 10), ranks }, null, 1), 'utf8');
  console.log('done. total ranks:', Object.keys(ranks).length);
})();
