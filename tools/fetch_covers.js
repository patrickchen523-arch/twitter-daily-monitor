// 为所有游戏解析 Steam 官方 header_image(哈希直链) -> 写入 games-appid-patch.json 的 cover 字段
const https = require('https');
const fs = require('fs');
const path = require('path');

const libPath = path.join(__dirname, '..', 'data', 'games-library.json');
const patchPath = path.join(__dirname, '..', 'data', 'games-appid-patch.json');
const lib = JSON.parse(fs.readFileSync(libPath, 'utf8'));
const patch = fs.existsSync(patchPath) ? JSON.parse(fs.readFileSync(patchPath, 'utf8')) : {};

const sleep = ms => new Promise(r => setTimeout(r, ms));

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
      res.on('error', reject);
    }).on('error', reject);
  });
}

(async () => {
  const todo = lib.games.filter(g => g.appid && !(patch[g.name] && patch[g.name].cover));
  console.log('to resolve:', todo.length);
  let ok = 0, fail = 0;
  for (const g of todo) {
    try {
      const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${g.appid}`);
      const d = j[g.appid];
      const img = d && d.success && d.data && d.data.header_image;
      if (img) {
        patch[g.name] = Object.assign({}, patch[g.name], { appid: g.appid, cover: img });
        ok++;
      } else {
        fail++;
        console.log('no header_image:', g.name, g.appid);
      }
    } catch (e) {
      fail++;
      console.log('error:', g.name, e.message);
    }
    await sleep(300);
  }
  fs.writeFileSync(patchPath, JSON.stringify(patch, null, 1), 'utf8');
  console.log(`done. ok=${ok} fail=${fail} patch total=${Object.keys(patch).length}`);
})();
