/* Roblox API 专用 HTTP：公司网络直连 apis/thumbnails/games.roblox.com 会挂起（2026-09-21 事故），
 * 先直连（8s 超时），失败自动走 Clash 代理（ROBLOX_PROXY 可覆盖，默认 127.0.0.1:7897）。
 * 用法: const { getJson } = require('./_roblox_http.cjs'); */
const https = require('https');
const { execFileSync } = require('child_process');

const PROXY = process.env.ROBLOX_PROXY || 'http://127.0.0.1:7897';

function direct(url, timeoutMs = 8000) {
  return new Promise(resolve => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: timeoutMs }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve(null); } });
      res.on('error', () => resolve(null));
    });
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.on('error', () => resolve(null));
  });
}

function viaProxy(url) {
  try {
    const out = execFileSync('curl.exe', ['-s', '-m', '20', '-x', PROXY, url],
      { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
    return JSON.parse(out);
  } catch { return null; }
}

async function getJson(url) {
  const d = await direct(url);
  if (d !== null) return d;
  const p = viaProxy(url);
  if (p !== null) console.log('  (经代理)', url.slice(0, 90));
  return p;
}

module.exports = { getJson };
