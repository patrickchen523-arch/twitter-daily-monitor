/* 0813期：B站导出缺标题/播放量 → view API 服务端批量补全（坑9：带UA+Referer直连，300ms间隔） */
/* 用法: node tools\fix_bili_export_0813.cjs "<b站导出json路径>" → 生成同目录 bili-rank-fixed.json */
const fs = require('fs');
const src = process.argv[2];
if (!src) { console.error('usage: node tools\\fix_bili_export_0813.cjs <bili-rank.json>'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(src, 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  let filled = 0;
  for (const it of data.items) {
    if (it.title && it.state) continue;
    try {
      const r = await fetch('https://api.bilibili.com/x/web-interface/view?bvid=' + it.bvid, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
          'Referer': 'https://www.bilibili.com/',
        },
      });
      const j = await r.json();
      if (j.code === 0 && j.data) {
        if (!it.title) it.title = j.data.title || '';
        if (!it.state) it.state = String(j.data.stat && j.data.stat.view || '');
        if (j.data.pic && /^\/\//.test(it.cover) === false && !it.cover) it.cover = j.data.pic.replace(/^https?:/, '');
        filled++;
      } else {
        console.log(it.bvid, 'code=' + j.code, j.message);
      }
    } catch (e) { console.log(it.bvid, 'ERR', e.message); }
    await sleep(300);
  }
  const out = src.replace(/\.json$/i, '') + '-fixed.json';
  fs.writeFileSync(out, JSON.stringify(data, null, 1), 'utf8');
  console.log('补全', filled, '条 →', out);
})();
