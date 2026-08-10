// 用 Steam appdetails 核对全部游戏正式发售日期 -> 写入 games-appid-patch.json 的 release_date
const https = require('https');
const fs = require('fs');
const path = require('path');

const libPath = path.join(__dirname, '..', 'data', 'games-library.json');
const patchPath = path.join(__dirname, '..', 'data', 'games-appid-patch.json');
const lib = JSON.parse(fs.readFileSync(libPath, 'utf8'));
const patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = url => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    res.on('error', reject);
  }).on('error', reject);
});

function parseDate(s) {
  if (!s) return null;
  let m = String(s).match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})/);
  if (m) return `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}`;
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

(async () => {
  let changed = 0, same = 0, fail = 0;
  for (const g of lib.games) {
    if (!g.appid) { fail++; console.log('无appid:', g.name); continue; }
    try {
      const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${g.appid}&l=schinese`);
      const d = j[g.appid];
      const rd = d && d.success && d.data && d.data.release_date;
      const iso = rd && !rd.coming_soon ? parseDate(rd.date) : null;
      if (!iso) { fail++; console.log('无日期:', g.name, JSON.stringify(rd)); continue; }
      if (iso !== g.release_date) {
        changed++;
        console.log(`修正: ${g.name}  ${g.release_date} -> ${iso}`);
        patch[g.name] = Object.assign({}, patch[g.name], { appid: g.appid, release_date: iso });
      } else {
        same++;
      }
    } catch (e) {
      fail++;
      console.log('error:', g.name, e.message);
    }
    await sleep(250);
  }
  fs.writeFileSync(patchPath, JSON.stringify(patch, null, 1), 'utf8');
  console.log(`done. 修正${changed} 一致${same} 失败${fail}`);
})();
