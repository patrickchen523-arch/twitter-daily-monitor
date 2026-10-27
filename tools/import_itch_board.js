#!/usr/bin/env node
'use strict';

// 把 itch-monitor 的当日快照导入游戏关注页（launched）为第五榜 "itch"。
//   node tools/import_itch_board.js [YYYY-MM-DD]
// 数据源：C:\Users\chenjunyi05\itch-monitor\data\itch\<date>.json（可用 ITCH_DATA_DIR 覆盖）
// 幂等：boards 里已有 itch 榜则整体替换，其余榜不动；append 在末尾（四榜位置不变）。

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const date = process.argv[2];
if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error('用法: node tools/import_itch_board.js <YYYY-MM-DD>');
  process.exit(1);
}

const itchDir = process.env.ITCH_DATA_DIR
  || 'C:\\Users\\chenjunyi05\\itch-monitor\\data\\itch';
const snapPath = path.join(itchDir, `${date}.json`);
if (!fs.existsSync(snapPath)) {
  console.error(`itch 快照不存在: ${snapPath}`);
  process.exit(1);
}
const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
if (snap.date && snap.date !== date) {
  console.error(`${date}: 快照内日期为 ${snap.date}，与目标档期不一致，拒绝导入`);
  process.exit(1);
}
const games = Array.isArray(snap.games) ? snap.games : [];
if (!games.length) {
  console.error(`${date}: itch 快照无游戏数据`);
  process.exit(1);
}

const metric = g => (g.rating && g.rating.value != null)
  ? `★${g.rating.value}·${g.rating.count || 0}人`
  : (g.is_new ? '新上榜' : '');

const items = games.map(g => ({
  name: g.title,
  sub: g.short_desc || '',
  thumb: g.cover || '',
  metric: metric(g),
  link: g.url || '',
  fresh: !!g.is_new,
  author: g.author || '',
  genre: g.genre || '',
  price: g.price == null || g.price === '' ? '免费' : String(g.price),
  rating_count: (g.rating && g.rating.count) || 0,
  comments_total: (g.comments && g.comments.total) || 0,
  platforms: (g.platforms || []).join('/'),
  tags: (g.tags || []).slice(0, 3),
  // LLM 加工层（itch-monitor tools/enrich_llm.js 产出）
  mech: (g.llm && g.llm.mechanic) || '',
  why: (g.llm && g.llm.why) || '',
}));

const board = {
  id: 'itch',
  title: 'itch.io 热游',
  title_en: 'ITCH.IO TRENDING',
  caption: 'itch.io featured 官方热度排序 · 数值为评分(评分人数) · 数据来源 itch-monitor 每日快照',
  // 溯源字段：证明本榜来自"当日"快照，而不是 make_day 从上期继承来的数据
  source_date: snap.date || date,
  source_fetched_at: snap.fetched_at || '',
  items,
};

const dayPath = path.join(root, 'data', 'launched', `${date}.json`);
if (!fs.existsSync(dayPath)) {
  console.error(`档期不存在: ${dayPath}（请先按日常流程建当日档期）`);
  process.exit(3);  // 3 = 档期未就绪（sync_itch_board 据此等待重试）
}
const day = JSON.parse(fs.readFileSync(dayPath, 'utf8'));
day.boards = (day.boards || []).filter(b => b.id !== 'itch');
day.boards.push(board);  // 末尾：四榜位置(index 0-3)不动，verify 的 #ld-list-2 推特榜断言不受影响
fs.writeFileSync(dayPath, JSON.stringify(day, null, 2) + '\n', 'utf8');
console.log(`[import_itch] ${date}: itch ${items.length} 款（新上榜 ${items.filter(i => i.fresh).length}）→ boards=${day.boards.map(b => b.id).join(',')}`);
