// B站游戏区日榜导出 -> 上线日推 bilibili 板块(按关联游戏聚合)
// 用法: node tools/import_bilibili_rank.js <bili-rank.json路径> [日期]
// 规则要点:
//  - 每条视频须明确关联"一个具体游戏"才收录;新闻合集/多游戏盘点/非游戏内容(围棋/短剧/影视)剔除
//  - 游戏名从视频标签提取: 词典命中 > 激励计划前缀 > 频次;公司名/UP主名/玩法词黑名单
const fs = require('fs');
const path = require('path');

const srcPath = process.argv[2];
const date = process.argv[3] || '2026-08-05';
if (!srcPath) { console.error('usage: node import_bilibili_rank.js <json> [date]'); process.exit(1); }

const https = require('https');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const getJson = url => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    res.on('error', reject);
  }).on('error', reject);
});

const launchedPath = path.join(__dirname, '..', 'data', 'launched', `${date}.json`);
const src = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
const launched = JSON.parse(fs.readFileSync(launchedPath, 'utf8'));

const BLACKLIST = new Set([
  '游戏视频', '游戏', '搞笑', '娱乐', '多人联机', 'steam', '沙雕', '游戏实况', '推荐宝藏游戏',
  '单机游戏', '单机', '手机游戏', '手游', '网络游戏', '网游', '电子竞技', '电竞', '独立游戏',
  '游戏推荐', '新游', '试玩', '攻略', '实况', '解说', '高能', '自制', '原创', '游戏资讯',
  '主机游戏', 'ps5', 'switch', 'xbox', 'pc游戏', 'b站', '哔哩哔哩', 'bilibili', '游戏区',
  'gmv', 'cg', '预告', '宣传片', '版本更新', '直播', '回放', '录播', '整活', '鬼畜',
  '动画', '短片', '手书', '配音', '中配', '中文', '汉化', 'mod', '免费游戏', '喜加一',
  'epic', '游戏鉴赏家', '必玩', '派对游戏', '角色扮演', '动作游戏', '射击游戏', '生存游戏',
  '模拟经营', '开放世界', 'roguelike', 'roguelite', '恐怖游戏', '恐怖', '解谜', '剧情',
  '像素', '像素风', '2d', '3d', '合作', '联机', '多人', '单人', '休闲', '竞技', '吃鸡', 'moba',
  '搜打撤', '吃打撤', '类魂', '银河战士恶魔城', '肉鸽', '卡牌', '卡牌游戏', '回合制', '策略',
  '战棋', '竞速', '音游', '放置', '挂机', '修仙', '武侠', '二次元', 'galgame', '视觉小说',
  '文字冒险', '恋爱模拟', '养成', '换装', '麻将', '棋牌', '桌游棋牌', '沙盒', '沙盒游戏', 'fps', 'tps',
  '模拟器', '模拟', '治愈系', '可爱', '冒险', '动作', '射击', '格斗', '格斗游戏', '生存',
  '内测', '公测', '测试', '开服', '预约', '上线', '发售', '买断制', '免费', '端游', '页游',
  '游戏杂谈', '游戏解说', '影视剪辑', '第一视角', '短剧', '电子榨菜', '惊悚', '逆天小游戏',
  '小游戏', '比赛', '童年', '自制游戏', '日常', '助眠', '教程攻略', 'steam游戏', '怪谈',
  '都市传说', 'reaction', '网站', '决斗场', '打野', '键盘', '磁轴键盘', '小游戏合集',
  '游戏音乐', '交响乐', '吐槽', '情怀游戏', '阴间boss', '打boss', '解压', '神操作', '抽象',
  // 公司/平台(非游戏名)
  '米哈游', 'mihoyo', '鹰角网络', '鹰角', '腾讯游戏', '腾讯', '网易游戏', '网易', '叠纸',
  '莉莉丝', '库洛', '西山居', '蛮啾', '散爆', '卡普空', 'ea', '育碧', '世嘉', '暴雪',
  '索尼', '任天堂', '万代', '光荣', 'konami', 'steamdeck',
  // UP主/主播/选手/硬件
  '老番茄', '某幻', '某幻君', '纸鱼', '薄海纸鱼', '王老菊', '罗太', '萝太', '萝太永不破防',
  '小白云', '与山0v0', '是橘长呀', '高子巷', '黑镖客', '柯洁', 'donk', 'niko', '迈从g87',
  '迈从g87v2', '迈从god60', '迈从god60高端系列磁轴键盘', '爱回收', '爱回收严选',
  // 动漫/影视角色(非本视频游戏)
  '蜘蛛侠', '超人', '祖国人', '海绵', '海绵宝宝', '派大星',
  // 其他噪声
  '音乐现场', '战友', '野排队友', '黄金精神', '核电站', 'cs', '围棋', '柯洁神之一手',
  '拧不动啊真拧不动', '三国杀移动版激励计划'
].map(s => s.toLowerCase()));

