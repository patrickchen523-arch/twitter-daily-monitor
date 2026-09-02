# -*- coding: utf-8 -*-
"""
Roblox 周报一键录入脚本（无需 AI 参与）

用法:
  python upload_roblox_report.py "E:\\...\\Roblox监控周报(2026.8.24-8.30).html"
  python upload_roblox_report.py <文件路径> --dry-run     # 只解析+显示计划，不写入不推送
  python upload_roblox_report.py <文件路径> --no-verify   # 推送后不做线上验证

全自动完成:
  1. 从文件名(或 HTML title)解析周报日期范围
  2. 复制到 site/roblox/roblox-YYYY-MM-DD-to-MM-DD.html
  3. 向 index.html 的 robloxReports 数组末尾插入条目
  4. git commit -> rebase -> push GitHub
  5. cherry-pick 到 gitlab-sync -> push GitLab
  6. 轮询验证双端线上 URL 返回 200
"""
import argparse
import io
import json
import re
import shutil
import subprocess
import sys
import time
import urllib.request
from datetime import date, timedelta
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

SITE = Path(r"D:\CMproject\X爬虫\site")
INDEX = SITE / "index.html"
ROBLOX_DIR = SITE / "roblox"
URL_GH = "https://patrickchen523-arch.github.io/twitter-daily-monitor/"
URL_GL = "https://xmonitor.doc.nie.netease.com/"

MONTHS_EN = {"jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
             "jul": 7, "aug": 8, "sep": 9, "sept": 9, "oct": 10, "nov": 11, "dec": 12}


def parse_range(src: Path):
    """返回 (start_date, end_date, 来源说明) 或抛 ValueError"""
    name = src.name
    # 文件名: Roblox监控周报(2026.8.24-8.30).html
    m = re.search(r"(\d{4})\s*[./年\-]\s*(\d{1,2})\s*[./月\-]\s*(\d{1,2})\s*日?\s*[-~–—至]+\s*(\d{1,2})\s*[./月]\s*(\d{1,2})", name)
    if m:
        y, sm, sd, em, ed = map(int, m.groups())
        start = date(y, sm, sd)
        end = date(y, em, ed)
        if end < start:
            end = date(y + 1, em, ed)
        return start, end, "filename"
    # HTML title 兜底: 2026.08.24–08.30 / 2026-08-24~2026-08-30 / August 24 - August 30, 2026
    try:
        head = src.read_text(encoding="utf-8", errors="ignore")[:20000]
    except OSError:
        head = ""
    m = re.search(r"(20\d{2})\s*[./-]\s*(\d{1,2})\s*[./-]\s*(\d{1,2})\s*[-~–—]+\s*(\d{1,2})\s*[./-]\s*(\d{1,2})", head)
    if m:
        y, sm, sd, em, ed = map(int, m.groups())
        return date(y, sm, sd), date(y, em, ed), "html-title"
    m = re.search(r"(\d{1,2})\s+([A-Za-z]{3,9})\s*[-–—~]+\s*(\d{1,2})\s+([A-Za-z]{3,9}),?\s*(20\d{2})", head)
    if m:
        sd, sm1, ed, sm2, y = m.group(1), m.group(2).lower()[:4], m.group(3), m.group(4).lower()[:4], int(m.group(5))
        if sm1 in MONTHS_EN and sm2 in MONTHS_EN:
            return date(y, MONTHS_EN[sm1], int(sd)), date(y, MONTHS_EN[sm2], int(ed)), "html-title"
    raise ValueError(f"无法从文件名或 HTML 内容解析日期范围: {src.name}\n"
                     f"文件名需含形如 2026.8.24-8.30 的日期区间")


def build_names(start: date, end: date):
    # 历史命名格式: roblox-2026-08-24-to-08-30.html (end 不带年份)
    fname = f"roblox-{start.isoformat()}-to-{end.month:02d}-{end.day:02d}.html"
    label = f"{start.month}.{start.day} - {end.month}.{end.day}"
    return fname, label


def insert_entry(fname: str, label: str):
    """向 index.html robloxReports 数组末尾插入条目"""
    html = INDEX.read_text(encoding="utf-8")
    if fname in html:
        raise RuntimeError(f"index.html 已存在条目 {fname}，疑似重复录入")
    m = re.search(r"(const robloxReports = \[\n)(.*?)(\n\];)", html, re.S)
    if not m:
        raise RuntimeError("index.html 中未找到 robloxReports 数组")
    block = m.group(2).rstrip()
    entry = f"  {{ label: '{label}', file: 'roblox/{fname}' }}"
    block = (block + ",\n" + entry) if block.endswith("}") else (block + entry)
    html = html[:m.start(2)] + block + html[m.end(2):]
    INDEX.write_text(html, encoding="utf-8")


