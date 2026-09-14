---
name: game-watch-update
description: 更新游戏关注页（推送看板）的标准工作流。当用户要求录入新期数据、更新游戏关注/游戏库榜单、或给出 bili-rank/steamdb-trending 导出文件时使用。覆盖 拉取云端→逐日导入→B站榜清洗→验收→推送双云端→线上验证 全过程。
---

# 游戏关注页更新工作流

项目根：`G:\创意部\推送看板＆游戏库\twitter-daily-monitor`

## 1. 同步云端

```bash
git fetch origin && git fetch gitlab
git merge origin/main --no-edit && git merge gitlab/main --no-edit
```

- 远端有新提交先合并再干活，避免分叉。
- 双远端：`gitlab`（公司 GitLab Pages，网站 xmonitor.doc.nie.netease.com）+ `origin`（GitHub Pages 备份 patrickchen523-arch.github.io/twitter-daily-monitor）。

## 2. 源数据落位

用户给的 Downloads 导出文件，复制进 `data\launched\raw\` 并按期改规范名：

```
bili-rank (N).json        -> data\launched\raw\bili-rank-YYYY-MM-DD.json
steamdb-trending (N).json -> data\launched\raw\steamdb-trending-YYYY-MM-DD.json
```

## 3. 逐日导入（日期升序，后一天依赖前一天的缓存/历史）

每个日期按序执行：

```bash
node tools\make_day.cjs <日期>                                          # 仅新期需要；已存在会报错跳过
node tools\import_steamdb_trending.js data\launched\raw\steamdb-trending-<日期>.json <日期>
node tools\import_bilibili_rank.js data\launched\raw\bili-rank-<日期>.json <日期>
node tools\import_twitter_board.js <日期>
node tools\gen_picks.cjs <日期>
```

说明：
- `make_day` 复制上期结构，清空 steamdb/bilibili/twitter 三榜，保留 roblox 榜与观测区，manifest.dates 追加新期。
- `import_twitter_board` 从日报 `data/*.json` 回溯生成（半衰期 1.5 天衰减，14 天出榜），无需额外导出文件。
- `import_steamdb_trending` 复用上期缓存减少 Steam API 调用（带 429 退避），所以必须先导早日期再导晚日期。
- `gen_picks` 要求当期 steamdb/bilibili 非空且 twitter≥10，否则报错禁止生成。

## 4. B站榜清洗（长期规则：发现即清，无需请示）

榜单混入非游戏名（人名/UP主/动漫角色/电竞/泛标签如"剪辑""钓鱼"）时直接清洗：

1. 从 `data\launched\bili-report-<日期>.json` 找噪声条目的 BV 号和 tags（字段：game/bvid/result/title/tags）。
2. 视频非具体游戏 → `data\launched\bili-overrides.json` 加 `"BV号": "EXCLUDE"`；张冠李戴 → 加 `"BV号": "正确游戏名"`（会并入既有条目）。
3. 噪声词加入 `tools\import_bilibili_rank.js` 的 `BLACKLIST`（小写比较，防未来新视频复发）。
4. 重跑导入。多日连跑前先回滚 `data\launched\bili-history.json`（删掉待重跑日期起的所有 key），否则"首次上榜"异动失真；然后按日期升序重跑。
5. 每个受影响日期重跑 `node tools\gen_picks.cjs <日期>` 重建推荐。
6. 未上线游戏（无限大/异环/Aniimo 等）不在榜上，归观测区 `watch.featured`；清洗前确认观测区已有该条目。

注意：早中期（8/05–9/04）无 raw 源文件，无法重跑导入，只能对 `data\launched\<日期>.json` 做手术清理（改 boards 里 bilibili 的 items），随后重跑当日 gen_picks。

## 5. 验收（缺一不许提交）

1. `data\launched\manifest.json` dates 相对上一自然日无断档
2. 当期四榜：steamdb=50、bilibili≥20、twitter=10、roblox=10
3. roblox 榜 `week` == `roblox/` 目录最新周报档期
4. twitter 榜首条目 `day` 距今 ≤3 天
5. picks 已用当日数据跑过 `gen_picks`（make_day 只复制上期 picks，不重跑会冻结）

## 6. 提交推送（两个远端缺一不可）

```bash
git add -A && git commit -m "<摘要>"
git fetch gitlab && git fetch origin   # 推前再查，有新提交先合并
git push gitlab main && git push origin main
```

## 7. 线上验证

- 仓库根有 `.nojekyll`（跳过 Jekyll，纯静态部署，约 1 分钟生效；没有它 GitHub Pages 构建会超时失败）。
- 验证方式：请求 `https://patrickchen523-arch.github.io/twitter-daily-monitor/data/launched/manifest.json`，确认 dates 最后一期 == 最新录入期；再抽查 `data/launched/<最新期>.json` 的 picks。
- 本机直连 github.io 可能被内网拦，用网页抓取工具验证即可。

## 坑位备忘

- Windows cmd 里 `node -e` 多行脚本会静默无输出：用单行 `-e` 或写临时 `tools\_tmp_*.cjs` 脚本跑，用完删掉。
- 中文乱码/无输出时别加 findstr 过滤调试，先裸跑看全文。
- B站导出 json 顶层是 `{items:[...]}`（rank 1-100，有 bvid/tags/title）；steamdb 导出是 `{items:[...]}`（100 条 trending）。
