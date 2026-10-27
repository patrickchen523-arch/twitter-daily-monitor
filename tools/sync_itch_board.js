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

// 0) 工作区预检（内容口径）：未提交的**内容**修改会让 pull --rebase 中途拒绝（2026-10-20 事故：commit 成功后才炸，状态割裂）。
//    但只看 `git status --porcelain` 会误伤：CRLF/LF 重写或重序列化会让 stat 尺寸变化、内容却等价，
//    此时 porcelain 报 " M" 而 `git diff` 是空的（2026-10-27 事故：日报流程把昨日 launched 重写成 LF，
//    预检直接 exit 1，当日 itch 榜没上线）。故分两步：
//      ① 纯 stat 脏项（工作区有改动但 git diff 为空）→ 自动 git add 刷新索引，不产生任何内容变更；
//      ② 只有"内容真变了 / 有暂存改动 / 有未跟踪文件"才拦。
//    加 --preflight-only 可单跑预检（排障/回归用）。
{
  const sh = (args, opts = {}) => spawnSync('git', args, { cwd: root, encoding: 'utf8', ...opts });
  const porcelain = (sh(['status', '--porcelain']).stdout || '')
    .split('\n').map(s => s.replace(/\s+$/, '')).filter(Boolean);
  const phantom = porcelain
    .map(line => ({ code: line.slice(0, 2), p: line.slice(3).trim() }))
    .filter(e => /^ [MD]$/.test(e.code) && e.p)
    // quotepath 转义过的路径（带引号）不做自愈，保持保守：宁可拦也不误放
    .filter(e => !e.p.startsWith('"') && sh(['diff', '--quiet', '--', e.p]).status === 0)
    .map(e => e.p);
  if (phantom.length) {
    console.error(`[sync_itch] 检出仅行尾/stat 差异（内容等价）的项，自动刷新索引：${phantom.join(', ')}`);
    const add = sh(['add', '--', ...phantom], { stdio: 'inherit' });
    if (add.status !== 0) {
      console.error('[sync_itch] 自动刷新索引失败，请人工处理工作区后重跑');
      process.exit(1);
    }
  }
  const dirty = [...new Set([
    ...(sh(['diff', '--name-only']).stdout || '').split('\n'),
    ...(sh(['diff', '--cached', '--name-only']).stdout || '').split('\n'),
    ...(sh(['ls-files', '--others', '--exclude-standard']).stdout || '').split('\n'),
  ].map(s => s.trim()).filter(Boolean))];
  if (dirty.length) {
    console.error(`[sync_itch] 工作区有未提交修改，请先提交或还原后再跑：\n${dirty.map(p => `\t${p}`).join('\n')}`);
    process.exit(1);
  }
  if (process.argv.includes('--preflight-only')) {
    console.log('[sync_itch] 预检通过（--preflight-only）');
    process.exit(0);
  }
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
// 1.1) 导入后自检：当日 itch 榜必须存在、非空，且来源日期=当日。
//      防两类静默失败：import 没真跑成 / 页面上挂的仍是 make_day 从上期继承来的 itch 榜（2026-10-27 事故）。
{
  const day = JSON.parse(fs.readFileSync(path.join(root, 'data', 'launched', `${date}.json`), 'utf8'));
  const itch = (day.boards || []).find(b => b.id === 'itch');
  if (!itch || !Array.isArray(itch.items) || !itch.items.length) {
    console.error('[sync_itch] 导入后 itch 榜为空，放弃（不提交）');
    process.exit(1);
  }
  if (itch.source_date && itch.source_date !== date) {
    console.error(`[sync_itch] itch 榜来源日期 ${itch.source_date} ≠ ${date}（疑似继承上期数据），放弃（不提交）`);
    process.exit(1);
  }
}
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
