#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""自动抓取 SteamDB Trending Games(trendingfollowers) → 保存为浏览器导出同款 JSON
（移植自 fetch_steamdb_trending.cjs——node 版依赖旧机的 G: 盘 playwright-core，本机不可用）

用法: python tools/fetch_steamdb_trending.py [日期YYYY-MM-DD] → data/launched/raw/steamdb-trending-<日期>.json
Cloudflare 挑战需有头 Chrome 自动过（约25s）；headless 必拦。会短暂弹出浏览器窗口。
"""
import json
import re
import sys
from datetime import date as date_cls
from pathlib import Path

from playwright.sync_api import sync_playwright

date = sys.argv[1] if len(sys.argv) > 1 else date_cls.today().isoformat()

OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "launched" / "raw"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT = OUT_DIR / f"steamdb-trending-{date}.json"


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=False,
                                    args=["--disable-blink-features=AutomationControlled"])
        try:
            page = browser.new_page()
            r = page.goto("https://steamdb.info/stats/trendingfollowers/",
                          wait_until="domcontentloaded", timeout=45000)
            print("status:", r.status)
            items = []
            waited = 0
            while waited <= 90000:
                page.wait_for_timeout(5000)
                waited += 5000
                items = page.evaluate("""() => {
                    const rows = document.querySelectorAll('table tbody tr');
                    return Array.from(rows).map(tr => {
                        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
                        const a = tr.querySelector('a[href*="/app/"]');
                        const appid = a ? Number((a.href.match(/app\\/(\\d+)/) || [])[1]) : null;
                        return { appid, name: cells[2] || '', cells };
                    }).filter(it => it.appid && it.cells.length);
                }""")
                if items:
                    break
                if waited == 40000:
                    print("40s 无表格, 刷新重试")
                    page.reload(wait_until="domcontentloaded")
            if not items:
                print("未抓到表格行, 标题:", page.title())
                return 1
            OUT.write_text(json.dumps({"items": items}, ensure_ascii=False, indent=1), encoding="utf-8")
            print(f"抓取 {len(items)} 行 → {OUT}")
            print("榜首:", items[0]["name"], items[0]["cells"][-1])
            return 0
        finally:
            browser.close()


if __name__ == "__main__":
    sys.exit(main())