const BAD_SUFFIX = ['激励计划', '创作者激励', '二创', '同人', 'cosplay', '周年', '周年庆', '嘉年华',
  '现场', '一集', '首曝', '直播', '测试', '招募', '公测', '联动', '活动', '赏金赛', '应援计划',
  '高能团', '欢乐剧场', '杂谈', '严选', '攻略课堂', '攻略', '皮肤'];
const isCleanTag = t => {
  const s = String(t || '').trim();
  if (!s) return false;
  if (BLACKLIST.has(s.toLowerCase())) return false;
  if (BAD_SUFFIX.some(suf => s.includes(suf))) return false;
  return true;
};

// 已知游戏词典: 游戏库(中英文名) + 主流游戏补充
const libGames = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'games-library.json'), 'utf8')).games;
const DICT = new Set();
for (const g of libGames) {
  if (g.name) DICT.add(g.name);
  if (g.name_cn) {
    DICT.add(g.name_cn);
    const m = String(g.name_cn).match(/^[\u4e00-\u9fa5：:!?·\d]+/);
    if (m && m[0].length >= 2) DICT.add(m[0]);
  }
}
['原神', '崩坏：星穹铁道', '绝区零', '崩坏3', '明日方舟', '明日方舟终末地', '三角洲行动', '英雄联盟',
 '王者荣耀', '和平精英', '我的世界', '植物大战僵尸', '闪耀暖暖', '无限暖暖', '恋与深空', '第五人格',
 '永劫无间', '无畏契约', '反恐精英2', '黑神话：悟空', '逆水寒', '燕云十六声', '蛋仔派对', '光·遇',
 '火影忍者手游', '金铲铲之战', '暗区突围', '穿越火线', '绝地求生', '命运方舟', '流放之路2', '幻兽帕鲁',
 '雾海之下', '元梦之星', '香肠派对', '炉石传说', 'DOTA2', '守望先锋', '剑网3', '最终幻想14',
 '鸣潮', '皇室战争', '遗忘之海', '命运-冠位指定', '赛尔号巅峰之战', '机械狂欢', '蔚蓝档案',
 '海上60s', '海哥河粉店', '灵异论坛调查记录', '八尺大人', '执政官之魂', '星露谷物语', '重生细胞',
 '使命召唤'
].forEach(n => DICT.add(n));

const ALIAS = {
  'cs2': '反恐精英2', 'lol': '英雄联盟', 'fgo': '命运-冠位指定', '崩铁': '崩坏：星穹铁道',
  '火影手游': '火影忍者手游', '火影忍者': '火影忍者手游', '崩坏星穹铁道': '崩坏：星穹铁道',
  '三角洲': '三角洲行动', 'wzry': '王者荣耀', '原神至冬': '原神',
  'minecraft': '我的世界', 'mc': '我的世界', '三角洲手游': '三角洲行动',
  'cod': '使命召唤', '使命召唤手游': '使命召唤'
};
const DICT_LOW = new Map([...DICT].map(d => [d.toLowerCase(), d]));

