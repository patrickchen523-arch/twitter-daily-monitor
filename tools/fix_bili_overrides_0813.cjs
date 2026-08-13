/* 0813期人工修正：
   - BV1Xx411c7cH "下载APP"(弹幕) = 广告垃圾 → EXCLUDE
   - BV1Z3ud6yEFs "在疯狂动物园一把驯服43只新动物" 频次误中"神话" → 疯狂动物园
   - BV1vquC6uEhg "天命人到底是不是大圣？" 频次误中"西游记" → 黑神话：悟空
   - mature 补：黑神话：悟空(2024-08-20) / 明日之后(网易2018-11-06) / 传奇世界(2003经典MMO) / 疯狂动物园(2016休闲) */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'data', 'launched');
const load = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const save = (f, o) => fs.writeFileSync(path.join(dir, f), JSON.stringify(o, null, 1), 'utf8');

const ov = load('bili-overrides.json');
ov['BV1Xx411c7cH'] = 'EXCLUDE';
ov['BV1Z3ud6yEFs'] = '疯狂动物园';
ov['BV1vquC6uEhg'] = '黑神话：悟空';
save('bili-overrides.json', ov);

const ma = load('bili-mature.json');
ma['黑神话：悟空'] = '是';
ma['明日之后'] = '是';
ma['传奇世界'] = '是';
ma['疯狂动物园'] = '是';
save('bili-mature.json', ma);

const da = load('bili-dates.json');
da['黑神话：悟空'] = '2024-08-20';
da['明日之后'] = '2018-11-06';
save('bili-dates.json', da);

console.log('overrides', Object.keys(ov).length, '| mature', Object.keys(ma).length, '| dates', Object.keys(da).length);
