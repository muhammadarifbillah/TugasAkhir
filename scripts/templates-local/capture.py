"""Photograph the FUSE example templates written by generate.mjs.

Usage:
    node scripts/templates-local/generate.mjs
    python scripts/templates-local/capture.py                       # every template
    python scripts/templates-local/capture.py --only news/kabar-fajar

Serves scripts/templates-local/site/ on a local port, shoots each page at 1440x900 (scale 1, reduced motion) with
Edge, and writes public/templates-local/<category>/<slug>/<page>.webp (1200x750, q72), <page>@thumb.webp (400x250,
q70) and, for the first page, home@m.webp (390x844 viewport -> 360x780). Pages that come out blank (luminance
stddev < 6) are rejected. Every page is recorded in scripts/templates-local/capture-report.json.
"""

from __future__ import annotations

import argparse
import functools
import io
import json
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from PIL import Image, ImageStat
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SITE = HERE / "site"
OUT = ROOT / "public" / "templates-local"
REPORT = HERE / "capture-report.json"

DESKTOP = {"width": 1440, "height": 900}
MOBILE = {"width": 390, "height": 844}
SIZES = {"src": ((1200, 750), 72), "thumb": ((400, 250), 70), "mobile": ((360, 780), 72)}
MIN_STD = 6


def save_webp(png: bytes, dest: Path, kind: str) -> None:
    size, quality = SIZES[kind]
    img = Image.open(io.BytesIO(png)).convert("RGB").resize(size, Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, "WEBP", quality=quality, method=6)


def luminance_std(png: bytes) -> float:
    return ImageStat.Stat(Image.open(io.BytesIO(png)).convert("L")).stddev[0]


def serve() -> tuple[ThreadingHTTPServer, str]:
    handler = functools.partial(SimpleHTTPRequestHandler, directory=str(SITE))
    handler.log_message = lambda *a, **k: None  # type: ignore[attr-defined]
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_address[1]}"


def shoot(browser, url: str, mobile: bool) -> bytes:
    ctx = browser.new_context(
        viewport=MOBILE if mobile else DESKTOP,
        device_scale_factor=1,
        is_mobile=mobile,
        has_touch=mobile,
        reduced_motion="reduce",
        locale="id-ID",
    )
    try:
        page = ctx.new_page()
        page.goto(url, wait_until="load", timeout=30000)
        page.wait_for_timeout(150)
        return page.screenshot(type="png")
    finally:
        ctx.close()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="<category>/<slug>")
    args = ap.parse_args()

    manifest = json.loads((SITE / "manifest.json").read_text("utf-8"))
    report = json.loads(REPORT.read_text("utf-8")) if REPORT.exists() else {}
    server, base = serve()
    rejected = 0
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(channel="msedge")
            for tpl in manifest:
                key = f"{tpl['category']}/{tpl['slug']}"
                if args.only and args.only != key:
                    continue
                folder = OUT / tpl["category"] / tpl["slug"]
                entry = {"pages": []}
                for i, pid in enumerate(tpl["pages"]):
                    url = f"{base}/{key}/{pid}.html"
                    png = shoot(browser, url, mobile=False)
                    std = luminance_std(png)
                    record = {"id": pid, "std": round(std, 1)}
                    if std < MIN_STD:
                        record["rejected"] = f"almost blank (luminance stddev {std:.1f})"
                        rejected += 1
                    else:
                        save_webp(png, folder / f"{pid}.webp", "src")
                        save_webp(png, folder / f"{pid}@thumb.webp", "thumb")
                    entry["pages"].append(record)
                    if i == 0:
                        mpng = shoot(browser, url, mobile=True)
                        mstd = luminance_std(mpng)
                        entry["mobile"] = {"id": pid, "std": round(mstd, 1)}
                        if mstd < MIN_STD:
                            entry["mobile"]["rejected"] = f"almost blank (luminance stddev {mstd:.1f})"
                            rejected += 1
                        else:
                            save_webp(mpng, folder / "home@m.webp", "mobile")
                report[key] = entry
                print(f"{key}: {len(entry['pages'])} pages")
            browser.close()
    finally:
        server.shutdown()
    REPORT.write_text(json.dumps(dict(sorted(report.items())), indent=2) + "\n", "utf-8")
    print(f"rejected: {rejected}")
    return 1 if rejected else 0


if __name__ == "__main__":
    raise SystemExit(main())