function canon(t) {
  const s = String(t || '').trim();
  const low = s.toLowerCase();
  if (ALIAS[low]) return ALIAS[low];
  if (DICT_LOW.has(low)) return DICT_LOW.get(low);
  // 词典名是标签前缀时归一(原神哥伦比娅->原神);词典名在中间/结尾不归并(赛尔号巅峰之战≠巅峰)
  const hits = [...DICT].filter(d => d.length >= 2 && s.startsWith(d));
  return hits.length ? hits.sort((a, b) => b.length - a.length)[0] : s;
}

// 激励计划/高能团等前缀提取游戏名: "绝区零UP主激励计划" -> "绝区零"
const PREFIX_RE = /^(.{2,20}?)(?:UP主)?(?:创作者)?(?:激励计划|应援计划|高能团|欢乐剧场|激励)$/;
function prefixGame(t) {
  const m = String(t || '').match(PREFIX_RE);
  if (!m) return null;
  const p = m[1].trim();
  return p.length >= 2 && isCleanTag(p) ? p : null;
}

function parseViews(state) {
  const m = String(state || '').match(/([\d.]+)\s*万/);
  if (m) return m[1] + '万';
  const n = String(state || '').match(/(\d[\d,]*)/);
  return n ? n[1] : '';
}

// 同视频子串去重: 词典精确名的短标签吃掉修饰性长标签(三角洲行动 吃掉 安澜三角洲行动);都非词典名时保留最长
function dedup(cands) {
  const isDictName = t => DICT_LOW.has(t.toLowerCase()) || ALIAS[t.toLowerCase()];
  const dropped = new Set();
  for (const t of cands) {
    for (const o of cands) {
      if (o === t || !o.includes(t)) continue;
      if (isDictName(t)) { if (!isDictName(o)) dropped.add(o); }
      else dropped.add(t);
    }
  }
  return cands.filter(t => !dropped.has(t));
}

