// 为缺 appid 的游戏搜索 Steam appid,并解析封面 URL -> data/games-appid-patch.json
const https = require('https');
const fs = require('fs');
const path = require('path');

const libPath = path.join(__dirname, '..', 'data', 'games-library.json');
const outPath = path.join(__dirname, '..', 'data', 'games-appid-patch.json');
const lib = JSON.parse(fs.readFileSync(libPath, 'utf8'));

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

function head(url) {
  return new Promise(resolve => {
    https.get(url, res => { res.resume(); resolve(res.statusCode); }).on('error', () => resolve(0));
  });
}

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

(async () => {
  const patch = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {};
  const missing = lib.games.filter(g => !g.appid && !patch[g.name]);
  console.log('missing:', missing.length);
  for (const g of missing) {
    try {
      const res = await getJson(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(g.name)}&cc=us&l=en`);
      const items = res.items || [];
      const target = norm(g.name);
      const hit = items.find(it => norm(it.name) === target) || items[0];
      if (!hit) {
        console.log(`NOT FOUND: ${g.name}`);
        continue;
      }
      const appid = String(hit.id);
      let cover = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appid}/header.jpg`;
      const code = await head(cover);
      if (code !== 200) {
        const detail = await getJson(`https://store.steampowered.com/api/appdetails?appids=${appid}`);
        const d = detail[appid];
        cover = (d && d.success && d.data && d.data.header_image) || null;
      }
      patch[g.name] = { appid, cover, matched: hit.name };
      console.log(`${norm(hit.name) === target ? 'OK ' : 'FUZZY'} ${g.name} -> ${appid} (${hit.name}) cover=${cover ? 'y' : 'n'}`);
    } catch (e) {
      console.log(`ERROR: ${g.name} ${e.message}`);
    }
    await sleep(250);
  }
  fs.writeFileSync(outPath, JSON.stringify(patch, null, 1), 'utf8');
  console.log('patched:', Object.keys(patch).length);
})();
