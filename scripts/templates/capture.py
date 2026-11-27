"""Photograph the pages of the open-source templates listed in sources.json.

Usage:
    python scripts/templates/capture.py                    # every template, skip images that already exist
    python scripts/templates/capture.py --only news/ghost-casper
    python scripts/templates/capture.py --only news/ghost-casper --force

Writes public/templates/<category>/<slug>/<page>.webp (1200x750), <page>@thumb.webp (400x250) and
home@m.webp (360x780, first page on a 390x844 mobile viewport), and records every page (ok / rejected + reason)
in scripts/templates/capture-report.json. Templates with a local copy are cloned into scripts/templates/.cache/
and served with `npx serve`.
"""

from __future__ import annotations

import argparse
import io
import json
import re
import subprocess
import time
from pathlib import Path
from urllib.parse import urlparse

from PIL import Image, ImageStat
from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import Page, sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SOURCES = HERE / "sources.json"
REPORT = HERE / "capture-report.json"
CACHE = HERE / ".cache"
OUT = ROOT / "public" / "templates"

DESKTOP = {"width": 1440, "height": 900}
MOBILE = {"width": 390, "height": 844}
SIZES = {"src": ((1200, 750), 72), "thumb": ((400, 250), 70), "mobile": ((360, 780), 72)}

HIDE_SCROLLBARS = "html{scrollbar-width:none!important}::-webkit-scrollbar{display:none!important}"
ERROR_HEADING = re.compile(
    r"\b40[34]\b|page not found|not found|application error|^\s*error\b|request was blocked|access denied|forbidden", re.I
)
# Headless Edge announces itself as "HeadlessEdg", which bot walls (e.g. Vercel firewall) block outright.
USER_AGENT = {
    False: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0",
    True: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
}


def load_json(path: Path, default):
    return json.loads(path.read_text("utf-8")) if path.exists() else default


def save_webp(png: bytes, dest: Path, kind: str) -> None:
    (size, quality) = SIZES[kind]
    img = Image.open(io.BytesIO(png)).convert("RGB").resize(size, Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=quality, method=6)


def luminance_std(png: bytes) -> float:
    return ImageStat.Stat(Image.open(io.BytesIO(png)).convert("L")).stddev[0]


def run_actions(page: Page, actions: list[dict]) -> None:
    for a in actions:
        kind, sel = a["do"], a.get("selector")
        try:
            if kind == "click":
                page.locator(sel).first.click(timeout=a.get("timeout", 10000))
            elif kind == "fill":
                page.locator(sel).first.fill(a["text"], timeout=10000)
            elif kind == "wait":
                if sel:
                    page.locator(sel).first.wait_for(state="visible", timeout=a.get("timeout", 15000))
                else:
                    page.wait_for_timeout(a.get("ms", 1000))
            elif kind == "scroll":
                if sel:
                    page.locator(sel).first.evaluate(
                        "(el, off) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off)",
                        a.get("offset", 0),
                    )
                else:
                    page.evaluate("y => window.scrollTo(0, y)", a.get("y", 0))
                page.wait_for_timeout(800)
            elif kind == "goto":
                page.goto(a["url"], timeout=60000, wait_until="domcontentloaded")
                settle(page)
            elif kind == "hide":
                page.locator(sel).evaluate_all("els => els.forEach(e => e.style.setProperty('display', 'none', 'important'))")
            elif kind == "press":
                page.keyboard.press(a["key"])
            else:
                raise ValueError(f"unknown action {kind}")
            if kind in ("click", "press"):
                page.wait_for_timeout(a.get("after", 1200))
        except (PlaywrightError, ValueError) as exc:
            if not a.get("optional"):
                raise RuntimeError(f"action {kind} {sel or ''} failed: {str(exc).splitlines()[0]}") from exc


def settle(page: Page) -> None:
    try:
        page.wait_for_load_state("networkidle", timeout=20000)
    except PlaywrightError:
        pass  # some demos keep analytics sockets open; the fixed wait below still applies
    page.wait_for_timeout(1500)


def open_page(page: Page, url: str) -> None:
    last: Exception | None = None
    for _ in range(2):
        try:
            page.goto(url, timeout=60000, wait_until="domcontentloaded")
            settle(page)
            return
        except PlaywrightError as exc:
            last = exc
            page.wait_for_timeout(2000)
    raise RuntimeError(f"open failed: {str(last).splitlines()[0]}")


def gate(page: Page, url: str, png: bytes) -> str | None:
    """Return a rejection reason, or None when the shot is usable."""
    if urlparse(page.url).hostname != urlparse(url).hostname:
        return f"redirected to another host: {page.url}"
    headings = page.evaluate(
        "() => [document.title, ...[...document.querySelectorAll('h1,h2')].slice(0, 4).map(h => h.innerText)]"
    )
    for text in headings:
        if text and ERROR_HEADING.search(text.strip()[:80]):
            return f"error heading: {text.strip()[:80]!r}"
    std = luminance_std(png)
    if std < 6:
        return f"almost blank (luminance stddev {std:.1f})"
    return None


