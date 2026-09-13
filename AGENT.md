# 项目规则

## 推送规则

用户说"推送"时，一律同时推送到两个远程，缺一不可：

```bash
git push gitlab main
git push origin main
```

- `gitlab` → https://gitlab.nie.netease.com/xmonitor/xmonitor.doc.nie.netease.com.git —— 网站 xmonitor.doc.nie.netease.com 由 GitLab Pages 部署，不推 gitlab 网站不更新
- `origin` → https://github.com/patrickchen523-arch/twitter-daily-monitor.git —— GitHub 备份

推送前先 `git fetch gitlab && git fetch origin`，如远端有新提交先合并再推，避免分叉。

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
