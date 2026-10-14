#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""自动抓取 B站游戏区排行榜 Top100 → 保存为手动导出同款 JSON（data/launched/raw/bili-rank-<日期>.json）

用法: python tools/fetch_bili_rank.py [日期YYYY-MM-DD]（缺省=今天）
数据源: ranking/v2?rid=1008&type=all（游戏区榜）+ x/tag/archive/tags 逐条补 tags
登录态: 复用监控库的 B站 Chrome profile（cdp_bili_user_data_dir），登录失效时退出码≠0
注意: 与监控库共用同一 Chrome profile，避免与其采集任务（凌晨03:30）同时跑
"""
import json
import sys
import time
from datetime import date as date_cls
from pathlib import Path

from playwright.sync_api import sync_playwright

PROFILE = r"C:\Users\chenjunyi05\MediaCrawler\browser_data\cdp_bili_user_data_dir"

date = sys.argv[1] if len(sys.argv) > 1 else date_cls.today().isoformat()

OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "launched" / "raw"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT = OUT_DIR / f"bili-rank-{date}.json"


def main():
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=PROFILE, channel="chrome", headless=True,
            args=["--disable-blink-features=AutomationControlled"])
        try:
            page = ctx.new_page()
            page.goto("https://www.bilibili.com/v/popular/rank/game", timeout=45000)
            page.wait_for_timeout(2500)

            r = page.evaluate("""async () => {
                const res = await fetch('https://api.bilibili.com/x/web-interface/ranking/v2?rid=1008&type=all&web_location=333.934',
                    {credentials: 'include'});
                const d = await res.json();
                if (d.code !== 0) return {error: d.code};
                return (d.data.list || []).map((it, i) => ({
                    rank: i + 1, title: it.title || '', bvid: it.bvid || '',
                    cover: String(it.pic || '').replace(/^https?:/, ''), state: '', tags: [],
                }));
            }""")
            if isinstance(r, dict) and r.get("error"):
                print(f"ranking API code={r['error']}（-352/-401 = B站登录态失效，请先修复监控库的 cdp_bili profile）")
                return 2
            items = r
            if len(items) < 50:
                print(f"榜单条数异常: {len(items)}")
                return 2

            for it in items:
                try:
                    it["tags"] = page.evaluate("""async bvid => {
                        const res = await fetch('https://api.bilibili.com/x/tag/archive/tags?bvid=' + bvid,
                            {credentials: 'include'});
                        const d = await res.json();
                        return d.code === 0 ? (d.data || []).map(t => t.tag_name) : [];
                    }""", it["bvid"])
                except Exception:
                    it["tags"] = []
                time.sleep(0.15)

            OUT.write_text(json.dumps({"items": items}, ensure_ascii=False, indent=1), encoding="utf-8")
            no_tag = sum(1 for it in items if not it["tags"])
            print(f"saved: {OUT}（{len(items)} 条，无tags {no_tag} 条）")
            for it in items[:3]:
                print(f"  #{it['rank']} {it['title']} [{'/'.join(it['tags'][:3])}]")
            return 0
        finally:
            ctx.close()


if __name__ == "__main__":
    sys.exit(main())
