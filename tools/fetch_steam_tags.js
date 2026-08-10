// 抓取每款游戏 Steam 商店页的热门标签(中文,前3个) -> data/games-tags.json
const https = require('https');
const fs = require('fs');
const path = require('path');

const libPath = path.join(__dirname, '..', 'data', 'games-library.json');
const outPath = path.join(__dirname, '..', 'data', 'games-tags.json');
const lib = JSON.parse(fs.readFileSync(libPath, 'utf8'));

const sleep = ms => new Promise(r => setTimeout(r, ms));

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Cookie': 'birthtime=568022401; mature_content=1',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      }
    }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        return resolve(fetch(res.headers.location));
      }
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(d));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseTags(html) {
  const tags = [];
  const re = /<a[^>]*class="[^"]*app_tag[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(html)) && tags.length < 3) {
    const t = m[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
    if (t && !tags.includes(t)) tags.push(t);
  }
  return tags;
}

(async () => {
  const out = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {};
  const games = lib.games.filter(g => g.appid && !out[g.appid]);
  console.log(`to fetch: ${games.length} / ${lib.games.length}`);
  let ok = 0, fail = 0;
  for (const g of games) {
    try {
      const html = await fetch(`https://store.steampowered.com/app/${g.appid}/?l=schinese`);
      const tags = parseTags(html);
      if (tags.length) {
        out[g.appid] = tags;
        ok++;
      } else {
        out[g.appid] = [];
        fail++;
        console.log(`no tags: ${g.name} (${g.appid})`);
      }
    } catch (e) {
      fail++;
      console.log(`error: ${g.name} (${g.appid}) ${e.message}`);
    }
    await sleep(200);
  }
  fs.writeFileSync(outPath, JSON.stringify(out, null, 1), 'utf8');
  console.log(`done. ok=${ok} fail=${fail} total=${Object.keys(out).length}`);
})();
