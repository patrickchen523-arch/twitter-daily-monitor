---
name: write-twitter-weekly-report
description: Create, revise, or audit this project's Twitter weekly reports in data/twitter-weekly.json from the daily report JSON files. Use when Codex needs to write the next weekly report, add or edit a week, select weekly signals, update rankings or watchlists, preserve story-to-daily-analysis navigation, or apply the project's standard weekly editorial and publishing workflow.
---

# Twitter Weekly Report Workflow

Build each weekly report from the daily JSON source of truth, preserve the editorial structure, and prove that every story card can route back to its daily analysis card.

## Read the project first

1. Work from the repository root.
2. Read `data/manifest.json`, `data/twitter-weekly.json`, and every `data/YYYY-MM-DD.json` in the requested week.
3. Read [references/weekly-schema.md](references/weekly-schema.md) before changing JSON.
4. Read [references/editorial-guidelines.md](references/editorial-guidelines.md) before selecting stories or drafting copy.
5. Run `git status --short --branch` before any pull, rebase, edit, or publish action.
6. Preserve unrelated worktree changes. Never pull, rebase, or auto-stash over uncommitted tracked changes; resolve ownership or obtain permission first.

## Keep these invariants

- Treat daily report JSON as the factual and metric source of truth.
- Treat root `manifest.dates` as the runtime date index; audit the compatibility list but never edit either manifest list solely for a weekly report.
- Cover exactly 7 consecutive calendar dates and require all 7 daily JSON files before drafting.
- Append only non-overlapping new weeks to `weeks`; keep the newest week last because the UI opens the last entry.
- Revise an existing week in place instead of appending an overlapping replacement. If the user explicitly changes cadence, add one matching `cadence_transitions` declaration and use `--allow-overlap` only for that transition week.
- Keep 3 sections in this order: `AI 科技热点`, `游戏市场动态`, `新游推文`.
- Select 4 stories per section, for 12 stories total.
- Keep 4 stats, 3 executive paragraphs, 5 rankings, 3 signals, and 4 watch items.
- Copy each story's canonical X link from its daily item. Never invent a link, metric, image URL, date, or event.
- Make every story link resolve to a daily item on the stated date and in the expected category. If a daily file repeats the same link, inspect the matches and confirm that the runtime's first match is the intended analysis card.
- Leave `index.html` and `malai-editorial/index.html` unchanged for content-only weekly updates.
- If rendering logic changes, update both HTML entry points while preserving `data/` versus `../data/` base paths.

## Build the candidate inventory

Run:

```powershell
node .agents/skills/write-twitter-weekly-report/scripts/weekly_tools.mjs inventory YYYY-MM-DD YYYY-MM-DD --top 25
```

Use the output to verify missing dates, totals, duplicate-link groups, runtime-first matches, source links, images, engagement, daily section IDs, and suggested metric labels. Omit `--top` when the full pool is needed.
Do not finalize a week until every date in the requested range has a daily JSON file.

For a valid JSON starting object, run:

```powershell
node .agents/skills/write-twitter-weekly-report/scripts/weekly_tools.mjs draft YYYY-MM-DD YYYY-MM-DD
```

Treat the draft as a scaffold. It derives the ISO week code from the report end date, refuses incomplete ranges, and refuses overlap with an existing week. Pass `--allow-overlap` only after the user explicitly requests a cadence change, then declare the exact old-to-new pair in root `cadence_transitions`. Pass an explicit `WNN` only when the user has defined a different code.
Review its computed stats and rankings, then write all editorial fields before inserting it into `data/twitter-weekly.json`.

## Select the weekly stories

1. Cluster the week into repeated themes before ranking individual posts.
2. Choose 4 stories per section using impact, structural importance, distinctiveness, and category coverage.
3. Avoid filling a section with one brand, one day, or several posts that make the same point.
4. Prefer stories that support a weekly claim, not merely high engagement.
5. Use rankings for heat and the 12 story cards for editorial breadth; overlap is allowed.
6. Review `duplicate_links`, remove repeated source links from the 12-story selection, and confirm `is_runtime_first_match_for_date` for any duplicate daily source.
7. Confirm each chosen story's daily section matches its weekly category.

## Write from claims to evidence

1. Write the week title as a transition, tension, or consequence—not a list of headlines.
2. Write 3 executive paragraphs: technology/product, market/platform, then games/content.
3. Write 3 signals as reusable conclusions supported by multiple stories.
4. Write each section deck as a category thesis.
5. Rewrite each story title into an implication-led editorial headline.
6. Write each summary in two moves: what happened, then why it matters.
7. Write 4 next-week watch items that occur after the covered range and state what evidence to monitor.
8. Keep claims proportional to the daily evidence; separate fact from inference.

## Edit the weekly JSON

1. Update the root `updated` field to the actual edit date.
2. Append a completed non-overlapping week, or replace the matching week object when revising an existing report.
3. For an explicit cadence change, add a `cadence_transitions` entry naming the overlapping `from` and `to` week IDs plus the reason; never use a blanket overlap exception.
4. Use exact field names and counts from the schema reference.
5. Reuse the daily item's media URL, or set `image` to `null` when no suitable image exists.
6. Keep JSON UTF-8, valid, and free of comments.

## Validate before preview

Run the deterministic audit:

```powershell
node .agents/skills/write-twitter-weekly-report/scripts/weekly_tools.mjs audit
```

Fix every error. Investigate warnings instead of suppressing them.

Then preview through HTTP, never by double-clicking the HTML file. Check whether port 8765 is already in use and reuse it only when it serves this repository.

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Run the server in a separate terminal or background process, record its PID, and stop only the process you started after preview.

Verify in the browser:

- The newest week button is selected.
- All 12 cards render under the correct sections.
- Clicking a card's image, title, or summary opens the intended daily analysis card, including cases where a source link appears more than once that day.
- Clicking only `查看原推文 ↗` opens the X source in a new tab.
- Desktop and mobile layouts remain readable.

## Finish safely

1. Review `git diff --check` and the exact changed-file list.
2. Do not stage handoff notes or unrelated user files.
3. For a content-only week, expect only `data/twitter-weekly.json` plus intentional Skill updates to change.
4. Commit and push only when the user requested delivery or the established project workflow clearly includes publishing.
5. Before publishing, require a worktree with no uncommitted tracked changes; never auto-stash user work.
6. Rebase on the latest `main`, rerun `audit`, push, and confirm the Pages build uses the final commit.

## Completion standard

Report the covered dates, week code, 12-story category split, validation result, changed files, commit hash, and deployment status. Call out any missing daily source, unavailable image, uncertain metric, or unresolved link mapping.
