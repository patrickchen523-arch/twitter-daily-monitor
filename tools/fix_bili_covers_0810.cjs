/* 补 tmp-bili-rank-0810.json 的坏封面（view API 的 pic 字段） */
const fs = require('fs');
const https = require('https');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = url => new Promise(resolve => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.bilibili.com' } }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(null); } });
  }).on('error', () => resolve(null));
});
(async () => {
  const P = 'G:/创意部/推送看板＆游戏库/twitter-daily-monitor/data/tmp-bili-rank-0810.json';
  const data = JSON.parse(fs.readFileSync(P, 'utf8'));
  let fixed = 0;
  for (const it of data.items) {
    if (it.cover && !/data:|^https:data/.test(it.cover)) continue;
    const j = await getJson('https://api.bilibili.com/x/web-interface/view?bvid=' + it.bvid);
    if (j && j.code === 0 && j.data.pic) { it.cover = j.data.pic.replace(/^https?:/, ''); fixed++; }
    await sleep(250);
  }
  fs.writeFileSync(P, JSON.stringify(data, null, 1));
  console.log('fixed covers:', fixed);
})();
