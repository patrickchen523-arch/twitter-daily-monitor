// 为缺中文名的游戏取 Steam 官方简中名 -> 写入 patch
const https = require('https');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const lib = JSON.parse(fs.readFileSync(path.join(root, 'data', 'games-library.json'), 'utf8'));
const patchPath = path.join(root, 'data', 'games-appid-patch.json');
const patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'));

const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = url => new Promise(resolve => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { resolve(null); } });
    res.on('error', () => resolve(null));
  }).on('error', () => resolve(null));
});

(async () => {
  const todo = lib.games.filter(g => !g.name_cn && g.appid);
  console.log('缺中文名:', todo.length);
  let ok = 0;
  for (const g of todo) {
    const j = await getJson(`https://store.steampowered.com/api/appdetails?appids=${g.appid}&l=schinese`);
    const v = j && j[g.appid] && j[g.appid].success ? j[g.appid].data : null;
    if (v && v.name && /[\u4e00-\u9fa5]/.test(v.name) && v.name !== g.name) {
      patch[g.name] = Object.assign({}, patch[g.name], { appid: g.appid, name_cn: v.name });
      ok++;
    }
    await sleep(250);
  }
  fs.writeFileSync(patchPath, JSON.stringify(patch, null, 1), 'utf8');
  console.log(`done. 官方中文名补齐 ${ok}/${todo.length}(其余无官方简中名,保留英文)`);
})();