def shoot(browser, url: str, actions: list[dict], mobile: bool) -> tuple[bytes | None, str | None, str]:
    ctx = browser.new_context(
        viewport=MOBILE if mobile else DESKTOP,
        device_scale_factor=1,
        is_mobile=mobile,
        has_touch=mobile,
        reduced_motion="reduce",
        locale="en-US",
        user_agent=USER_AGENT[mobile],
    )
    page = ctx.new_page()
    try:
        open_page(page, url)
        run_actions(page, actions)
        page.add_style_tag(content=HIDE_SCROLLBARS)
        page.wait_for_timeout(500)
        png = page.screenshot(type="png")
        reason = gate(page, url, png)
        return (None if reason else png), reason, page.url
    except RuntimeError as exc:
        return None, str(exc), page.url
    finally:
        ctx.close()


def ensure_local(tpl: dict) -> str | None:
    """Clone + serve a template's local copy; returns the base URL, or None for online demos."""
    local = tpl.get("local")
    if not local:
        return None
    target = CACHE / tpl["slug"]
    if not target.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        subprocess.run(["git", "clone", "--depth", "1", local["repo"], str(target)], check=True)
    port = str(local.get("port", 5055))
    subprocess.Popen(
        ["npx", "--yes", "serve", "-l", port, str(target / local.get("dir", "."))],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        shell=True,
    )
    time.sleep(4)
    return f"http://localhost:{port}"


def capture_template(browser, category: str, tpl: dict, force: bool) -> dict:
    folder = OUT / category / tpl["slug"]
    base = ensure_local(tpl)
    entry = {"name": tpl["name"], "pages": [], "mobile": None, "replaces": tpl.get("replaces")}
    for i, pg in enumerate(tpl["pages"]):
        url = pg["url"] if not base else base + pg["url"]
        src, thumb = folder / f"{pg['id']}.webp", folder / f"{pg['id']}@thumb.webp"
        record = {"id": pg["id"], "url": url}
        if pg.get("skip"):
            # Checked by hand and found unusable (the gate cannot see it); keep it out of the data, with the reason.
            src.unlink(missing_ok=True)
            thumb.unlink(missing_ok=True)
            record.update(status="rejected", reason=pg["skip"])
        elif src.exists() and thumb.exists() and not force:
            record.update(status="ok", reason="kept existing image")
        else:
            png, reason, final = shoot(browser, url, pg.get("actions", []), mobile=False)
            if png:
                save_webp(png, src, "src")
                save_webp(png, thumb, "thumb")
                record.update(status="ok", reason=None)
            else:
                src.unlink(missing_ok=True)
                thumb.unlink(missing_ok=True)
                record.update(status="rejected", reason=reason, final=final)
        entry["pages"].append(record)
        print(f"  {pg['id']:<16} {record['status']:<9} {record.get('reason') or ''}", flush=True)
        if i == 0:
            mob = folder / "home@m.webp"
            if mob.exists() and not force:
                entry["mobile"] = {"status": "ok", "reason": "kept existing image"}
            else:
                png, reason, _ = shoot(browser, url, pg.get("mobileActions", pg.get("actions", [])), mobile=True)
                if png:
                    save_webp(png, mob, "mobile")
                entry["mobile"] = {"status": "ok" if png else "rejected", "reason": reason}
            print(f"  {'home@m':<16} {entry['mobile']['status']:<9} {entry['mobile']['reason'] or ''}", flush=True)
    ok = sum(p["status"] == "ok" for p in entry["pages"])
    if ok < 4:
        entry["warning"] = f"only {ok} pages passed; replace this template with a backup from the research"
    return entry


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", action="append", help="<category>/<slug>, repeatable")
    ap.add_argument("--force", action="store_true", help="re-shoot images that already exist")
    args = ap.parse_args()

    sources = load_json(SOURCES, {})
    report = load_json(REPORT, {"templates": {}, "replacements": []})
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel="msedge", headless=True)
        for category, templates in sources.items():
            for tpl in templates:
                key = f"{category}/{tpl['slug']}"
                if args.only and key not in args.only:
                    continue
                print(key, flush=True)
                report["templates"][key] = capture_template(browser, category, tpl, args.force)
        browser.close()

    # Keep the report in sources order and drop templates no longer listed.
    keys = [f"{c}/{t['slug']}" for c, ts in sources.items() for t in ts]
    report["templates"] = {k: report["templates"][k] for k in keys if k in report["templates"]}
    report["replacements"] = [
        {"category": c, "slug": t["slug"], **t["replaces"]} for c, ts in sources.items() for t in ts if t.get("replaces")
    ]
    REPORT.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", "utf-8")


if __name__ == "__main__":
    main()
