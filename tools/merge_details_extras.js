// 合并: 手游/网游补充信息 + Steam 热销榜名次 -> game-details.json
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');

const detPath = path.join(root, 'data', 'game-details.json');
const det = JSON.parse(fs.readFileSync(detPath, 'utf8'));
const extra = JSON.parse(fs.readFileSync(path.join(root, 'data', 'game-details-extra.json'), 'utf8'));
const tsPath = path.join(root, 'data', 'steam-topsellers.json');
const ts = fs.existsSync(tsPath) ? JSON.parse(fs.readFileSync(tsPath, 'utf8')).ranks : {};

const norm = s => String(s || '').toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '');

// 1. 补充信息(按中文名归一,补全缺失字段,不覆盖已有 Steam 数据)
let added = 0;
for (const [key, e] of Object.entries(extra)) {
  const k = norm(key);
  const base = det.byName[k] || null;
  if (base) {
    if (!base.name_cn && e.name) base.name_cn = e.name;
    if (!base.release && e.release) base.release = e.release;
    if (!base.dev || !base.dev.length) base.dev = e.dev || [];
    if (!base.pub || !base.pub.length) base.pub = e.pub || [];
    if (!base.desc && e.desc) base.desc = e.desc;
    if (!base.tags || !base.tags.length) base.tags = e.tags || [];
    if (e.mobile_rank) base.mobile_rank = e.mobile_rank;
    if (e.platform) base.platform = e.platform;
  } else {
    det.byName[k] = {
      name: e.name_en || e.name,
      name_cn: e.name,
      release: e.release || null,
      dev: e.dev || [],
      pub: e.pub || [],
      tags: e.tags || [],
      desc: e.desc || null,
      pcu: null, sales: null, revenue: null, reviews: null, rating: null,
      cover: null, steam: null, appid: null,
      mobile_rank: e.mobile_rank || null,
      platform: e.platform || null
    };
    added++;
  }
}

// 2. 热销榜名次(按 appid 落到条目, 同时挂到 byName 引用)
let ranked = 0;
for (const [appid, rank] of Object.entries(ts)) {
  const d = det.byAppid[appid];
  if (d) { d.topsellers = rank; ranked++; }
}
for (const d of Object.values(det.byName)) {
  if (d.topsellers == null && d.appid && ts[d.appid]) d.topsellers = ts[d.appid];
}

// 3. 去重: byName 与 byAppid 指向同一 appid 时统一引用 byAppid 版本(防脏副本)
let deduped = 0;
for (const [k, v] of Object.entries(det.byName)) {
  if (v.appid && det.byAppid[v.appid] && det.byAppid[v.appid] !== v) {
    det.byName[k] = det.byAppid[v.appid];
    deduped++;
  }
}
console.log('deduped:', deduped);

fs.writeFileSync(detPath, JSON.stringify(det, null, 1), 'utf8');
console.log(`merged. extra added=${added}, topsellers ranked=${ranked}, byName=${Object.keys(det.byName).length}`);
