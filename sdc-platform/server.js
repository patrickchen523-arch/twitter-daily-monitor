// SDC 竞品监测平台 · 动态服务端（Node 内置 http + node:sqlite，零外部依赖）
// 启动：node server.js  →  http://localhost:8080
const http = require('http');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const ROOT = __dirname;
const PUB = path.join(ROOT, 'public');
const PORT = process.env.PORT || 8080;

/* ═══ 数据库 ═══ */
const db = new DatabaseSync(path.join(ROOT, 'data.db'));
db.exec(`
CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT);
CREATE TABLE IF NOT EXISTS observations(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product TEXT NOT NULL,
  obs_key TEXT NOT NULL,
  start_date TEXT,
  end_date TEXT,
  label TEXT,
  flow REAL,
  dau REAL,
  peak REAL,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now','localtime')),
  UNIQUE(product, obs_key)
);`);

const setKV = db.prepare('INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v');
const getKVStmt = db.prepare('SELECT v FROM kv WHERE k=?');
function getKV(k) { const r = getKVStmt.get(k); return r ? JSON.parse(r.v) : null; }

/* ═══ 首次启动灌入种子数据 ═══ */
if (!getKV('META')) {
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, 'seed.json'), 'utf8'));
  for (const k of ['META', 'INTEL', 'REPORTS', 'PERIODS', 'HERO_EVENT_SUMMARIES', 'REPORT_ARCHIVE']) {
    setKV.run(k, JSON.stringify(seed[k]));
  }
  console.log('[db] seeded from seed.json');
}

/* ═══ 观测记录读取（组装为前端需要的 {product:[records]} 结构） ═══ */
function allObservations() {
  const rows = db.prepare('SELECT * FROM observations ORDER BY product, start_date').all();
  const out = {};
  for (const r of rows) {
    (out[r.product] = out[r.product] || []).push({
      key: r.obs_key, start: r.start_date, end: r.end_date, label: r.label, custom: true,
      item: { id: r.product, flow: r.flow, flowDelta: null, dau: r.dau, dauDelta: null, peak: r.peak, peakDelta: null, status: 'normal', note: r.note || '手动新增观测日期', keywords: [], summary: '该观测日期尚未关联运营报告。' }
    });
  }
  return out;
}

/* ═══ HTTP ═══ */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;

  // ── API ──
  if (p === '/api/bootstrap.js') {
    const payload = {
      META: getKV('META'), INTEL: getKV('INTEL'), REPORTS: getKV('REPORTS'),
      PERIODS: getKV('PERIODS'), HERO_EVENT_SUMMARIES: getKV('HERO_EVENT_SUMMARIES'),
      REPORT_ARCHIVE: getKV('REPORT_ARCHIVE'), OBSERVATIONS: allObservations()
    };
    res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('window.__DB = ' + JSON.stringify(payload) + ';');
    return;
  }
  if (p === '/api/observations' && req.method === 'GET') {
    res.writeHead(200, MIME['.json']);
    res.end(JSON.stringify(allObservations()));
    return;
  }
  if (p === '/api/observations' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        if (!d.product || !d.obs_key) throw new Error('missing product/obs_key');
        db.prepare(`INSERT INTO observations(product,obs_key,start_date,end_date,label,flow,dau,peak,note)
          VALUES(?,?,?,?,?,?,?,?,?)
          ON CONFLICT(product,obs_key) DO UPDATE SET start_date=excluded.start_date,end_date=excluded.end_date,
          label=excluded.label,flow=excluded.flow,dau=excluded.dau,peak=excluded.peak,note=excluded.note`)
          .run(d.product, d.obs_key, d.start || null, d.end || null, d.label || null,
            d.flow ?? null, d.dau ?? null, d.peak ?? null, d.note || null);
        res.writeHead(200, MIME['.json']);
        res.end(JSON.stringify({ ok: true, saved: d.obs_key, observations: allObservations() }));
      } catch (e) {
        res.writeHead(400, MIME['.json']);
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }
  if (p === '/api/observations/delete' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const d = JSON.parse(body);
        db.prepare('DELETE FROM observations WHERE product=? AND obs_key=?').run(d.product, d.obs_key);
        res.writeHead(200, MIME['.json']);
        res.end(JSON.stringify({ ok: true, observations: allObservations() }));
      } catch (e) { res.writeHead(400, MIME['.json']); res.end(JSON.stringify({ ok: false, error: e.message })); }
    });
    return;
  }

  // ── 静态文件 ──
  let fp = p === '/' ? '/index.html' : p;
  fp = path.normalize(fp).replace(/^([/\\])+/, '');
  const abs = path.join(PUB, fp);
  if (!abs.startsWith(PUB) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
    res.writeHead(404); res.end('404');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream' });
  fs.createReadStream(abs).pipe(res);
});

server.listen(PORT, () => console.log(`SDC 竞品监测平台已启动：http://localhost:${PORT}`));
