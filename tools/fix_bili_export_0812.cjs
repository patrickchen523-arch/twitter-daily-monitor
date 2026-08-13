/* 修 bili-rank (4).json：正榜=空title的100条（封面锚点），服务端 view API 补 title/播放量 */
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
  const src = JSON.parse(fs.readFileSync('C:/Users/wangtingting17/Downloads/bili-rank (4).json', 'utf8'));
  const all = src.items || src;
  const rankRows = all.filter(x => !x.title); // 正榜条目：封面锚点无 title
  console.log('正榜条数:', rankRows.length);
  const items = [];
  for (let i = 0; i < rankRows.length; i++) {
    const r = rankRows[i];
    const j = await getJson('https://api.bilibili.com/x/web-interface/view?bvid=' + r.bvid);
    const title = j && j.code === 0 ? j.data.title : '';
    const view = j && j.code === 0 ? j.data.stat.view : 0;
    items.push({ rank: i + 1, title, bvid: r.bvid, cover: r.cover || '', state: view >= 10000 ? (view / 10000).toFixed(1) + '万' : String(view), tags: r.tags || [] });
    if (!title) console.log('warn: title 拉取失败', r.bvid);
    if ((i + 1) % 20 === 0) console.log('进度', i + 1, '/', rankRows.length);
    await sleep(300);
  }
  fs.writeFileSync('G:/创意部/推送看板＆游戏库/twitter-daily-monitor/data/tmp-bili-rank-0812.json', JSON.stringify({ items }, null, 1));
  console.log('done. sample:', JSON.stringify(items.slice(0, 3).map(x => x.rank + '.' + x.title + ' ' + x.state)));
})();
