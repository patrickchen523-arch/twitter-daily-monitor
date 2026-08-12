/* 2026-08-11 B站人工修正：overrides 13 条 + unreleased +1 + mature +1，改完重跑 import_bilibili_rank.js */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'data', 'launched');

const ovr = JSON.parse(fs.readFileSync(path.join(dir, 'bili-overrides.json'), 'utf8'));
const add = {
  // 非游戏/归属无法确定 → 整条剔除
  'BV1inuA6ZEKu': 'EXCLUDE',   // rank24 网文锐评（非游戏内容）
  'BV1QQuP6xEAd': 'EXCLUDE',   // rank16 某幻"旅游胜地"（频次误中"旅游"，归属游戏无法确定）
  'BV1PvuM69EKY': 'EXCLUDE',   // rank79 "怪兽:说谢谢!"（阴阳师/猛兽标签混杂，归属无法确定）
  // 频次/词典误中 → 指正
  'BV1Ljud6GE4M': '逆战：未来',   // rank19 误中Cosplay；逆战未来S3无主之地联动赛季
  'BV1cAu96VEtv': '僵尸毁灭工程', // rank23 误中丧尸；僵毁TV（project zomboid）
  'BV17qum6dEsF': '王者荣耀',     // rank33 误中巅峰；巅峰赛=王者荣耀
  'BV1YXMC6NEXY': '世界盒子',     // rank49 误中战争；worldbox世界盒子
  'BV16iMr6MEwn': '战双帕弥什',   // rank58 误中战双音乐会；战双动画短片
  'BV1wYuS6TE8u': '原神',         // rank71 误中音乐；原神千星奇域原琴合奏
  'BV1r4u36dEKn': '破烂艺术家',   // rank74 误中逍遥散人(UP主)；标题《破烂艺术家》
  'BV1whuS6BEro': '反恐精英2',    // rank78 误中邪恶的阿旺(UP主)；CS内容
  'BV1DFuX6xETX': 'Ardem',        // rank90 误中僵尸；Ardem Playtest（测试→未上线）
  'BV1EwuK6BEir': '三角洲行动'    // rank40 零候选兜底失败；标题明确【三角洲】藏宝图点位
};
let n = 0;
for (const [k, v] of Object.entries(add)) { if (!ovr[k]) { ovr[k] = v; n++; } }
fs.writeFileSync(path.join(dir, 'bili-overrides.json'), JSON.stringify(ovr, null, 1));
console.log('overrides +', n, '总', Object.keys(ovr).length);

const unrel = JSON.parse(fs.readFileSync(path.join(dir, 'bili-unreleased.json'), 'utf8'));
if (!unrel.includes('Ardem')) { unrel.push('Ardem'); console.log('unreleased +Ardem'); }
fs.writeFileSync(path.join(dir, 'bili-unreleased.json'), JSON.stringify(unrel, null, 1));

const mature = JSON.parse(fs.readFileSync(path.join(dir, 'bili-mature.json'), 'utf8'));
if (mature['战双帕弥什'] !== '是') { mature['战双帕弥什'] = '是'; console.log('mature +战双帕弥什'); }
fs.writeFileSync(path.join(dir, 'bili-mature.json'), JSON.stringify(mature, null, 1));
console.log('done → 重跑: node tools\\import_bilibili_rank.js data\\tmp-bili-rank-0811.json 2026-08-11');