// 1. 每条视频提取规范化候选游戏
const skipped = [];
for (const it of src.items) {
  const raw = (it.tags || []).map(t => String(t).replace(/^#+/, '').trim()).filter(Boolean);
  let cands = raw.filter(isCleanTag).map(t => ({ t, viaPrefix: false }));
  for (const t of raw) {
    const p = prefixGame(t);
    if (p && !cands.some(c => c.t === p)) cands.push({ t: p, viaPrefix: true });
  }
  cands = dedup(cands.map(c => c.t)).map(t => {
    const via = cands.find(c => c.t === t).viaPrefix;
    const g = canon(t);
    return { tag: t, game: g, inDict: DICT_LOW.has(g.toLowerCase()), viaPrefix: via };
  });
  // 新闻/资讯/快报类视频直接剔除
  if (/快报|资讯|新闻|周报|盘点|合集/.test(it.title)) {
    it.games = [];
    it.skipReason = '剔除-新闻资讯合集';
    skipped.push(`NEWS #${it.rank} ${it.title}`);
    continue;
  }
  // 多游戏盘点: 命中3个及以上不同词典游戏 -> 剔除
  const dictHitsRaw = [...new Set(cands.filter(c => c.inDict && !c.viaPrefix).map(c => c.game))];
  // 同系列归并(明日方舟 ⊂ 明日方舟终末地 算一个)
  const dictHits = dictHitsRaw.filter(t => !dictHitsRaw.some(o => o !== t && o.includes(t)));
  if (dictHits.length >= 2) {
    it.games = [];
    it.skipReason = '剔除-多游戏盘点';
    skipped.push(`MULTI #${it.rank} ${it.title} [${dictHits.join(',')}]`);
    continue;
  }
  it.games = cands;
}

// 2. 全局频次(按规范化游戏名)
const freq = {};
for (const it of src.items) {
  for (const c of it.games || []) freq[c.game] = (freq[c.game] || 0) + 1;
}

// 人工修正表: data/launched/bili-overrides.json {"BV号": "正确游戏名"}
const overridePath = path.join(__dirname, '..', 'data', 'launched', 'bili-overrides.json');
const OVERRIDES = fs.existsSync(overridePath) ? JSON.parse(fs.readFileSync(overridePath, 'utf8')) : {};

// 3. 每条视频选定唯一游戏: 人工修正 > 词典命中 > 频次 > 标签序
const games = {};
(async () => {
for (const it of src.items) {
  let game = null;
  if (OVERRIDES[it.bvid] === 'EXCLUDE') {
    it.skipReason = '剔除-人工复核(非单一游戏内容)';
    continue;
  }
  if (OVERRIDES[it.bvid]) {
    game = OVERRIDES[it.bvid];
    it.reportVia = '人工修正';
  } else {
    const cands = it.games || [];
    if (!cands.length) continue;
    const score = c => c.inDict ? (c.viaPrefix ? 1 : 2) : 0;
    cands.sort((a, b) =>
      (score(b) - score(a)) ||
      ((freq[b.game] || 0) - (freq[a.game] || 0)) ||
      (it.tags.indexOf(a.tag) - it.tags.indexOf(b.tag)));
    game = cands[0].game;
    it.reportVia = cands[0].inDict ? '词典标签' : (cands[0].viaPrefix ? '激励计划前缀' : '频次标签');
  }
  it.reportGame = game;
  if (!games[game]) {
    games[game] = { name: game, rank: it.rank, count: 0, sub: it.title, thumb: it.cover ? 'https:' + it.cover.replace(/@.*$/, '') : null, link: `https://www.bilibili.com/video/${it.bvid}/` };
  }
  games[game].count++;
  if (it.rank < games[game].rank) {
    games[game].rank = it.rank;
    games[game].sub = it.title;
    games[game].thumb = it.cover ? 'https:' + it.cover.replace(/@.*$/, '') : null;
    games[game].link = `https://www.bilibili.com/video/${it.bvid}/`;
  }
}

// 4. 零候选视频: 标题精确匹配 Steam 游戏兜底(如"完蛋！我被男同学包围了")
const normName = s => String(s || '').toLowerCase().replace(/[^\w\u4e00-\u9fa5]/g, '');
const noCand = src.items.filter(it => !(it.games && it.games.length) && !OVERRIDES[it.bvid]
  && !/快报|资讯|新闻|周报|盘点|合集/.test(it.title));
console.log('零候选视频,尝试 Steam 标题匹配:', noCand.length);
for (const it of noCand) {
  try {
    const res = await getJson(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(it.title)}&cc=cn&l=schinese`);
    const hit = (res.items || []).find(x => normName(x.name) === normName(it.title));
    if (!hit) continue;
    const detail = await getJson(`https://store.steampowered.com/api/appdetails?appids=${hit.id}`);
    const dd = detail[String(hit.id)];
    games[hit.name] = {
      name: hit.name,
      rank: it.rank,
      count: 1,
      sub: it.title,
      thumb: (dd && dd.success && dd.data && dd.data.header_image) || (it.cover ? 'https:' + it.cover.replace(/@.*$/, '') : null),
      link: `https://store.steampowered.com/app/${hit.id}/`
    };
    it.reportGame = hit.name;
    it.reportVia = 'Steam标题匹配';
    console.log(`  HIT #${it.rank} ${it.title} -> ${hit.name} (${hit.id})`);
  } catch (e) { /* 忽略单条失败 */ }
  await sleep(300);
}

// 5. 解析上线/测试时间: 人工日期表 > 游戏库 > Steam 搜索;新游(近12个月)优先排序
const DATE_OVERRIDES_PATH = path.join(__dirname, '..', 'data', 'launched', 'bili-dates.json');
const DATE_OVERRIDES = fs.existsSync(DATE_OVERRIDES_PATH) ? JSON.parse(fs.readFileSync(DATE_OVERRIDES_PATH, 'utf8')) : {};
const libByName = {};
for (const g of libGames) {
  if (g.name) libByName[normName(g.name)] = g;
  if (g.name_cn) {
    libByName[normName(g.name_cn)] = g;
    const m = String(g.name_cn).match(/^[\u4e00-\u9fa5：:!?·\d]+/);
    if (m && m[0].length >= 2) libByName[normName(m[0])] = g;
  }
}
function parseCnDate(s) {
  const m = String(s || '').match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  return m ? `${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}` : null;
}
async function resolveReleaseDate(name) {
  if (DATE_OVERRIDES[name]) return DATE_OVERRIDES[name];
  const lib = libByName[normName(name)];
  if (lib && lib.release_date) return lib.release_date;
  try {
    const res = await getJson(`https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(name)}&cc=cn&l=schinese`);
    const hit = (res.items || []).find(x => normName(x.name) === normName(name));
    if (hit) {
      const detail = await getJson(`https://store.steampowered.com/api/appdetails?appids=${hit.id}&l=schinese`);
      const dd = detail[String(hit.id)];
      const rd = dd && dd.success && dd.data && dd.data.release_date;
      if (rd) {
        if (rd.coming_soon) return '9999-12-31'; // 未上线(首曝/测试)算新
        let iso = parseCnDate(rd.date);
        if (!iso) { // 英文格式 "Jul 30, 2026"
          const t = Date.parse(rd.date);
          if (!Number.isNaN(t)) iso = new Date(t).toISOString().slice(0, 10);
        }
        if (iso) return iso;
      }
    }
  } catch (e) {}
  await sleep(250);
  return null;
}
// 5. 机会分: 当前热度(最高50) + 新鲜度(最高30) + 热度异动(最高20); 成熟游戏沉底
const TODAY = new Date();
const TODAY_STR = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, '0')}-${String(TODAY.getDate()).padStart(2, '0')}`;
const dayDiff = iso => Math.floor((new Date(TODAY_STR) - new Date(iso)) / 86400000);

const MATURE_PATH = path.join(__dirname, '..', 'data', 'launched', 'bili-mature.json');
const MATURE = fs.existsSync(MATURE_PATH) ? JSON.parse(fs.readFileSync(MATURE_PATH, 'utf8')) : {};
const HISTORY_PATH = path.join(__dirname, '..', 'data', 'launched', 'bili-history.json');
const HISTORY = fs.existsSync(HISTORY_PATH) ? JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8')) : {};
const prevDates = Object.keys(HISTORY).filter(d => d < TODAY_STR).sort();

const rankScore = r => r <= 10 ? 40 : r <= 30 ? 32 : r <= 60 ? 22 : 12;
const countScore = c => c >= 3 ? 10 : c === 2 ? 6 : 0;
const freshScoreOf = rel => {
  if (!rel) return 0;
  const days = rel === '9999-12-31' ? 0 : dayDiff(rel);
  return days <= 30 ? 30 : days <= 90 ? 22 : days <= 180 ? 12 : 0;
};
function moveScoreOf(name, rank) {
  if (!prevDates.length) return { s: 0, note: '' }; // 首日无历史数据
  const last = HISTORY[prevDates[prevDates.length - 1]];
  const seen = prevDates.filter(d => HISTORY[d][name] != null);
  if (!seen.length) return { s: 20, note: '首次上榜' };
  const lastSeen = seen[seen.length - 1];
  if (last[name] == null && dayDiff(lastSeen) >= 14) return { s: 20, note: '重新上榜' };
  const prevRank = last[name] != null ? last[name] : HISTORY[lastSeen][name];
  const rise = prevRank - rank;
  if (rise >= 20) return { s: 15, note: `上升${rise}名` };
  if (rise >= 10) return { s: 8, note: `上升${rise}名` };
  return { s: 0, note: '' };
}

const gameList = Object.values(games);
for (const g of gameList) {
  const rel = await resolveReleaseDate(g.name);
  g.release = rel;
  g.mature = MATURE[g.name] === '是';
  g.freshScore = freshScoreOf(rel);
  g.fresh = rel ? (rel === '9999-12-31' || dayDiff(rel) <= 7) : false; // 图章"新"= 近7天上线/公布
  const mv = moveScoreOf(g.name, g.rank);
  g.moveScore = mv.s;
  g.moveNote = mv.note;
  g.heatScore = rankScore(g.rank) + countScore(g.count || 1);
  g.score = g.heatScore + g.freshScore + g.moveScore;
  if (!rel) console.log('  未知上线时间(新鲜度0):', g.name);
}
gameList.sort((a, b) => {
  if (a.mature !== b.mature) return a.mature ? 1 : -1;
  if (a.mature) return a.rank - b.rank;
  return (b.score - a.score) || (b.moveScore - a.moveScore) || (b.freshScore - a.freshScore) || (a.rank - b.rank) || (b.count - a.count);
});

// 写历史快照(供次日计算热度异动)
HISTORY[TODAY_STR] = Object.fromEntries(gameList.map(g => [g.name, g.rank]));
fs.writeFileSync(HISTORY_PATH, JSON.stringify(HISTORY, null, 1), 'utf8');

// 未上线游戏(9999 标记或人工名单)不进榜单,挪未上线观测区
const UNREL_PATH = path.join(__dirname, '..', 'data', 'launched', 'bili-unreleased.json');
const UNREL = fs.existsSync(UNREL_PATH) ? JSON.parse(fs.readFileSync(UNREL_PATH, 'utf8')) : [];
const isUnrel = g => g.release === '9999-12-31' || UNREL.includes(g.name);
const unreleased = gameList.filter(isUnrel);
const releasedList = gameList.filter(g => !isUnrel(g));
if (unreleased.length) {
  launched.watch = launched.watch || { featured: [], calendar: [] };
  launched.watch.featured = launched.watch.featured || [];
  for (const g of unreleased) {
    if (MATURE[g.name] === '是') continue; // 成熟/网易游戏不进观测区
    if (!launched.watch.featured.some(w => w.name === g.name)) {
      launched.watch.featured.push({
        name: g.name,
        date: '已公布/测试阶段',
        note: `B站游戏区热门榜最高 ${g.rank} 名 · 尚未正式上线`,
        cover: g.thumb,
        link: g.link
      });
    }
  }
  console.log('未上线->观测区:', unreleased.map(g => g.name).join(', '));
}

const items = releasedList.map(g => ({
  name: g.name,
  metric: `最高${g.rank}名`,
  sub: `${g.sub} · 机会分${g.score}${g.moveNote ? `(${g.moveNote})` : ''}`,
  thumb: g.thumb,
  link: g.link,
  fresh: g.fresh,
  release: g.release,
  mature: g.mature || undefined
}));

const board = launched.boards.find(b => b.id === 'bilibili');
if (board) {
  board.title = 'B站游戏区热门排行榜';
  board.title_en = 'BILIBILI HOT 100';
  board.demo = false;
  board.items = items;
  board.more = { label: '查看完整榜单', href: 'https://www.bilibili.com/v/popular/rank/game' };
}
fs.writeFileSync(launchedPath, JSON.stringify(launched, null, 1), 'utf8');
console.log('bilibili board updated, total games:', items.length);
gameList.forEach((g, i) => console.log(`${String(i + 1).padStart(2)}. ${g.mature ? '[成熟]' : '      '}${g.name} 机会分${g.score} (热度${g.heatScore} 新鲜${g.freshScore} 异动${g.moveScore}${g.moveNote}) 名次${g.rank} 视频${g.count || 1}条`));
console.log('--- skipped videos:', skipped.length);
skipped.forEach(s => console.log(' ', s));

// 全量明细报告(供人工核查)
const report = src.items.map(it => ({
  rank: it.rank,
  title: it.title,
  views: parseViews(it.state),
  game: it.reportGame || '',
  result: it.reportGame ? `收录-${it.reportVia}` : (it.skipReason || '未关联-无有效游戏标签'),
  tags: (it.tags || []).join(' | '),
  bvid: it.bvid,
  link: `https://www.bilibili.com/video/${it.bvid}/`
}));
fs.writeFileSync(path.join(__dirname, '..', 'data', 'launched', `bili-report-${date}.json`), JSON.stringify(report, null, 1), 'utf8');
console.log('report written:', `data/launched/bili-report-${date}.json`);
})();
