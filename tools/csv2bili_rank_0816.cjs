/* 0816期：B站游戏榜 CSV(标题/描述/播放/时间/av链接/缩略图) → 标准 bili-rank JSON */
/* CSV 无 tags/bvid → 每视频 view API(取bvid/标题/播放量/pic) + tag API(取标签)，300ms 间隔 */
/* 用法: node tools\csv2bili_rank_0816.cjs "<csv路径>" → 生成同目录 bili-rank-0816.json */
const fs = require('fs');
const src = process.argv[2];
if (!src) { console.error('usage: node tools\\csv2bili_rank_0816.cjs <csv>'); process.exit(1); }

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
  'Referer': 'https://www.bilibili.com/',
};
const getJson = async url => {
  const r = await fetch(url, { headers: HEADERS });
  return r.json();
};

(async () => {
  const text = fs.readFileSync(src, 'utf8').replace(/^﻿/, '');
  const rows = parseCsv(text);
  const data = rows[0][0] === '标题' ? rows.slice(1) : rows;
  console.log('CSV 行数:', data.length);
  const items = [];
  let fail = 0;
  for (let i = 0; i < data.length; i++) {
    const [title, , , , link, cover] = data[i];
    const aid = (String(link || '').match(/av(\d+)/i) || [])[1];
    if (!aid) { console.log(`#${i + 1} 无av号: ${String(title).slice(0, 30)}`); fail++; continue; }
    let bvid = '', apiTitle = '', view = '', pic = '';
    try {
      const j = await getJson('https://api.bilibili.com/x/web-interface/view?aid=' + aid);
      if (j.code === 0 && j.data) {
        bvid = j.data.bvid || '';
        apiTitle = j.data.title || '';
        view = String(j.data.stat && j.data.stat.view || '');
        pic = j.data.pic || '';
      } else console.log(`#${i + 1} view code=${j.code} ${j.message}`);
    } catch (e) { console.log(`#${i + 1} view ERR ${e.message}`); }
    await sleep(300);
    let tags = [];
    if (bvid) {
      try {
        const t = await getJson('https://api.bilibili.com/x/tag/archive/tags?bvid=' + bvid);
        if (t.code === 0 && Array.isArray(t.data)) tags = t.data.map(x => x.tag_name).filter(Boolean);
        else console.log(`#${i + 1} tags code=${t.code}`);
      } catch (e) { console.log(`#${i + 1} tags ERR ${e.message}`); }
      await sleep(300);
    }
    const cov = (cover || pic || '').replace(/^https?:/, '');
    items.push({ rank: i + 1, title: apiTitle || title || '', bvid, cover: cov, state: view, tags });
  }
  const out = src.replace(/\.csv$/i, '') + '-bili-rank.json';
  fs.writeFileSync(out, JSON.stringify({ items }, null, 1), 'utf8');
  console.log('转换完成:', items.length, '条, 失败', fail, '→', out);
})();
