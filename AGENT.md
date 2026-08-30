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
