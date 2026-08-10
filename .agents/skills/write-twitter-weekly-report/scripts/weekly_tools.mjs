#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDir, '..', '..', '..', '..');
const canonicalCategories = ['AI 科技热点', '游戏市场动态', '新游推文'];
const categoryIds = {
  'AI 科技热点': new Set(['ai', 'tools']),
  '游戏市场动态': new Set(['industry']),
  '新游推文': new Set(['indie'])
};

function usage() {
  console.log(`Usage:
  node weekly_tools.mjs inventory <start> <end> [--top N] [--root PATH]
  node weekly_tools.mjs draft <start> <end> [WNN] [--allow-overlap] [--root PATH]
  node weekly_tools.mjs audit [--root PATH]

Dates use YYYY-MM-DD. The default root is the repository containing this Skill.`);
}

function fail(message) {
  console.error(`[ERROR] ${message}`);
  process.exit(1);
}

function parseArgs(args) {
  const positional = [];
  let root = defaultRoot;
  let top = Infinity;
  let allowOverlap = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--root') {
      if (!args[i + 1]) fail('--root requires a path');
      root = path.resolve(args[++i]);
    } else if (args[i] === '--top') {
      const value = Number(args[++i]);
      if (!Number.isInteger(value) || value < 1) fail('--top requires a positive integer');
      top = value;
    } else if (args[i] === '--allow-overlap') {
      allowOverlap = true;
    } else {
      positional.push(args[i]);
    }
  }
  return { positional, root, top, allowOverlap };
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`${file}: ${error.message}`);
  }
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function assertDate(value, label) {
  if (!isIsoDate(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    fail(`${label} must use YYYY-MM-DD`);
  }
}

function calendarDates(start, end) {
  const dates = [];
  const cursor = new Date(`${start}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  while (cursor <= last) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function trimFixed(value, digits) {
  return Number(value.toFixed(digits)).toString();
}

function formatChineseNumber(value) {
  const number = Number(value) || 0;
  if (number >= 100_000_000) return `${trimFixed(number / 100_000_000, 2)}亿`;
  if (number >= 10_000) {
    const scaled = number / 10_000;
    return `${trimFixed(scaled, scaled >= 100 ? 0 : 1)}万`;
  }
  return String(Math.round(number));
}

function normalizeLink(value) {
  try {
    const url = new URL(String(value || ''));
    let host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'twitter.com') host = 'x.com';
    return `${host}${url.pathname.replace(/\/$/, '')}`;
  } catch {
    return String(value || '').trim().replace(/[?#].*$/, '').replace(/\/$/, '');
  }
}

function weeklyCategory(sectionId, sectionTitle) {
  for (const [category, ids] of Object.entries(categoryIds)) {
    if (ids.has(sectionId)) return category;
  }
  return sectionTitle || sectionId || '未分类';
}

function loadInventory(root, start, end) {
  assertDate(start, 'start');
  assertDate(end, 'end');
  if (start > end) fail('start must not be after end');

  const dataDir = path.join(root, 'data');
  const manifest = readJson(path.join(dataDir, 'manifest.json'));
  const expectedDates = calendarDates(start, end);
  const manifestDates = new Set(manifest.dates || []);
  const dates = expectedDates.filter(date => (
    manifestDates.has(date) && fs.existsSync(path.join(dataDir, `${date}.json`))
  ));
  const missingDates = expectedDates.filter(date => !dates.includes(date));

  const candidates = [];
  const totals = { reports: dates.length, signals: 0, views: 0, likes: 0, raw: 0, filtered: 0 };

  for (const date of dates) {
    const report = readJson(path.join(dataDir, `${date}.json`));
    totals.raw += Number(report.meta?.raw_count || 0);
    totals.filtered += Number(report.meta?.filtered_count || report.meta?.prefiltered_count || 0);
    for (const section of report.sections || []) {
      for (let itemIndex = 0; itemIndex < (section.items || []).length; itemIndex += 1) {
        const item = section.items[itemIndex];
        const views = Number(item.views || 0);
        const likes = Number(item.likes || 0);
        const image = item.media?.url || item.enrichment?.header_image || null;
        candidates.push({
          date,
          short_date: date.slice(5).replace('-', '.'),
          weekly_category: weeklyCategory(section.id, section.title),
          section_id: section.id,
          section_title: section.title,
          item_index: itemIndex,
          source: item.source || '',
          title: item.title || '',
          summary: item.summary || '',
          analysis: item.analysis || '',
          author: item.author || '',
          likes,
          views,
          metric_suggestion: `${formatChineseNumber(views)}浏览 · ${formatChineseNumber(likes)}赞`,
          link: item.link || '',
          image
        });
        totals.signals += 1;
        totals.views += views;
        totals.likes += likes;
      }
    }
  }

  const linkGroups = new Map();
  for (const candidate of candidates) {
    const normalized = normalizeLink(candidate.link);
    candidate.normalized_link = normalized;
    const group = linkGroups.get(normalized) || [];
    group.push(candidate);
    if (normalized) linkGroups.set(normalized, group);
  }

  const duplicateLinks = [];
  for (const [normalized, items] of linkGroups) {
    for (const item of items) {
      const sameDay = items.filter(match => match.date === item.date);
      item.link_occurrences = items.length;
      item.same_day_link_occurrences = sameDay.length;
      item.is_runtime_first_match_for_date = sameDay[0] === item;
    }
    if (items.length > 1) {
      duplicateLinks.push({
        normalized_link: normalized,
        link: items[0].link,
        occurrences: items.length,
        dates: [...new Set(items.map(item => item.date))],
        matches: items.map(item => ({
          date: item.date,
          weekly_category: item.weekly_category,
          section_id: item.section_id,
          item_index: item.item_index,
          title: item.title,
          is_runtime_first_match_for_date: item.is_runtime_first_match_for_date
        }))
      });
    }
  }

  return { root, start, end, expectedDates, missingDates, dates, totals, candidates, duplicateLinks };
}

function inventoryOutput(inventory, top) {
  const categories = {};
  const names = [...canonicalCategories, ...new Set(inventory.candidates.map(item => item.weekly_category))];
  for (const name of [...new Set(names)]) {
    const items = inventory.candidates
      .filter(item => item.weekly_category === name)
      .sort((a, b) => b.views - a.views || b.likes - a.likes);
    if (items.length) categories[name] = Number.isFinite(top) ? items.slice(0, top) : items;
  }
  return {
    range: {
      start: inventory.start,
      end: inventory.end,
      expected_dates: inventory.expectedDates,
      dates: inventory.dates,
      missing_dates: inventory.missingDates
    },
    totals: inventory.totals,
    suggested_stats: [
      { value: String(inventory.totals.signals), label: '精选信号' },
      { value: formatChineseNumber(inventory.totals.views), label: '累计浏览' },
      { value: formatChineseNumber(inventory.totals.likes), label: '累计点赞' },
      { value: String(inventory.totals.reports), label: '连续日报' }
    ],
    duplicate_links: inventory.duplicateLinks,
    categories
  };
}

function rangeId(start, end) {
  return start.slice(0, 4) === end.slice(0, 4)
    ? `${start}-to-${end.slice(5)}`
    : `${start}-to-${end}`;
}

function labelDate(date) {
  const [, month, day] = date.split('-').map(Number);
  return `${month}.${day}`;
}

function displayRange(start, end) {
  const startLabel = start.replace(/-/g, '.');
  const endLabel = start.slice(0, 4) === end.slice(0, 4)
    ? end.slice(5).replace('-', '.')
    : end.replace(/-/g, '.');
  return `${startLabel} — ${endLabel}`;
}

function isoWeekCode(dateValue) {
  const date = new Date(`${dateValue}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - yearStart) / 86_400_000) + 1) / 7);
  return `W${String(week).padStart(2, '0')}`;
}

