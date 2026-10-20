#!/usr/bin/env node
'use strict';

// itch 榜一键同步：导入 → 重算推荐哈希 → 数据校验 → git 双端推送（GitHub + 内网 GitLab）。
//   node tools/sync_itch_board.js [YYYY-MM-DD]
// 幂等：launched 数据无实际变化时不产生空 commit、不推送（安全重复跑）。
// 红线：任何 rebase/cherry-pick 冲突都 abort 保持现场干净并失败退出，绝不 reset --hard / push --force。

const { spawnSync } = require('child_process');
const fs = require('fs');
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

// 1) 等档期四榜就绪后再导入。档期由日报流程（09:30+）创建并填满，itch 任务（09:00）跑得更早。
//    必须等 steamdb/bilibili/twitter 三榜有内容：import 写进半成品骨架会被日报后续重建覆盖，
//    gen_picks 也会因榜单未完成而失败（2026-10-17 事故）。
//    每 5 分钟探测一次，最多等 80 分钟；探测只读文件，不动档期。
function boardsReady() {
  try {
    const d = JSON.parse(fs.readFileSync(path.join(root, 'data', 'launched', `${date}.json`), 'utf8'));
    return ['steamdb', 'bilibili', 'twitter'].every(
      id => ((d.boards.find(b => b.id === id) || {}).items || []).length > 0);
  } catch { return false; }
}
{
  const waitDeadline = Date.now() + 80 * 60 * 1000;
  while (!boardsReady()) {
    if (Date.now() >= waitDeadline) {
      console.error('[sync_itch] 等档期四榜就绪超时（80 分钟），日报可能未完成，放弃');
      process.exit(1);
    }
    console.error('[sync_itch] 档期四榜未就绪（日报还在跑），5 分钟后重试…');
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300000);
  }
}
run('node', ['tools/import_itch_board.js', date]);
// 2) 重算推荐（itch 不参与候选，picks 应不变，仅更新哈希）→ 3) 数据闸门
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
//    commit 报 nothing to commit = 内容已被并发/前次运行提交过，按幂等成功处理（2026-10-19 竞态教训）。
{
  const ci = runOut('git', ['commit', '-m', `add itch board ${date}`]);
  if (ci.status !== 0) {
    if (/nothing to commit/i.test(ci.out)) {
      console.log(`\n[sync_itch] ${date} 档期内容已被提交，跳过推送`);
      process.exit(0);
    }
    console.error(`[sync_itch] git commit 失败: ${ci.out}`);
    process.exit(1);
  }
}
const sha = runOut('git', ['rev-parse', 'HEAD']).out;
// pull --rebase 撞锁（日报流程并发 git 操作）时等 30s 重试，最多 3 次；真冲突仍 abort 交人工。
let rb;
for (let attempt = 1; ; attempt++) {
  rb = runOut('git', ['pull', '--rebase', 'origin', 'main']);
  if (rb.status === 0) break;
  const lockLike = /unable to create|index\.lock|could not lock|cannot rebase onto multiple branches/i.test(rb.out);
  if (lockLike && attempt < 3) {
    console.error(`[sync_itch] pull --rebase 撞锁，30 秒后重试（${attempt}/2）…`);
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 30000);
    continue;
  }
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
