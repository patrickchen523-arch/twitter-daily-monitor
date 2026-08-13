/* 2026-08-12 B站人工修正：overrides 13 条 + mature +3，改完重跑 import_bilibili_rank.js */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'data', 'launched');

const ovr = JSON.parse(fs.readFileSync(path.join(dir, 'bili-overrides.json'), 'utf8'));
const add = {
  // 非游戏/归属无法确定 → 整条剔除
  'BV1uXuo6iEhH': 'EXCLUDE',   // rank50 "游戏玩家七宗罪"（误中"万物皆可游戏"，非单一游戏）
  'BV1SMuo6iE6i': 'EXCLUDE',   // rank65 "江湖不见"感慨向（FPS/吃鸡标签混杂，归属无法确定）
  'BV1U3uo6eE4z': 'EXCLUDE',   // rank86 新三国only展vlog（影视内容，非游戏）
  'BV1ANuZ6tEez': 'EXCLUDE',   // rank98 "我愛你"剪辑（MOBA标签混杂，归属无法确定）
  // 频次/词典误中 → 指正
  'BV1Hmuv68EWW': '影之刃零',   // rank2 误中甄子丹；影之刃零预购实机预告
  'BV171gG64EHq': '影之刃零',   // rank79 误中甄子丹；影之刃零印象评测
  'BV17cuB6bE1n': '阴阳师',     // rank12 误中RPG；阴阳师×Vsinger联动
  'BV1WouC6xEUG': '影之刃零',   // rank87 误中RPG；IGN影之刃零实机预告
  'BV1y1uq6zEud': '异环',       // rank19 误中"异环残虹"(角色名)；异环残虹角色PV
  'BV1Biui6oEwb': '星际争霸2',  // rank20 误中战术；DogCraft星际2残局
  'BV16yu965EDq': 'The Hust Banhmi', // rank41 误中"越南河粉摊"(中文译名)
  'BV14guR64EkG': '穿越火线',   // rank61 误中CF全能纪元(活动名)
  'BV1iCuL6hEzS': '午夜轮班',   // rank83 误中狼二哈子(UP主)；午夜轮班二创
  'BV1R7ud66ET2': '三角洲行动'  // rank88 误中"猛攻三角洲裂变新赛季"(赛季名)
};
let n = 0;
for (const [k, v] of Object.entries(add)) { if (!ovr[k]) { ovr[k] = v; n++; } }
fs.writeFileSync(path.join(dir, 'bili-overrides.json'), JSON.stringify(ovr, null, 1));
console.log('overrides +', n, '总', Object.keys(ovr).length);

const mature = JSON.parse(fs.readFileSync(path.join(dir, 'bili-mature.json'), 'utf8'));
for (const g of ['阴阳师', '星际争霸2', '热血传奇']) {
  if (mature[g] !== '是') { mature[g] = '是'; console.log('mature +' + g); }
}
fs.writeFileSync(path.join(dir, 'bili-mature.json'), JSON.stringify(mature, null, 1));
console.log('done → 重跑: node tools\\import_bilibili_rank.js data\\tmp-bili-rank-0812.json 2026-08-12');