function heatScores(items) {
  if (!items.length) return [];
  const logs = items.map(item => Math.log1p(Math.max(0, item.views)));
  const max = Math.max(...logs);
  const min = Math.min(...logs);
  return items.map((item, index) => {
    const heat = index === 0 || max === min
      ? 100
      : Math.round(20 + 80 * ((logs[index] - min) / (max - min)));
    return { title: item.title, metric: `${formatChineseNumber(item.views)}浏览`, heat, link: item.link };
  });
}

function draftOutput(inventory, code, allowOverlap = false) {
  if (inventory.expectedDates.length !== 7) {
    fail(`A weekly report must cover exactly 7 consecutive dates; received ${inventory.expectedDates.length}`);
  }
  if (inventory.missingDates.length) {
    fail(`Cannot draft an incomplete range; missing daily files: ${inventory.missingDates.join(', ')}`);
  }
  const overlaps = findWeekOverlaps(inventory.root, inventory.start, inventory.end);
  if (overlaps.length && !allowOverlap) {
    fail(`Requested range overlaps existing week(s): ${overlaps.map(week => week.id).join(', ')}. Revise the existing week in place or choose a non-overlapping range.`);
  }
  const resolvedCode = code || isoWeekCode(inventory.end);
  if (!/^W\d{2}$/.test(resolvedCode)) fail('week code must use two digits, such as W29');
  const rankingLinks = new Set();
  const topFive = [...inventory.candidates]
    .sort((a, b) => b.views - a.views || b.likes - a.likes)
    .filter(item => {
      const normalized = normalizeLink(item.link);
      if (!normalized || rankingLinks.has(normalized)) return false;
      rankingLinks.add(normalized);
      return true;
    })
    .slice(0, 5);
  return {
    id: rangeId(inventory.start, inventory.end),
    label: `${labelDate(inventory.start)} - ${labelDate(inventory.end)}`,
    code: resolvedCode,
    range: displayRange(inventory.start, inventory.end),
    title: '',
    stats: inventoryOutput(inventory, Infinity).suggested_stats,
    executive: ['', '', ''],
    rankings: heatScores(topFive),
    signals: Array.from({ length: 3 }, () => ({ title: '', body: '' })),
    sections: canonicalCategories.map(title => ({ title, deck: '', stories: [] })),
    watch: Array.from({ length: 4 }, () => ({ title: '', body: '' }))
  };
}

