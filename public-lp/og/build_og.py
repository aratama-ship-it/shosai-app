#!/usr/bin/env python3
"""og-source.html を 1200×630（DPR2）で撮って media/og-1200x630.jpg にする。

使い方（このMacでは）:
  ~/.venvs/design-lint/bin/python public-lp/og/build_og.py
  ※ design-lint の venv に playwright（Chromium）が入っている。他の環境では
     pip install playwright && playwright install chromium。
出力: public-lp/media/og-1200x630.jpg（品質90・2400×1260px）
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
SRC = HERE / "og-source.html"
OUT = HERE.parent / "media" / "og-1200x630.jpg"

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=2)
    page.goto(SRC.as_uri())
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(300)  # 書体の読み込み待ち
    page.locator(".card").screenshot(path=str(OUT), type="jpeg", quality=90)
    browser.close()

print(f"書き出し: {OUT} ({OUT.stat().st_size // 1024} KB)")
