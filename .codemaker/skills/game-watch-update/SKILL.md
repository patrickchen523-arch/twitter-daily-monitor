---
name: game-watch-update
description: 更新游戏关注页（推送看板）的标准工作流。当用户要求录入新期数据、更新游戏关注/游戏库榜单、或给出 bili-rank/steamdb-trending 导出文件时使用。覆盖 拉取云端→逐日导入→B站榜清洗→验收→推送双云端→线上验证 全过程。
---

# 游戏关注页更新工作流

项目根（本仓库根目录）：本机 `D:\CMproject\X爬虫\site`（旧机为 `G:\创意部\推送看板＆游戏库\twitter-daily-monitor`，按实际 checkout 位置替换）。

## 1. 同步云端

```bash
git fetch origin && git fetch gitlab
git pull --rebase origin main          # main 只跟公网同步
# gitlab 侧的新提交不要 merge 进 main（含内部项目 sdc-platform/，会污染公网仓库）
```

- 远端有新提交先合并再干活，避免分叉。
- 双远端：`gitlab`（公司 GitLab Pages，网站 xmonitor.doc.nie.netease.com）+ `origin`（GitHub Pages 备份 patrickchen523-arch.github.io/twitter-daily-monitor）。
- **禁止直接 `git push gitlab main`**：推送走 gitlab-sync 分支 cherry-pick（见第 6 节）。

## 2. 源数据落位

