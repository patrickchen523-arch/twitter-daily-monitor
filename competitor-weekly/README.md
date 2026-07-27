# 竞品监测周报合集（动态数据版）

静态站点，无后端。页面启动时通过 `fetch` 读取 `data/*.json` 渲染全部内容。
**协作方式：修改对应 JSON → commit → push 到 main，GitLab Pages 自动发布即完成"上传"。**

线上地址：`https://xmonitor.doc.nie.netease.com/competitor-weekly/`

---

## 一、目录结构

```
competitor-weekly/
├─ index.html          页面骨架（CSS + 数据加载器，勿动）
├─ app.js              渲染逻辑（勿动）
└─ data/               ★ 协作只改这里 ★
   ├─ meta.json            产品元数据（名称/图标/颜色）
   ├─ reports.json         当前周期周报信息 + INTEL 卡片数据
   ├─ periods.json         各周期产品指标（流水/DAU/峰值/环比/状态/亮点）
   ├─ intel.json           首页异动卡片情报（按产品）
   ├─ report-archive.json  报告归档附加数据
   ├─ daily-metrics.json   日级流水/DAU（详情页趋势图）
   ├─ audience-profiles.json  用户画像（性别/年龄占比）
   ├─ archive-reports.json    历史周报列表（对比记录页）
   ├─ archive-periods.json    历史周期产品条目
   ├─ archive-content.json    历史周期正文内容块
   ├─ core-items.json         详情页「核心运营内容」正文（按产品）
   ├─ core-images.json        核心运营内容配图（base64 webp）
   ├─ hero-event-summaries.json
   └─ observations.json       手动新增观测日期记录
```

## 二、各文件数据格式

### periods.json（最常用：每周更新）
```json
{
  "20260622": {
    "reportId": "20260622",
    "dataWindow": "报告周期：2026.06.22—2026.06.28",
    "items": [
      {
        "id": "wz",
        "flow": 87010, "flowDelta": 146.6,
        "dau": 7317,   "dauDelta": 5.5,
        "peak": 8020,  "peakDelta": 8.1,
        "status": "normal",
        "note": "S44 新赛季推高活跃与付费，流水环比异常上冲。",
        "keywords": ["S44", "六耳猕猴"],
        "summary": "S44 新赛季…",
        "analysisMode": "human"
      }
    ]
  }
}
```
- 指标未知一律填 `null`（页面显示"—/未披露"），**不要编数**
- 环比 `xxxDelta` 单位 %，正数上升
- 新周期：复制上一周期 key 改成新 `yyyymmdd`（周一日期），并同步 `reports.json` 增加对应报告

### reports.json
数组，每项 `{ "id":"20260622", "label":"2026.06.22—06.28", "title":"…", "type":"运营周报", "pages":28, "image":null, "pdf":null, "text":null }`。**新一期放数组最前**，首页默认取第一条。

### daily-metrics.json（日级趋势）
```json
{ "wz": [["2026-06-22", 7317, 4896], ...] }
```
格式：`产品id: [[日期, DAU(万), 流水(万元)], ...]`，无该指标填 `null`。

### core-items.json（核心运营内容正文）
```json
{
  "wz": [
    {
      "title": "局内内容更新",
      "type": "玩法",
      "period": "20260622",
      "text": "概述句\n○ 一级主题：导语\n– 二级要点：正文\n· 三级细节\n“玩家原话引用”"
    }
  ]
}
```
- 层级符号：`○`=主题、`–`=要点、`·`=细节、`“`=玩家反馈引用（仅反馈主题下生效）
- `type` 可选：玩法/平衡/竞技/商业化/营销/预热/活动/联动/舆情/反馈/风险/机制

### audience-profiles.json
```json
{ "wz": { "source":"…", "gender":{"male":"53.26%","female":"46.74%"}, "age":{"18-23":"≈34%","24-30":"≈29%","31-40":"≈28%","41-50":"≈4%","50+":"≈2%"} } }
```

### meta.json 产品 id 对照
`wz`王者荣耀 `hp`和平精英 `df`三角洲行动 `cs`超自然行动组 `ym`元梦之星 `jc`金铲铲之战 `ys`原神 `sr`崩坏：星穹铁道 `love`恋与深空 `sz`三国志·战略版 `sm`三国：谋定天下 `rock`洛克王国：世界

## 三、AI 协作标准流程（给同事的提示词模板）

> 这是竞品周报的 JSON 数据文件 `<贴入对应 json>`。
> 数据规范：<贴入上文对应小节>
> 请根据我给你的本周素材 `<贴素材>`，按规范输出/更新 JSON，指标未知填 null，不要编造数据。
> 输出完整合法 JSON 文件内容。

然后：
```bash
git clone https://gitlab.nie.netease.com/xmonitor/xmonitor.doc.nie.netease.com.git
cd xmonitor.doc.nie.netease.com/competitor-weekly
# 用 AI 生成的内容替换 data/ 下对应文件
git add data/
git commit -m "周报数据更新：2026xxxx <竞品/模块>"
git push origin main
```
push 后约 1-2 分钟 Pages 自动发布，刷新页面即见。

## 四、本地预览

`file://` 双击无法加载 JSON。任选其一：

```bash
# 方式一
npx serve xmonitor.doc.nie.netease.com
# 方式二：VSCode Live Server 打开 competitor-weekly/index.html
```
访问 `http://localhost:3000/competitor-weekly/`。

## 五、注意事项

1. JSON 必须合法（无尾逗号、双引号），改完可用 `node -e "JSON.parse(require('fs').readFileSync('文件','utf8'))"` 校验
2. 图片统一 base64 webp 放 `core-images.json`，key 用原文件名（如 `p6_img-000.webp`），正文中以同名 key 引用
3. 不要改 `index.html` / `app.js`；功能问题提 issue 或找页面负责人
4. 大文件说明：meta.json（产品图标）、intel.json（卡片配图）、core-images.json 内含 base64 图片，体积较大属正常
