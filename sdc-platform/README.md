# SDC 竞品监测平台 · 动态版

竞品运营监测周报平台（王者荣耀 / 和平精英 / 三角洲行动 等 11 款产品）的动态化版本。

## 两种使用方式

### 1. 动态版（Node 服务端 + SQLite，数据可写）

```bash
cd sdc-platform
node server.js        # 默认 8080 端口，PORT 环境变量可改
```

打开 `http://localhost:8080` 即可。数据存于同目录 `data.db`（首次启动自动从 `seed.json` 灌入）。

- 「新增观测日期」填写的数据会**实时写入 SQLite 数据库**（原来只存浏览器 localStorage）
- API：
  - `GET /api/bootstrap.js` — 全量数据（动态生成 `window.__DB`）
  - `GET /api/observations` — 观测记录
  - `POST /api/observations` — 新增/更新观测（字段：product, obs_key, start, end, label, flow, dau, peak, note）
  - `POST /api/observations/delete` — 删除观测
- 零外部依赖：Node ≥ 22（用内置 `node:http` + `node:sqlite`），无需 npm install

### 2. 静态版（GitLab Pages / 直接双击打开）

`public/index.html` 已内置静态数据兜底（`static_db.js`），不跑服务端也能完整浏览（此时为只读，新增观测仅存本地浏览器）。

数据加载优先级：`/api/bootstrap.js`（动态）> `static_db.js`（静态兜底）。

## 文件

| 文件 | 说明 |
|------|------|
| `server.js` | Node 服务端（静态服务 + REST API + SQLite） |
| `seed.json` | 种子数据（META 12 产品 / PERIODS 6 周期 66 条指标 / 周报库 7 期 / 归档全文） |
| `public/index.html` | 前端单页（报告首页 / 竞品详情 / 对比记录） |
| `public/static_db.js` | 静态兜底数据 |

## 更新数据的方式

- 新观测日期：页面表单直接填，自动落库
- 新周期指标/周报：编辑 `seed.json` 后删除 `data.db` 重启即重新灌库；或直接操作 SQLite