function parseWeekRange(id) {
  const match = String(id || '').match(/^(\d{4})-(\d{2})-(\d{2})-to-(?:(\d{4})-)?(\d{2})-(\d{2})$/);
  if (!match) return null;
  const start = `${match[1]}-${match[2]}-${match[3]}`;
  let endYear = match[4] || match[1];
  if (!match[4] && `${match[5]}-${match[6]}` < `${match[2]}-${match[3]}`) {
    endYear = String(Number(match[1]) + 1);
  }
  return { start, end: `${endYear}-${match[5]}-${match[6]}` };
}

function findWeekOverlaps(root, start, end) {
  const weeklyFile = path.join(root, 'data', 'twitter-weekly.json');
  if (!fs.existsSync(weeklyFile)) return [];
  const weekly = readJson(weeklyFile);
  return (weekly.weeks || []).filter(week => {
    const range = parseWeekRange(week.id);
    return range && start <= range.end && end >= range.start;
  });
}

function audit(root) {
  const errors = [];
  const warnings = [];
  const error = message => errors.push(message);
  const warn = message => warnings.push(message);
  const requireString = (value, label) => {
    if (typeof value !== 'string' || !value.trim()) error(`${label} must be a non-empty string`);
  };
  const requireCount = (value, count, label) => {
    if (!Array.isArray(value) || value.length !== count) error(`${label} must contain exactly ${count} items`);
  };

  let weekly;
  let manifest;
  try {
    weekly = readJson(path.join(root, 'data', 'twitter-weekly.json'));
    manifest = readJson(path.join(root, 'data', 'manifest.json'));
  } catch (readError) {
    fail(readError.message);
  }

  if (!isIsoDate(weekly.updated)) error('root.updated must use YYYY-MM-DD');
  if (!Array.isArray(weekly.weeks) || !weekly.weeks.length) error('root.weeks must be a non-empty array');

  const cadenceTransitions = weekly.cadence_transitions === undefined ? [] : weekly.cadence_transitions;
  if (!Array.isArray(cadenceTransitions)) error('root.cadence_transitions must be an array when present');
  const allowedTransitionPairs = new Map();
  (Array.isArray(cadenceTransitions) ? cadenceTransitions : []).forEach((transition, index) => {
    const transitionLabel = `cadence_transitions[${index}]`;
    requireString(transition?.from, `${transitionLabel}.from`);
    requireString(transition?.to, `${transitionLabel}.to`);
    requireString(transition?.reason, `${transitionLabel}.reason`);
    if (typeof transition?.from === 'string' && typeof transition?.to === 'string') {
      allowedTransitionPairs.set(`${transition.from}->${transition.to}`, transition.reason);
    }
  });

  const manifestDates = [...new Set(manifest.dates || [])].sort();
  const compatibilityDates = Array.isArray(manifest.reports?.daily?.dates)
    ? [...new Set(manifest.reports.daily.dates)].sort()
    : null;
  if (compatibilityDates && JSON.stringify(manifestDates) !== JSON.stringify(compatibilityDates)) {
    warn('manifest.dates and manifest.reports.daily.dates diverge; runtime uses root manifest.dates');
  }

  const dailyLinks = new Map();
  for (const date of manifestDates) {
    const file = path.join(root, 'data', `${date}.json`);
    if (!fs.existsSync(file)) {
      error(`manifest date has no file: ${date}`);
      continue;
    }
    let report;
    try {
      report = readJson(file);
    } catch (readError) {
      error(readError.message);
      continue;
    }
    for (const section of report.sections || []) {
      for (let itemIndex = 0; itemIndex < (section.items || []).length; itemIndex += 1) {
        const item = section.items[itemIndex];
        const key = normalizeLink(item.link);
        if (!key) continue;
        const matches = dailyLinks.get(key) || [];
        matches.push({ date, sectionId: section.id, itemIndex, item });
        dailyLinks.set(key, matches);
      }
    }
  }

  const seenIds = new Set();
  let previousRange = null;
  let previousWeekId = '';
  for (let weekIndex = 0; weekIndex < (weekly.weeks || []).length; weekIndex += 1) {
    const week = weekly.weeks[weekIndex];
    const label = `weeks[${weekIndex}]`;
    for (const key of ['id', 'label', 'code', 'range', 'title']) requireString(week[key], `${label}.${key}`);
    if (seenIds.has(week.id)) error(`${label}.id is duplicated: ${week.id}`);
    seenIds.add(week.id);
    if (!/^W\d{2}$/.test(week.code || '')) error(`${label}.code must use two digits, such as W29`);

    const parsedRange = parseWeekRange(week.id);
    if (!parsedRange) {
      error(`${label}.id must encode a start and end date`);
    } else {
      if (previousRange && parsedRange.start < previousRange.start) error('weeks must be ordered oldest to newest');
      if (previousRange && parsedRange.start <= previousRange.end) {
        const transitionKey = `${previousWeekId}->${week.id}`;
        if (allowedTransitionPairs.has(transitionKey)) {
          warn(`${label}.id overlaps the previous week under declared cadence transition: ${allowedTransitionPairs.get(transitionKey)}`);
        } else {
          error(`${label}.id overlaps the previous week without a matching cadence transition declaration`);
        }
      }
      previousRange = parsedRange;
      previousWeekId = week.id;
      const rangeDates = calendarDates(parsedRange.start, parsedRange.end);
      if (rangeDates.length !== 7) error(`${label}.id must cover exactly 7 consecutive dates`);
      const missingRangeDates = rangeDates.filter(date => (
        !manifestDates.includes(date) || !fs.existsSync(path.join(root, 'data', `${date}.json`))
      ));
      if (missingRangeDates.length) error(`${label}.id is missing daily files: ${missingRangeDates.join(', ')}`);
    }

    requireCount(week.stats, 4, `${label}.stats`);
    const statLabels = ['精选信号', '累计浏览', '累计点赞', '连续日报'];
    (week.stats || []).forEach((stat, index) => {
      requireString(stat?.value, `${label}.stats[${index}].value`);
      if (stat?.label !== statLabels[index]) error(`${label}.stats[${index}].label must be ${statLabels[index]}`);
    });

    requireCount(week.executive, 3, `${label}.executive`);
    (week.executive || []).forEach((text, index) => requireString(text, `${label}.executive[${index}]`));

    requireCount(week.rankings, 5, `${label}.rankings`);
    let previousHeat = Infinity;
    (week.rankings || []).forEach((ranking, index) => {
      for (const key of ['title', 'metric', 'link']) requireString(ranking?.[key], `${label}.rankings[${index}].${key}`);
      if (typeof ranking?.heat !== 'number' || ranking.heat < 0 || ranking.heat > 100) {
        error(`${label}.rankings[${index}].heat must be a number from 0 to 100`);
      }
      if (ranking?.heat > previousHeat) error(`${label}.rankings heat values must be descending`);
      previousHeat = ranking?.heat;
      const matches = dailyLinks.get(normalizeLink(ranking?.link)) || [];
      const inRange = parsedRange ? matches.some(match => match.date >= parsedRange.start && match.date <= parsedRange.end) : false;
      if (!inRange) error(`${label}.rankings[${index}] does not map to a daily item inside the week`);
    });

    requireCount(week.signals, 3, `${label}.signals`);
    (week.signals || []).forEach((signal, index) => {
      requireString(signal?.title, `${label}.signals[${index}].title`);
      requireString(signal?.body, `${label}.signals[${index}].body`);
    });

    requireCount(week.sections, 3, `${label}.sections`);
    const storyLinks = new Set();
    (week.sections || []).forEach((section, sectionIndex) => {
      const expectedTitle = canonicalCategories[sectionIndex];
      if (section?.title !== expectedTitle) error(`${label}.sections[${sectionIndex}].title must be ${expectedTitle}`);
      requireString(section?.deck, `${label}.sections[${sectionIndex}].deck`);
      requireCount(section?.stories, 4, `${label}.sections[${sectionIndex}].stories`);
      (section?.stories || []).forEach((story, storyIndex) => {
        const storyLabel = `${label}.sections[${sectionIndex}].stories[${storyIndex}]`;
        for (const key of ['date', 'source', 'title', 'summary', 'metric', 'link']) requireString(story?.[key], `${storyLabel}.${key}`);
        if (!/^\d{2}\.\d{2}$/.test(story?.date || '')) error(`${storyLabel}.date must use MM.DD`);
        if (story?.image !== null && typeof story?.image !== 'string') error(`${storyLabel}.image must be a string or null`);
        const normalized = normalizeLink(story?.link);
        if (storyLinks.has(normalized)) error(`${storyLabel}.link is duplicated inside the week`);
        storyLinks.add(normalized);
        const matches = dailyLinks.get(normalized) || [];
        const datedMatches = matches.filter(match => match.date.slice(5).replace('-', '.') === story?.date);
        if (!datedMatches.length) {
          error(`${storyLabel} does not map to a daily item on ${story?.date}`);
          return;
        }
        if (datedMatches.length > 1) {
          const first = datedMatches[0];
          warn(`${storyLabel} maps to more than one daily item; runtime opens first match ${first.sectionId}[${first.itemIndex}], so verify that card`);
        }
        const allowedIds = categoryIds[expectedTitle] || new Set();
        if (!datedMatches.some(match => allowedIds.has(match.sectionId))) {
          error(`${storyLabel} maps to the wrong daily category for ${expectedTitle}`);
        }
        if (!allowedIds.has(datedMatches[0].sectionId)) {
          warn(`${storyLabel} runtime-first match ${datedMatches[0].sectionId}[${datedMatches[0].itemIndex}] is outside ${expectedTitle}`);
        }
        if (parsedRange && !datedMatches.some(match => match.date >= parsedRange.start && match.date <= parsedRange.end)) {
          error(`${storyLabel} maps outside ${parsedRange.start} to ${parsedRange.end}`);
        }
      });
    });

    requireCount(week.watch, 4, `${label}.watch`);
    (week.watch || []).forEach((item, index) => {
      requireString(item?.title, `${label}.watch[${index}].title`);
      requireString(item?.body, `${label}.watch[${index}].body`);
    });
  }

  for (const [file, base] of [['index.html', "const BASE = 'data/'"], ['malai-editorial/index.html', "const BASE = '../data/'"]]) {
    const fullPath = path.join(root, file);
    if (!fs.existsSync(fullPath)) {
      error(`missing ${file}`);
      continue;
    }
    const html = fs.readFileSync(fullPath, 'utf8');
    if (!html.includes(base)) error(`${file} has an unexpected BASE path`);
    for (const marker of ['renderTwitterWeekly', 'findTwitterWeeklyStoryTarget', 'openTwitterWeeklyStoryAnalysis']) {
      if (!html.includes(marker)) error(`${file} is missing ${marker}`);
    }
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    if (!scripts.length) {
      error(`${file} has no inline script`);
    } else {
      scripts.forEach((script) => {
        try {
          new Function(script);
        } catch (syntaxError) {
          error(`${file} script syntax: ${syntaxError.message}`);
        }
      });
    }
  }

  warnings.forEach(message => console.warn(`[WARN] ${message}`));
  errors.forEach(message => console.error(`[ERROR] ${message}`));
  if (errors.length) {
    console.error(`Audit failed with ${errors.length} error(s) and ${warnings.length} warning(s).`);
    process.exitCode = 1;
  } else {
    console.log(`[OK] Audited ${(weekly.weeks || []).length} week(s), ${dailyLinks.size} daily links, and both HTML entry points.`);
    if (warnings.length) console.log(`[OK] Audit passed with ${warnings.length} warning(s).`);
  }
}

const command = process.argv[2] || 'help';
const { positional, root, top, allowOverlap } = parseArgs(process.argv.slice(3));

if (command === 'inventory') {
  if (positional.length !== 2) {
    usage();
    process.exit(1);
  }
  const inventory = loadInventory(root, positional[0], positional[1]);
  console.log(JSON.stringify(inventoryOutput(inventory, top), null, 2));
} else if (command === 'draft') {
  if (positional.length < 2 || positional.length > 3) {
    usage();
    process.exit(1);
  }
  const inventory = loadInventory(root, positional[0], positional[1]);
  console.log(JSON.stringify(draftOutput(inventory, positional[2], allowOverlap), null, 2));
} else if (command === 'audit') {
  if (positional.length) {
    usage();
    process.exit(1);
  }
  audit(root);
} else {
  usage();
  if (command !== 'help' && command !== '--help' && command !== '-h') process.exitCode = 1;
}