def run_git(args, check=True):
    r = subprocess.run(["git"] + args, cwd=SITE, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    if check and r.returncode != 0:
        raise RuntimeError(f"git {' '.join(args)} 失败:\n{r.stdout}\n{r.stderr}")
    return r


def push_both(commit_msg: str):
    run_git(["add", str(ROBLOX_DIR), "index.html"])
    run_git(["commit", "-m", commit_msg])

    # GitHub: rebase 最新后推送，失败重试一次
    for attempt in (1, 2):
        run_git(["fetch", "origin"])
        rebase = run_git(["rebase", "origin/main"], check=False)
        if rebase.returncode != 0:
            raise RuntimeError(f"rebase origin/main 冲突，需人工处理:\n{rebase.stdout}\n{rebase.stderr}")
        push = run_git(["push", "origin", "main"], check=False)
        if push.returncode == 0:
            print(f"[git] GitHub pushed (attempt {attempt})")
            break
        print(f"[git] push rejected, pull --rebase retry {attempt}/2 ...")
        run_git(["pull", "--rebase", "origin", "main"])
    else:
        raise RuntimeError("GitHub push 重试后仍失败")
    sha = run_git(["rev-parse", "--short", "HEAD"]).stdout.strip()

    # GitLab: cherry-pick 到 gitlab-sync 再推
    run_git(["checkout", "gitlab-sync"])
    run_git(["pull", "--ff-only"])
    cp = run_git(["cherry-pick", sha], check=False)
    if cp.returncode != 0:
        raise RuntimeError(f"cherry-pick 失败:\n{cp.stdout}\n{cp.stderr}")
    push = run_git(["push", "gitlab", "gitlab-sync:main"], check=False)
    run_git(["checkout", "main"])
    if push.returncode != 0:
        raise RuntimeError(f"GitLab push 失败:\n{push.stdout}\n{push.stderr}")
    print("[git] GitLab pushed")
    return sha


def check_url(url: str) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=20) as r:
            return r.status == 200
    except Exception:
        return False


def verify_online(fname: str, do_verify: bool):
    if not do_verify:
        return
    gh = URL_GH + "roblox/" + fname
    gl = URL_GL + "roblox/" + fname
    print("[verify] GitHub Pages 部署等待中 ...")
    ok_gh = False
    for _ in range(4):
        time.sleep(20)
        if check_url(gh):
            ok_gh = True
            break
    print(f"[verify] GitHub {gh} -> {'200 OK' if ok_gh else 'FAIL'}")

    print("[verify] GitLab Pages CI 部署等待中 ...")
    ok_gl = False
    for i in range(6):
        time.sleep(30)
        if check_url(gl):
            ok_gl = True
            break
        print(f"[verify] GitLab 尚未生效 ({i + 1}/6)，继续等待 ...")
    print(f"[verify] GitLab {gl} -> {'200 OK' if ok_gl else 'FAIL (CI 延迟请稍后手动复查或 Retry job)'}")

    if not (ok_gh and ok_gl):
        sys.exit(2)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src", help="周报 HTML 文件路径")
    ap.add_argument("--dry-run", action="store_true", help="只解析并显示计划")
    ap.add_argument("--no-verify", action="store_true", help="跳过线上验证")
    args = ap.parse_args()

    src = Path(args.src)
    if not src.is_file():
        sys.exit(f"文件不存在: {src}")

    start, end, via = parse_range(src)
    span = (end - start).days
    if span != 6:
        print(f"[warn] 日期跨度 {span} 天（周报通常 7 天，请确认）")
    fname, label = build_names(start, end)

    print(f"[plan] 来源     : {src}")
    print(f"[plan] 日期范围 : {start} ~ {end} (解析自 {via})")
    print(f"[plan] 目标文件 : site/roblox/{fname}")
    print(f"[plan] label    : {label}")
    print(f"[plan] index 插入: {{ label: '{label}', file: 'roblox/{fname}' }}")

    if args.dry_run:
        print("[dry-run] 完成，未做任何修改")
        return

    if (ROBLOX_DIR / fname).exists():
        sys.exit(f"[stop] 目标文件已存在: {fname}（重复录入？）")

    shutil.copyfile(src, ROBLOX_DIR / fname)
    print(f"[copy] -> site/roblox/{fname}")
    insert_entry(fname, label)
    print("[edit] index.html robloxReports 已插入")

    commit_msg = f"add Roblox weekly {label} ({start.isoformat()} ~ {end.isoformat()})"
    sha = push_both(commit_msg)
    print(f"[done] commit {sha} 已推送双端，开始线上验证 ...")
    verify_online(fname, not args.no_verify)
    print("[ok] 全部完成")


if __name__ == "__main__":
    main()
