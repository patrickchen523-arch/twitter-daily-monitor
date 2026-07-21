# Weekly report schema

Use `data/twitter-weekly.json` as the only weekly content file. Keep it valid UTF-8 JSON without comments.

## Root

| Field | Type | Rule |
| --- | --- | --- |
| `updated` | string | Actual edit date, `YYYY-MM-DD` |
| `weeks` | array | Oldest to newest; non-overlapping except for an explicitly declared cadence transition; keep the newest week last |
| `cadence_transitions` | array | Optional exact `from`/`to` week-ID pairs that document a user-requested cadence change |

Treat root `manifest.dates` as the runtime's canonical daily-date index. `manifest.reports.daily.dates` is a compatibility index; the audit warns when the two lists diverge. Do not edit either manifest list merely to create a weekly report.

Append only a genuinely new, non-overlapping week. When revising a published range, replace its existing week object in place instead of appending another object. For a user-requested cadence change, declare only the exact overlapping pair:

`{ "from": "2026-07-02-to-07-08", "to": "2026-07-06-to-07-12", "reason": "Switch to Monday-Sunday natural weeks" }`

## Week object

| Field | Type | Required shape |
| --- | --- | --- |
| `id` | string | Exactly 7 consecutive dates, `YYYY-MM-DD-to-MM-DD`; include the second year when the range crosses years |
| `label` | string | `M.D - M.D` |
| `code` | string | Two-digit ISO week containing the report end date, such as `W29` |
| `range` | string | `YYYY.MM.DD — MM.DD`; include the second year when needed |
| `title` | string | One editorial thesis for the week |
| `stats` | array | Exactly 4 items |
| `executive` | array | Exactly 3 paragraphs |
| `rankings` | array | Exactly 5 items |
| `signals` | array | Exactly 3 items |
| `sections` | array | Exactly 3 canonical sections |
| `watch` | array | Exactly 4 items |

## Fixed counts and labels

Use these 4 stat labels in order:

1. `精选信号`
2. `累计浏览`
3. `累计点赞`
4. `连续日报`

Store stat values as display strings such as `72`, `1.11亿`, `22.9万`, and `7`. For values below 10,000, omit thousands separators (`3381赞`, not `3,381赞`). Compute new values from the daily files at publication time. Historical stats remain a publication snapshot even if daily files are enriched later.

Use these sections in order:

| Weekly section | Allowed daily section IDs | Story count |
| --- | --- | --- |
| `AI 科技热点` | `ai`, `tools` | 4 |
| `游戏市场动态` | `industry` | 4 |
| `新游推文` | `indie` | 4 |

## Nested objects

`stats[]`:

```json
{ "value": "string", "label": "string" }
```

`rankings[]`:

```json
{ "title": "string", "metric": "string", "heat": 100, "link": "https://x.com/.../status/..." }
```

Keep `heat` between 0 and 100 and in descending order. Use 100 for the hottest item; use a log-scaled spread with a practical floor near 20 so lower-ranked bars remain visible. Rankings should normally come from posts inside the covered range.

`signals[]` and `watch[]`:

```json
{ "title": "string", "body": "string" }
```

`sections[]`:

```json
{ "title": "AI 科技热点", "deck": "string", "stories": [] }
```

`stories[]`:

```json
{
  "date": "07.10",
  "source": "SOURCE",
  "title": "string",
  "summary": "string",
  "metric": "12.3万浏览 · 4567赞",
  "link": "https://x.com/account/status/123",
  "image": "https://pbs.twimg.com/..."
}
```

Set `image` to `null` when the daily item has no reliable media or enrichment image. Keep the story `link` identical to the daily source when possible. The runtime normalizes `twitter.com` and `x.com` for comparison, but canonical `x.com` links are preferred.

## Navigation contract

The weekly card stores the story's short date and source link. On click, the page searches manifest dates, finds the daily item with the same normalized link, opens the mapped daily category, and scrolls to `card-<section-id>-<item-index>`.

Therefore:

- Require an empty `missing_dates` list before drafting. Refuse overlaps unless `--allow-overlap` was explicitly requested and the exact pair is recorded in `cadence_transitions`.
- Use the inventory's `duplicate_links` list to inspect repeated sources and confirm the runtime-first match.
- Never use a roundup article or a different repost link for a story card.
- Never reuse the same story link twice in one week.
- Ensure the story `date` matches the date of the daily item containing that link.
- Preserve the explicit `查看原推文 ↗` anchor; only that anchor opens X.
- Run `weekly_tools.mjs audit` after every edit.
- When a daily report contains the same link more than once, the runtime opens the first matching item in manifest, section, and item order. Inspect the duplicate matches and confirm that this first item is the intended target.
