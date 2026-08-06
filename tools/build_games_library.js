// Excel 候选池 -> data/games-library.json
// 输入: %TEMP%\gamelib_rows.json (由 xlsx 解包解析得到)
const fs = require('fs');
const path = require('path');

const rows = JSON.parse(fs.readFileSync(process.env.TEMP + '\\gamelib_rows.json', 'utf8'));
const [, ...data] = rows;

const num = v => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
};
const int = v => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const text = v => {
  const s = String(v == null ? '' : v).trim();
  return s || null;
};
const cleanNum = v => { // 数字垃圾字段视为空
  const s = text(v);
  return s && /^\d+$/.test(s) ? null : s;
};
const list = v => {
  const s = text(v);
  if (!s) return [];
  try {
    const arr = JSON.parse(s);
    return Array.isArray(arr) ? arr.map(String) : [s];
  } catch (e) {
    return [s];
  }
};
const serialToDate = v => {
  const n = num(v);
  if (!n) return null;
  const ms = Math.round(n) * 86400000 + Date.UTC(1899, 11, 30);
  const d = new Date(ms);
  return d.toISOString().slice(0, 10);
};

const games = data.map(r => ({
  name: text(r[0]),
  name_cn: cleanNum(r[1]),
  source: text(r[2]),
  rating: num(r[3]),
  release_month: text(r[4]),
  appid: text(r[5]),
  rating_raw: num(r[6]),
  reviews: int(r[7]),
  pcu_peak: int(r[8]),
  award: cleanNum(r[11]),
  first_release: serialToDate(r[14]),
  release_date: serialToDate(r[15]),
  grade: text(r[16]),
  publisher: list(r[17]),
  developer: list(r[18]),
  est_sales: int(r[19]),
  est_revenue: int(r[20]),
  steam: text(r[21]),
  reason: text(r[24])
})).filter(g => g.name);

// 中文名补全：官方译名优先，缺失的意译/音译
const CN_PATCH = {
  "Endacopia": "恩达科皮亚",
  "Cats and Seek: Dino Park": "猫咪捉迷藏：恐龙公园",
  "LOK Digital": "LOK 数字版",
  "Love Sucks: Night Two": "恋爱烂透了：第二夜",
  "Judero": "朱德罗",
  "Anthology Of The Killer": "杀手选集",
  "Schedule I": "一级管制",
  "Balatro": "小丑牌",
  "Crime Scene Cleaner": "犯罪现场清洁工",
  "The Artisan of Glimmith": "格里米斯工匠",
  "NUKITASHI 2": "拔作岛2",
  "MULLET MADJACK": "疯狂鱼头杰克",
  "Garbanzo Quest": "鹰嘴豆大冒险",
  "A Building Full of Cats 2": "满楼猫咪2",
  "A Shelter Full of Cats": "猫咪收容所",
  "Tactical Breach Wizards": "战术破门巫师",
  "Crow Country": "乌鸦国度",
  "MOLE": "鼹鼠",
  "Echo Point Nova": "回音新星",
  "Budgie's Bug Shop": "虎皮鹦鹉虫虫店",
  "Forbidden Solitaire": "禁忌纸牌",
  "Until Then": "直到那时",
  "PIGFACE": "猪脸",
  "Fallen Aces": "堕落王牌",
  "Captain Wayne - Vacation Desperation": "韦恩船长：绝望假期",
  "Lost Wiki: Kozlovka": "失落维基：科兹洛夫卡",
  "From Glory To Goo": "从荣耀到黏液",
  "SNØ: Ultimate Freeriding": "雪境：极限自由滑",
  "Yasuke Simulator": "弥助模拟器",
  "Tiny Glade": "林间小世界",
  "R.E.P.O.": "回收行动",
  "Sledding Game": "雪橇游戏",
  "HENPRI": "亨普里",
  "Beyond Citadel": "堡垒之外",
  "Hades II": "哈迪斯2",
  "ANIMAL WELL": "动物井",
  "Thank Goodness You're Here!": "谢天谢地你来了！",
  "Clair Obscur: Expedition 33": "光与影：33号远征队",
  "Cast n Chill": "垂钓小憩",
  "Species: Unknown": "物种：未知",
  "Slime Rancher 2": "史莱姆牧场2",
  "Romantic Escapades": "浪漫奇遇",
  "Botany Manor": "植物庄园",
  "GOOOOOOAL!": "进球！！！",
  "PEAK": "巅峰",
  "UFO 50": "飞碟50",
  "Caves of Qud": "库德洞窟",
  "1000xRESIST": "千倍抵抗",
  "despelote": "踢球时光",
  "News Tower": "新闻大厦",
  "Mortal Sin": "凡人之罪",
  "Beltmatic": "传送带工坊",
  "Neva": "涅瓦",
  "Vampire Therapist": "吸血鬼治疗师",
  "Cryptmaster": "地穴之主",
  "Kind Words 2 (lofi city pop)": "暖心话语2",
  "Consume Me": "吞噬我",
  "Llamasoft: The Jeff Minter Story": "拉玛软件：杰夫·明特传奇",
  "Hollow Knight: Silksong": "空洞骑士：丝之歌",
  "Harold Halibut": "哈罗德·哈利巴",
  "Waterpark Simulator": "水上乐园模拟器"
};
for (const g of games) {
  if (!g.name_cn && CN_PATCH[g.name]) g.name_cn = CN_PATCH[g.name];
}

// 口径：好评率以「原始库好评率」为准；缺失或非法(>100)时回退 SteamDB 列
for (const g of games) {
  let r = g.rating_raw;
  if (r == null || r > 100) r = g.rating;
  if (r != null && r > 100) r = null;
  g.rating = r;
}

games.sort((a, b) => (b.rating || 0) - (a.rating || 0));

const out = {
  updated: '2026-08-04',
  source_file: '2024-2026_独立游戏候选池_好评率90%以上或官方获奖_2026-08-04.xlsx',
  count: games.length,
  games
};

// 合并 appid/封面补丁(fetch_missing_appids.js 产物)
const patchPath = path.join(__dirname, '..', 'data', 'games-appid-patch.json');
if (fs.existsSync(patchPath)) {
  const patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'));
  for (const g of games) {
    const p = patch[g.name];
    if (!p) continue;
    if (!g.appid && p.appid) g.appid = p.appid;
    if (p.cover) g.cover = p.cover;
    if (p.release_date) g.release_date = p.release_date;
  }
}

// 合并 Steam 标签(fetch_steam_tags.js 产物)
const tagsPath = path.join(__dirname, '..', 'data', 'games-tags.json');
if (fs.existsSync(tagsPath)) {
  const tagMap = JSON.parse(fs.readFileSync(tagsPath, 'utf8'));
  for (const g of games) {
    const t = tagMap[g.appid];
    if (t && t.length) g.tags = t;
  }
}

const dest = path.join(__dirname, '..', 'data', 'games-library.json');
fs.writeFileSync(dest, JSON.stringify(out, null, 1), 'utf8');
console.log('written', dest, 'games:', games.length);
console.log('with award:', games.filter(g => g.award).length);
console.log('with cn name:', games.filter(g => g.name_cn).length);
