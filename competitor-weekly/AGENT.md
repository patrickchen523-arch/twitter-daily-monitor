# AGENT.md — 竞品监测周报合集 · Agent 数据更新指南

> 读者：AI Agent（Codex / Copilot / 其他编码助手）
> 目标：在不破坏网站的前提下，把同事提供的周报素材更新进 `data/*.json`，或按需调整前端调用。
> 站点：`https://xmonitor.doc.nie.netease.com/competitor-weekly/`（GitLab Pages 静态站，无后端）

---

## 0. 铁律（每次任务必须遵守）

1. **先 pull 再改**：任何修改前必须 `git pull --rebase origin main`，拿到线上最新前端与数据，禁止基于旧本地副本改完直接覆盖 push。
2. **最小改动**：只改任务涉及的 JSON 文件（或明确要求的代码文件），`git add` 精确到文件，禁止 `git add -A` 把无关变更一起提交。
3. **数据可溯源**：素材里没有的指标填 `null`，**严禁编造/推算数据**；页面会自动把 `null` 显示为「— / 未披露」。
4. **JSON 必须合法**：双引号、无尾逗号。提交前逐文件校验：
   `node -e "JSON.parse(require('fs').readFileSync('文件路径','utf8'));console.log('ok')"`
5. **不动这两个文件**（除非任务明确要求改前端）：`index.html`、`app.js`。
6. base64 图片字段体积大属正常，不要「顺手优化」或截断它们。
7. **源表追溯修正历史数据时，三处必须同步**：`daily-metrics.json` 逐日 → `periods.json` 本期**及全部受影响历史期**的汇总项（flow/dau/peak/*Delta）→ 单文件 HTML 重导出。只改日级数据不改历史期汇总，趋势图会新旧口径断档（20260825 cs 期 722→980 事故）。历史期重算脚本：`运营周报/2026.08.17-08.23/patch_cs_hist_periods.cjs`（改 PID/游戏 id 可复用，幂等）。

---

## 1. 仓库与本子站位置

```
仓库：gitlab.nie.netease.com/xmonitor/xmonitor.doc.nie.netease.com
分支：main（push 后 CI 自动发布 GitLab Pages，约 1-2 分钟生效）
本子站目录：competitor-weekly/
```

标准工作流：

```bash
git clone https://gitlab.nie.netease.com/xmonitor/xmonitor.doc.nie.netease.com.git
cd xmonitor.doc.nie.netease.com
git pull --rebase origin main          # ← 每次动手前必做
# …修改 competitor-weekly/data/ 下对应文件…
node -e "JSON.parse(require('fs').readFileSync('competitor-weekly/data/改过的文件.json','utf8'))"
git add competitor-weekly/data/改过的文件.json     # ← 只 add 改动文件
git commit -m "周报数据更新：<周期> <产品/模块>（提交人）"
git pull --rebase origin main          # push 前再同步一次，防止覆盖他人并发提交
git push origin main
```

---

## 2. 架构：页面如何消费数据

```
index.html  ──fetch──▶  data/*.json  ──注入全局变量──▶  app.js 渲染
```

`index.html` 内置加载器，启动时并发请求全部 JSON，组装成以下全局变量后加载 `app.js`：

| 全局变量 | 来源文件 | 内容 |
|---|---|---|
| `window.__DB.META` | `data/meta.json` | 产品元数据 |
| `window.__DB.INTEL` | `data/intel.json` | 首页异动卡片情报 |
| `window.__DB.REPORTS` | `data/reports.json` | 周报列表（数组，第一条=当期） |
| `window.__DB.PERIODS` | `data/periods.json` | 各周期产品指标 |
| `window.__DB.REPORT_ARCHIVE` | `data/report-archive.json` | 归档附加数据 |
| `window.__DB.HERO_EVENT_SUMMARIES` | `data/hero-event-summaries.json` | 首屏事件摘要 |
| `window.__DB.OBSERVATIONS` | `data/observations.json` | 手动观测日期 |
| `window.__DAILY_METRICS` | `data/daily-metrics.json` | 日级流水/DAU |
| `window.__AUDIENCE_PROFILES` | `data/audience-profiles.json` | 用户画像 |
| `window.__ARCHIVE_REPORTS` | `data/archive-reports.json` | 历史周报（对比记录页） |
| `window.__ARCHIVE_PERIODS` | `data/archive-periods.json` | 历史周期条目 |
| `window.__ARCHIVE_CONTENT` | `data/archive-content.json` | 历史周期正文块 |
| `window.__CORE_REFERENCE_ITEMS` | `data/core-items.json` | 详情页核心运营内容正文 |
| `window.__CORE_REFERENCE_IMAGES` | `data/core-images.json` | 核心内容配图（base64） |

**因此 Agent 只需改 JSON，页面下次加载自动生效；不需要也不应该为了「让数据显示」去改 `app.js`。**

---

## 3. 数据文件 → 前端调用点对照表

> 以下函数均在 `app.js` 内，供需要核对渲染逻辑或确需改前端时定位。

| 页面位置 | 数据文件 | app.js 消费函数 |
|---|---|---|
| 首屏 Hero「本周异动产品」卡片 ×4 | `periods.json`(当期 items) + `intel.json` | `renderHome()` → `intelFor()` / `priorityImpact()` |
| 首屏「本期综述」 | `periods.json` 当期 `overview` 字段 | `renderHome()` |
| 数据表「竞品数据与变化说明」 | `periods.json` 当期 `items`（flow/dau/peak/*Delta/note/keywords） | `renderRows()`；亮点短句映射 `HIGHLIGHT_SHORT`（app.js 内常量） |
| 表下数据口径小字 | 无（写死在 `renderHome()` 的 `#tableCaption`） | `renderHome()` |
| 首页历史周期趋势对比 | `periods.json` 全部周期 | `renderOverviewTrend()` |
| 产品异动事件面板 | `archive-periods.json` + `archive-content.json` | `renderEventPanel()` |
| 详情页横幅用户画像 | `audience-profiles.json` | `openDetail()` 内 `audiencePanel` |
| 详情页三张指标卡 | `periods.json` 当期对应产品 item | `openDetail()` 内 `metricCards` |
| 详情页历史数据趋势（日级） | `daily-metrics.json` | `renderChart()`（flow/dau）；`renderChartLegacy()`（peak） |
| 详情页「核心运营内容」 | `core-items.json` + `core-images.json` | `renderCoreContentModule()` → `coreItemsFor()` → `coreContentItemHtml()` → `coreHierarchyHtml()`；图片灯箱 `bindCoreMediaLightbox()` |
| 对比记录页周报列表 | `archive-reports.json` | `renderReports()` |
| 对比记录页历史详情 | `archive-periods.json` + `archive-content.json` + `daily-metrics.json` | `openArchiveReport()` / `renderChart()` |

---

## 4. 各 JSON 字段规范

### 4.1 `periods.json`（每周必更）
```json
{
  "20260622": {
    "reportId": "20260622",
    "dataWindow": "报告周期：2026.06.22—2026.06.28",
    "overview": "<p>本期综述 HTML，可用 <b> 加粗</p>",
    "items": [
      { "id": "wz", "flow": 87010, "flowDelta": 146.6, "dau": 7317, "dauDelta": 5.5,
        "peak": 8020, "peakDelta": 8.1, "status": "normal",
        "note": "S44 新赛季推高活跃与付费，流水环比异常上冲。",
        "keywords": ["S44", "六耳猕猴"], "summary": "…", "analysisMode": "human" }
    ]
  }
}
```
- key = 周一日期 `yyyymmdd`；`flow` 单位万元、`dau/peak` 单位万、`*Delta` 单位 %
- 聚合口径：`flow`=周期日流水求和；`dau`=周期日 DAU 算术平均四舍五入；`peak`=周期日 DAU 最大；`*Delta`=对**前一自然周**（窗口前 7 天）同口径环比 %
- 未知指标 = `null`；`status`: `normal` / `priority`（异动）
- **`keywords`/`summary` 每期每游戏必填**：首页趋势图点选卡片的「关联运营事件」在 `intel.json` 无该游戏条目时以此兜底（标题=`keywords[0]`、正文=`summary`、标签=`keywords[1..2]`）；全空会显示只有"运营动态"标题的空白卡片（20260817 期 cs 事故）。文案可从 `core-items.json` 当期该游戏 `intro` 提炼
- **新增周期时**：同时更新 `reports.json`（数组最前插入新一期）与 `state.period` 默认值——默认值在 `app.js` 顶部 `const state={period:'20260622',...}`，需改为新周期 key（这是允许改 app.js 的唯一常规场景，改动只有这一处字符串）

### 4.2 `reports.json`
数组，**当期必须排第一**：`{"id":"20260622","label":"2026.06.22—06.28","title":"…","type":"运营周报","pages":28,"image":null,"pdf":null,"text":null}`

### 4.3 `daily-metrics.json`（详情页日级趋势）
`{ "wz": [["2026-06-22", 7317, 4896], ...] }` → `[日期, DAU(万), 流水(万元)]`，缺项填 `null`；日期升序。

### 4.4 `core-items.json`（核心运营内容）
```json
{ "wz": [ { "title": "局内内容更新", "type": "玩法", "period": "20260622",
            "text": "概述句\n○ 主题：导语\n– 要点：正文\n· 细节\n“玩家原话”" } ] }
```
- 层级符号：`○`主题 `–`要点 `·`细节 `“`反馈引用；`type` ∈ 玩法/平衡/竞技/商业化/营销/预热/活动/联动/舆情/反馈/风险/机制
- 配图：图片转 base64 webp 存入 `core-images.json`，key 用文件名（如 `p6_img-000.webp`），正文 media 字段按现有条目格式引用

### 4.5 `audience-profiles.json`
`{ "wz": { "source":"…", "gender":{"male":"53.26%","female":"46.74%"}, "age":{"18-23":"≈34%",...} } }`

### 4.6 产品 id 字典（`meta.json`）
`wz`王者荣耀 `hp`和平精英 `df`三角洲行动 `cs`超自然行动组 `ym`元梦之星 `jc`金铲铲之战 `ys`原神 `sr`崩坏：星穹铁道 `love`恋与深空 `sz`三国志·战略版 `sm`三国：谋定天下 `rock`洛克王国：世界

### 4.7 归档三件套（对比记录页）
`archive-reports.json`（数组：报告元信息）、`archive-periods.json`（按周期 key 的产品条目）、`archive-content.json`（按周期 key 的正文 blocks，`level`: major/detail）。新增历史周报时三者同步添加同 key 记录。

### 4.8 首页「历史周期趋势对比」显示规则（20260825 定版，`app.js renderOverviewTrend()`）
- **timeline = periods.json 中同时满足两条件的期**：① 距 `state.period` 不超过 3 个月；② 期号 ≥ 20260720，**或**该期有事件来源（`intel.json` 有条目或任一 item 带 keywords/summary）
- X 轴为等距分类轴（每期一个点、间距相等，不按真实日期留白），某游戏该期无数据则跳过该点——「仅连接已入库观测点，断档周期不补数」
- 点的数值读 `periods.json` 预聚合期汇总，**非** `daily-metrics.json` 现算——两者必须保持一致（见铁律 7）
- 右侧事件卡片 = 点选期的 `intelFor()`：`intel.json` 优先，否则 keywords/summary 兜底
- 归档期（archive-periods）不进趋势轴；单文件导出版隐藏趋势入口，此模块只看线上站

---

## 5. 验收清单（push 前逐项过）

- [ ] 已执行 `git pull --rebase origin main`，本地基于最新版本修改
- [ ] 改动的每个 JSON 都通过 `JSON.parse` 校验
- [ ] 未知数据为 `null`，无编造值；文本不含未转义换行（JSON 字符串内用 `\n`）
- [ ] `git status` 中只有任务相关文件被改动
- [ ] 若新增了周期：`reports.json` 已插入新期、`app.js` 的 `state.period` 已更新（唯一允许的 app.js 改动）
- [ ] 当期 items 每个游戏的 `keywords`/`summary` 均已填写（趋势图卡片兜底，见 4.1）
- [ ] 若修正了历史数据：受影响历史期汇总项已同步重算（见铁律 7）
- [ ] commit message 写明周期+产品/模块+提交人
- [ ] push 前再次 `git pull --rebase`，无冲突后才 `git push origin main`

## 6. 本地预览（可选）

静态服务指向仓库根目录：`npx serve .`，访问 `http://localhost:3000/competitor-weekly/`。
注意 `file://` 双击无法加载 JSON。
