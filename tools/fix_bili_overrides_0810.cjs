/* 08-10 B站榜人工修正：overrides(BV) + mature 增补 + unreleased 增补 */
const fs = require('fs');
const path = require('path');
const D = p => path.join(__dirname, '..', 'data', 'launched', p);

const ovPath = D('bili-overrides.json');
const ov = JSON.parse(fs.readFileSync(ovPath, 'utf8'));
Object.assign(ov, {
  'BV1Unub69EpX': 'EXCLUDE',   // 发烧梗： meme 视频，非具体游戏
  'BV1vtMy63E4G': '绝地求生',   // PUBG鸡斯卡2026 颁奖内容
  'BV1h8uG6CEN5': 'EXCLUDE',   // 雅诗兰黛广告
  'BV1eVuh6TEBG': 'EXCLUDE',   // 自学五天自制demo，非发行游戏
  'BV1RgM16rEe6': '异环',       // 异环·残虹 角色短片（未上线→观测区）
  'BV1xCuN6QEfz': 'EXCLUDE',   // "战争"标签过泛，无法定位游戏
  'BV1qCu46cEjc': 'Mermaid',   // 美人鱼逃脱模拟器 = Mermaid
  'BV1ffuU6bEHj': '和平精英',   // 刺激之夜回放
  'BV17PuK6TEur': 'EXCLUDE',   // 拍卖大赛，无法定位具体游戏
  'BV1mhuh6REPj': 'EXCLUDE',   // 十二星座： ASMR怪谈内容，非游戏
  'BV1Btuu67EA2': '光与夜之恋', // 全新活动PV
  'BV1eCuV6XEga': '穿越火线',   // CF IP嘉年华
  'BV1PvuQ6CEwK': '穿越火线',   // 穿越火线：潜伏 对话
  'BV1oKuM6CE67': 'EXCLUDE',   // 万物皆可游戏： 泛标签
  'BV1wSux6MEtV': '三角洲行动', // 猛攻三角洲裂变新赛季
  'BV15ku16yEEG': 'EXCLUDE',   // Roblox 平台内容（已有专属周榜）
  'BV1KQun6hEmZ': 'VRChat',    // Pingu VRChat 整活
  'BV1Mfum6rEB9': '群星',       // Stellaris 群星
  'BV1AmGc6VEqo': 'EXCLUDE',   // VR 集锦混剪
  'BV1Boux6aEy1': '无畏契约'    // 炼狱/无畏契约三周年
});
fs.writeFileSync(ovPath, JSON.stringify(ov, null, 1));

const matPath = D('bili-mature.json');
const mat = JSON.parse(fs.readFileSync(matPath, 'utf8'));
for (const g of ['和平精英', '崩坏3', '光与夜之恋', '穿越火线', '绝地求生']) mat[g] = '是';
fs.writeFileSync(matPath, JSON.stringify(mat, null, 1));

const unPath = D('bili-unreleased.json');
const un = JSON.parse(fs.readFileSync(unPath, 'utf8'));
if (!un.includes('异环')) un.push('异环');
fs.writeFileSync(unPath, JSON.stringify(un, null, 1));

console.log('overrides:', Object.keys(ov).length, '| mature:', Object.keys(mat).length, '| unreleased:', un.join(','));
