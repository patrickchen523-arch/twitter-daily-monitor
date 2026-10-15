#!/usr/bin/env node
'use strict';

// itch 榜一键同步：导入 → 重算推荐哈希 → 数据校验 → git 双端推送（GitHub + 内网 GitLab）。
//   node tools/sync_itch_board.js [YYYY-MM-DD]
// 幂等：launched 数据无实际变化时不产生空 commit、不推送（安全重复跑）。
// 红线：任何 rebase/cherry-pick 冲突都 abort 保持现场干净并失败退出，绝不 reset --hard / push --force。

const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const date = process.argv[2];
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('用法: node tools/sync_itch_board.js <YYYY-MM-DD>');
  process.exit(1);
}

function run(cmd, args, opts = {}) {
  const label = `${cmd} ${args.join(' ')}`;
  console.error(`\n=== ${label} ===`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', ...opts });
  if (r.status !== 0) {
    console.error(`[sync_itch] 失败: ${label} (exit ${r.status})`);
    process.exit(r.status || 1);
  }
}

function runOut(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: root, encoding: 'utf8' });
  return { status: r.status, out: (r.stdout || '').trim() };
}

// 1) 导入 itch 榜 → 2) 重算推荐（itch 不参与候选，picks 应不变，仅更新哈希）→ 3) 数据闸门
run('node', ['tools/import_itch_board.js', date]);
run('node', ['tools/gen_picks.cjs', date]);
run('node', ['tools/verify_launched_imgs.cjs', date, '--data-only']);

// 4) 暂存 + 幂等检查
run('git', ['add', `data/launched/${date}.json`]);
const diff = runOut('git', ['diff', '--cached', '--quiet']);
if (diff.status === 0) {
  console.log(`\n[sync_itch] ${date} launched 数据无变化，跳过提交与推送`);
  process.exit(0);
}

// 5) 提交 + 推 GitHub（先 rebase 远端，避免多线推送撞车）
run('git', ['commit', '-m', `add itch board ${date}`]);
const sha = runOut('git', ['rev-parse', 'HEAD']).out;
const rb = runOut('git', ['pull', '--rebase', 'origin', 'main']);
if (rb.status !== 0) {
  runOut('git', ['rebase', '--abort']);  // 保持现场干净，冲突交人工
  console.error('[sync_itch] pull --rebase 冲突，已 abort；请人工合并后重跑本脚本');
  process.exit(1);
}
run('git', ['push', 'origin', 'main']);

// 6) GitLab 内网：gitlab-sync 分支 cherry-pick（禁止直接 push gitlab main）
run('git', ['checkout', 'gitlab-sync']);
const pl = runOut('git', ['pull', '--ff-only']);
if (pl.status !== 0) {
  runOut('git', ['checkout', 'main']);
  console.error('[sync_itch] gitlab-sync pull --ff-only 失败，已切回 main；请人工检查');
  process.exit(1);
}
const cp = runOut('git', ['cherry-pick', sha]);
if (cp.status !== 0) {
  runOut('git', ['cherry-pick', '--abort']);
  runOut('git', ['checkout', 'main']);
  console.error('[sync_itch] cherry-pick 冲突，已 abort 并切回 main；请人工同步 GitLab');
  process.exit(1);
}
run('git', ['push', 'gitlab', 'gitlab-sync:main']);
run('git', ['checkout', 'main']);
console.log(`\n[sync_itch] ${date} 双端推送完成 (${sha.slice(0, 7)})`);
