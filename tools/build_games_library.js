// 候选池 -> data/games-library.json
// 输入: CSV (默认 G:\创意部\推送看板＆游戏库\2024-2026_独立游戏候选池.csv, 可用参数覆盖)
const fs = require('fs');
const path = require('path');

const csvPath = process.argv[2] || 'G:\\创意部\\推送看板＆游戏库\\2024-2026_独立游戏候选池.csv';

// 简易 CSV 解析(支持引号包裹与 "" 转义)
function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQ) {
      if (c === '"') {
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(x => x !== '')) rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some(x => x !== '')) rows.push(row); }
  return rows;
}

const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));
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
  const s = text(v);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10); // ISO 字符串
  const n = num(v);
  if (!n) return null;
  const ms = Math.round(n) * 86400000 + Date.UTC(1899, 11, 30); // Excel 序列
  return new Date(ms).toISOString().slice(0, 10);
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
  "Waterpark Simulator": "水上乐园模拟器",
  "Fuck's Quest II": "法克历险记2",
  "Heartreasure: Stellar Journey": "心之宝藏：星际之旅",
  "Cascadia": "卡斯卡迪亚",
  "Hermit and Pig": "隐士与小猪",
  "Blobun": "水滴团团",
  "Star Stuff": "星星工厂",
  "BioMenace Remastered": "生化悍将：复刻版",
  "Break Wolf": "破狼",
  "Go Slimey Go!": "冲吧史莱姆",
  "FIND ALL 8: The road to the Maya": "全民来找茬8：玛雅之路",
  "Siren's Call: Escape Velocity": "塞壬召唤：逃逸速度",
  "Return to Ash": "归于灰烬",
  "GRIDbeat!": "节奏网格",
  "Panthalassa": "盘古深海",
  "Tormentum II": "折磨之境2",
  "Geneforge 2 - Infestation": "基因熔炉2：侵扰",
  "Why do you love me?": "你为什么爱我？",
  "Blood Rush": "热血冲锋",
  "Cell Command": "细胞指令",
  "BLOODSAINT": "血圣徒",
  "Skogdal": "斯科格达尔",
  "Grief like a stray dog": "悲伤如流浪狗",
  "FIND ALL: Valentine's Day 💘💌🍫": "全民来找茬：情人节",
  "Bombun": "炸弹团团",
  "Rhell: Warped Worlds & Troubled Times": "瑞尔：扭曲世界与动荡时代",
  "Kitty Powers' Matchmaker Makeover": "猫咪红娘大改造",
  "Genome Guardian 2": "基因守卫2",
  "GlitchSPANKR": "故障拍击者",
  "Puttler": "推杆小魔王",
  "Phantom Spark": "幻影火花",
  "FIND ALL: Halloween": "全民来找茬：万圣节",
  "Crown Gambit": "王冠棋局",
  "Jupiter Hell Classic": "木星地狱 经典版",
  "WAR RATS: The Rat em Up": "战争鼠辈：鼠潮出击",
  "Super Chipflake Ü: Quest for the Uncooked Schnitzel": "超级脆片Ü：寻回生炸肉排",
  "Caput Mortum": "骷髅余烬",
  "Gladiator Command": "角斗士指挥官",
  "MEMOLOGY 2: OLD TIMES": "梗图学2：旧时光",
  "Tower of Mask": "面具之塔",
  "Bookshop Simulator": "书店模拟器",
  "Sloppy Fields": "邋遢田野",
  "Foolish Mortals": "愚蠢的凡人",
  "The Last Cat in the Universe": "宇宙最后一只猫",
  "Deep Sleep: Labyrinth of the Forsaken": "沉睡：遗落者迷宫",
  "Gloomy Eyes": "忧郁之眼",
  "Bang Average Football – Play, Manage, Create": "平庸足球",
  "Fishbowl": "鱼缸物语",
  "Thunder Spikes Volleyball": "雷霆扣杀排球",
  "Monster College": "怪兽学院",
  "Utopia Must Fall": "乌托邦必须坠落",
  "Lone Fungus: Melody of Spores": "孤独真菌：孢子旋律",
  "Eventide Matter": "暮色物质",
  "DEFRAG": "碎片整理",
  "Sushi Cat Legacy Collection": "寿司猫遗产合集",
  "Penguin Helper": "企鹅小帮手",
  "ODDADA": "奥达达",
  "Decline's Drops": "衰亡之滴",
  "Motordoom": "摩托毁灭",
  "Zerko": "泽尔科",
  "Ark Nova": "方舟动物园",
  "Race of Life - Act 1": "人生竞赛：第一章",
  "Titanium Court": "钛金法庭",
  "Lumines Arise": "音乐方块：崛起",
  "Detective Instinct: Farewell, My Beloved": "侦探直觉：永别吾爱",
  "Swords & Souls Legacy Collection": "剑与魂遗产合集",
  "Million Depth": "百万深渊",
  "Dollmare": "玩偶噩梦",
  "Gun Frog": "持枪青蛙",
  "Diorama Builder": "微缩场景建造者",
  "Koira": "科伊拉",
  "Night Stones": "夜之石",
  "Expelled!": "开除！",
  "Chaos Faction Legacy Collection": "混沌阵营遗产合集",
  "s.p.l.i.t": "分岔",
  "Horripilant": "毛骨悚然",
  "Spiritfall": "灵动坠落",
  "Dead Grid": "死亡网格",
  "S.A.N.D.Y. - Beach Cleaner": "珊迪：海滩清洁工",
  "Path of the Abyss": "深渊之路",
  "The Mildew Children": "霉菌之子",
  "SteamWorld Heist II": "蒸汽世界：大劫掠2",
  "MEMOLOGY: GOYDA": "梗图学：GOYDA",
  "Choice of Life: Wild Islands": "人生抉择：荒野群岛",
  "UNBEATABLE": "不可战胜",
  "Master of Command": "统帅大师",
  "LUNAR Remastered Collection": "露娜 复刻合集",
  "The Necromancer's Tale": "死灵法师传说",
  "ButtKnight": "屁屁骑士",
  "Clank!": "地城夺宝",
  "Planet of Lana II": "拉娜星球2",
  "Riven": "神秘岛2：星空断层",
  "Verho - Curse of Faces": "维尔霍：面孔诅咒",
  "Big Hops": "蹦蹦蛙",
  "Gourdlets": "小葫芦镇",
  "Wizordum": "巫术士",
  "Dice With Death": "与死神掷骰",
  "Ad Fundum": "直达地心",
  "Doll Impostor": "玩偶冒充者",
  "Genome Guardian": "基因守卫",
  "Tangy TD": "酸橙塔防",
  "Execute": "处决",
  "Escape the Backrooms": "逃离后室",
  "FEMBOY FUTA HOUSE": "扶他小屋",
  "How to Make an Atomic Bomb in Your Garden": "如何在后院造原子弹",
  "Those Who Rule": "掌权者",
  "Saloon Simulator": "酒馆模拟器",
  "Laundry Store Simulator": "洗衣店模拟器",
  "YAR: Forgotten Throne": "亚尔：遗忘王座",
  "Car Dealer Simulator": "车行模拟器",
  "Dreamcore": "梦核",
  "Last Hope": "最后希望"
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
  updated: new Date().toISOString().slice(0, 10),
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
    if (!g.name_cn && p.name_cn) g.name_cn = p.name_cn;
    if (!g.pcu_peak && p.pcu_peak) g.pcu_peak = p.pcu_peak;
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
