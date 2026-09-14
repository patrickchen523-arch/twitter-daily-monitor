# 项目规则

游戏关注页更新全流程见 skill：`.codemaker/skills/game-watch-update/SKILL.md`（拉取→导入→清洗→验收→推送→验证）

## 推送规则

用户说"推送"时，一律同时推送到两个远程，缺一不可：

```bash
git push origin main            # GitHub（公网备份）→ patrickchen523-arch.github.io/twitter-daily-monitor
# GitLab（内网）→ xmonitor.doc.nie.netease.com，走 gitlab-sync 分支 cherry-pick：
git checkout gitlab-sync
git pull --ff-only              # 同事可能有新提交，先同步
git cherry-pick <commit-sha>
git push gitlab gitlab-sync:main
git checkout main
```

- **禁止直接 `git push gitlab main`**：GitLab main 含同事维护的内部项目（`sdc-platform/` 等），公网仓库不含；直接推 main 会把内网内容冲掉或把内部目录同步到公网。
- 推送前先 `git fetch gitlab && git fetch origin`，如远端有新提交先合并/rebase 再推，避免分叉。

## 部署校验铁律（改了日报源就必须重建派生榜）

GitLab Pages CI 第一步是 `node tools/verify_launched_imgs.cjs --data-only`：**任何对 `data/*.json` 的修改**（日报增改、B站榜清洗、overrides、tags 修复）都会使热游榜/今日推荐的哈希失配，pipeline 直接失败（9/14 已发生两次）。

以下工作流在 commit/push **之前**必须追加重建：

| 工作流 | 受影响日期 |
| --- | --- |
| x-daily-brief 每日日报 | 当日（若 launched 期已建）+ launched 最新一期 |
| B站榜清洗 / overrides / 黑名单 | 所有被改动日期 + 最新一期 |
| 热游榜重建本身 | boards 变了 picks 必须跟着重建 |
| Roblox 周报录入 | upload_roblox_report.py 已自动串接 update_roblox_board 链 |

每个受影响日期执行（顺序不能反）：

```bash
node tools/import_twitter_board.js <日期>   # 日期必填
node tools/gen_picks.cjs <日期>
node tools/verify_launched_imgs.cjs --data-only   # exit≠0 禁止 push
```

注意：CI 只校验最新一期（launched manifest.dates 末尾），历史日期失配不会挂 pipeline，但会让站点自相矛盾——所以历史日期也要重建。verify 的检查项见 §游戏关注页提交前验收（其中连续性/四榜数量/roblox档期/twitter新鲜度 已自动化进 verify）。

## B站榜清洗（长期规则，无需请示直接执行）

B站榜混入非游戏名（人名/UP主/角色/电竞/泛标签如"剪辑""钓鱼"）时**直接清洗**：

1. 从 `data/launched/bili-report-<日期>.json` 找到噪声条目对应的 BV 号与 tags
2. 视频非具体游戏 → `bili-overrides.json` 加 `"BV号": "EXCLUDE"`；是张冠李戴 → 加 `"BV号": "正确游戏名"`
3. 噪声词加入 `tools/import_bilibili_rank.js` 的 `BLACKLIST`（防未来新视频复发）
4. 重跑当日导入 `node tools\import_bilibili_rank.js <raw> <日期>`（历史多日按日期升序连跑），再跑 `node tools\gen_picks.cjs <日期>` 重建推荐
5. 多日连跑前先回滚 `bili-history.json` 到首个待重跑日之前（删对应 key），否则"首次上榜"异动失真

## 游戏关注页提交前验收（缺一不许提交）

1. `data/launched/manifest.json` dates 相对上一自然日无断档（9/7 缺期事故）
2. 当期四榜：steamdb=50、bilibili≥20、twitter=10、roblox=10
3. roblox 榜 `week` == `roblox/` 目录最新周报档期（周报 HTML 入库后必须同会话跑 `node tools\update_roblox_board.cjs` + `--propagate`）
4. twitter 榜首条目的 `day` 距今 ≤3 天（半衰期衰减排序已内置，仍要抽查）
5. picks 已用当日数据跑过 `node tools\gen_picks.cjs <日期>`（make_day 复制上期 picks，不重跑就冻结）