用户给的 Downloads 导出文件，复制进 `data\launched\raw\` 并按期改规范名：

```
bili-rank (N).json        -> data\launched\raw\bili-rank-YYYY-MM-DD.json
steamdb-trending (N).json -> data\launched\raw\steamdb-trending-YYYY-MM-DD.json
```

## 3. 逐日导入（日期升序，后一天依赖前一天的缓存/历史）

每个日期按序执行（**所有脚本的日期参数均为必填**，缺省直接报错退出——防止误写历史快照）：

```bash
node tools\make_day.cjs <日期>                                          # 仅新期需要；已存在会报错跳过
node tools\import_steamdb_trending.js data\launched\raw\steamdb-trending-<日期>.json <日期>
node tools\import_bilibili_rank.js data\launched\raw\bili-rank-<日期>.json <日期>
node tools\import_twitter_board.js <日期>                               # 可带第二参数[数据截止日]，见下
node tools\gen_picks.cjs <日期>
```

说明：
- `make_day` 复制上期结构，清空 steamdb/bilibili/twitter 三榜，保留 roblox 榜与观测区，manifest.dates 追加新期。
- `import_twitter_board` 从日报 `data/*.json` 回溯生成（半衰期 1.5 天衰减，14 天出榜），无需额外导出文件。支持第二参数：`import_twitter_board.js <档期> <数据截止日>`——档期未新建的日子里，每日日报流程用它对**最新档期**做当日数据刷新（写入 `board.data_through`，verify 闸门按它重算哈希与新鲜度），所以关注页推特榜不再依赖建新期才更新。
- `import_steamdb_trending` 复用上期缓存减少 Steam API 调用（带 429 退避），所以必须先导早日期再导晚日期。
- `gen_picks` 要求当期 steamdb/bilibili 非空且 twitter≥10，否则报错禁止生成。
- **日报工作流侧**：x-daily-brief 每日新增/改写 `data/<日期>.json` 后，也必须对受影响日期重跑 `import_twitter_board` + `gen_picks`（日报源变了热游榜哈希就失效，CI 闸门会拦部署）；当日档期不存在且当日 bili raw 已导出时，日报流程会直接按本节链条建当日新期。即「游戏关注页更新已并入每日流程」，不是两个独立流程。

## 4. B站榜清洗（长期规则：发现即清，无需请示）

榜单混入非游戏名（人名/UP主/动漫角色/电竞/泛标签如"剪辑""钓鱼"）时直接清洗：

1. 从 `data\launched\bili-report-<日期>.json` 找噪声条目的 BV 号和 tags（字段：game/bvid/result/title/tags）。
2. 视频非具体游戏 → `data\launched\bili-overrides.json` 加 `"BV号": "EXCLUDE"`；张冠李戴 → 加 `"BV号": "正确游戏名"`（会并入既有条目）。
3. 噪声词加入 `tools\import_bilibili_rank.js` 的 `BLACKLIST`（小写比较，防未来新视频复发）。
4. 重跑导入。多日连跑前先回滚 `data\launched\bili-history.json`（删掉待重跑日期起的所有 key），否则"首次上榜"异动失真；然后按日期升序重跑。
5. 每个受影响日期重跑 `node tools\gen_picks.cjs <日期>` 重建推荐，最后跑一次 `node tools\verify_launched_imgs.cjs --data-only` 确认 exit 0 再提交。
6. 未上线游戏（无限大/异环/Aniimo 等）不在榜上，归观测区 `watch.featured`；清洗前确认观测区已有该条目。

注意：早中期（8/05–9/04）无 raw 源文件，无法重跑导入，只能对 `data\launched\<日期>.json` 做手术清理（改 boards 里 bilibili 的 items），随后重跑当日 gen_picks。

## 4.5 Roblox 周报与 roblox 榜联动

Roblox 周报收录用 `python upload_roblox_report.py <周报html>`，脚本已自动串接：复制文件 → 插 robloxReports 数组 → `update_roblox_board.cjs` 链（写榜→details→thumbs→propagate）→ 最新期 `gen_picks` → verify 闸门 → 双端推送。

若手工放周报 HTML 入库（没用脚本），必须同会话补跑：

```bash
node tools\update_roblox_board.cjs
node tools\fetch_roblox_details.js <最新日期>
node tools\fetch_roblox_thumbs.js <最新日期>
node tools\update_roblox_board.cjs --propagate
node tools\gen_picks.cjs <最新日期>
```

否则 roblox 榜档期会落后于 roblox/ 目录，verify 闸门直接拦部署（9/14 已踩过）。

## 5. 验收（缺一不许提交）

**第 0 步（自动化闸门，必须 exit 0）**：

```bash
node tools\verify_launched_imgs.cjs --data-only
```

该命令与 GitLab Pages CI 第一步完全同款，覆盖下列硬性校验：数据日期一致、manifest 升序去重、档期连续性（历史断档仅告警，最新两期断档直接失败）、四榜数量（steamdb=50、bilibili≥20、twitter≥10、roblox=10）、无未来发售游戏混入、封面 URL 有效、推荐 5 款不重复且封面有效、`picks_generated_from` 与三榜哈希一致、热游榜 `generated_from` 与日报源哈希一致、roblox 榜档期 == roblox/ 目录最新周报、推特热游榜首 `day` 距本期 ≤3 天。

人工再确认：
1. 无断档等历史告警是否符合预期（告警不拦截，但要知情）
2. 观测区 `watch.featured` 未混入已上线游戏
3. 当期推荐 5 款内容合理（verify 只查结构与哈希，不查选题质量）

注意：CI 只校验最新一期；历史日期的 picks/热游榜哈希失配不会挂 pipeline，但会让站点自相矛盾——改动历史日期后那些日期也要重建。

## 6. 提交推送（两个远端缺一不可，禁止直接推 gitlab main）

```bash
git add -A && git commit -m "<摘要>"
git fetch origin && git pull --rebase origin main && git push origin main   # GitHub（公网）
# GitLab（内网）：cherry-pick 到 gitlab-sync 再推
git checkout gitlab-sync && git pull --ff-only
git cherry-pick <上面的commit-sha>
git push gitlab gitlab-sync:main
git checkout main
```

GitLab main 含同事维护的内部项目（sdc-platform/ 等），公网仓库不含，两端内容分离——所以 GitLab 侧永远走 cherry-pick，绝不 merge 或直推 main。

## 7. 线上验证

- 仓库根有 `.nojekyll`（跳过 Jekyll，纯静态部署，约 1 分钟生效；没有它 GitHub Pages 构建会超时失败）。
- 验证方式：请求 `https://patrickchen523-arch.github.io/twitter-daily-monitor/data/launched/manifest.json`，确认 dates 最后一期 == 最新录入期；再抽查 `data/launched/<最新期>.json` 的 picks。
- 本机直连 github.io 可能被内网拦，用网页抓取工具验证即可。

## 坑位备忘

- Windows cmd 里 `node -e` 多行脚本会静默无输出：用单行 `-e` 或写临时 `tools\_tmp_*.cjs` 脚本跑，用完删掉。
- 中文乱码/无输出时别加 findstr 过滤调试，先裸跑看全文。
- B站导出 json 顶层是 `{items:[...]}`（rank 1-100，有 bvid/tags/title）；steamdb 导出是 `{items:[...]}`（100 条 trending）。
