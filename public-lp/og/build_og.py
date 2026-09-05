#!/usr/bin/env python3
"""og-source.html を 1200×630（DPR2）で撮って media/ の SNSカード画像にする。

日本語版 → media/og-1200x630.jpg（LP の / が使う）
英語版   → media/og-1200x630-en.jpg（LP の /en/ と /en/beta.html・/en/try.html が使う）
元は1枚の og-source.html で、?lang=en を付けると英語になる。

使い方（このMacでは）:
  ~/.venvs/design-lint/bin/python public-lp/og/build_og.py
  ※ design-lint の venv に playwright（Chromium）が入っている。他の環境では
     pip install playwright && playwright install chromium。
出力: 品質90・2400×1260px（DPR2）
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
SRC = HERE / "og-source.html"
MEDIA = HERE.parent / "media"

# (URLに付ける言語, 出力ファイル名)
CARDS = [("ja", "og-1200x630.jpg"), ("en", "og-1200x630-en.jpg")]

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=2)
    for lang, name in CARDS:
        out = MEDIA / name
        page.goto(f"{SRC.as_uri()}?lang={lang}")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(300)  # 書体の読み込み待ち
        # ★名前と本文が枠からはみ出していないか毎回測る。
        #   .name は white-space:nowrap なので、溢れても見た目のレイアウトは崩れず、
        #   ただ切れた絵が書き出される。h1 はブロック要素で幅が列いっぱいになるため、
        #   要素の幅ではなく scrollWidth（中身の実幅）で判定する。
        over = page.evaluate("""() => {
          const out = [];
          for (const sel of [".name", ".name-en", ".what", ".foot:not([hidden])"]) {
            document.querySelectorAll(sel).forEach((el) => {
              if (!el.getClientRects().length) return;  // 非表示の言語は測らない
              // scrollWidth は「折り返さずに置いたときの中身の幅」。
              // .name（nowrap のブロック）でも .foot（nowrap の子を持つフレックス行）でも効く。
              if (el.scrollWidth > el.clientWidth + 1) {
                out.push(`${sel} 中身${el.scrollWidth}px > 枠${el.clientWidth}px`);
              }
            });
          }
          const card = document.querySelector(".card");
          if (card.scrollHeight > card.clientHeight + 1) {
            out.push(`.card 中身${card.scrollHeight}px > 枠${card.clientHeight}px（縦に溢れた）`);
          }
          return out;
        }""")
        if over:
            raise SystemExit(f"！{lang}: 文字が枠からはみ出している: {'; '.join(over)}")
        name_w = round(page.evaluate(
            "() => Math.round([...document.querySelectorAll('.name span')]"
            ".find((c) => c.getClientRects().length).getBoundingClientRect().width)"
        ))
        room = page.evaluate("() => document.querySelector('.name').clientWidth")
        page.locator(".card").screenshot(path=str(out), type="jpeg", quality=90)
        print(f"書き出し: {out.name}（{out.stat().st_size // 1024} KB・名前の実幅 {name_w}px / 枠 {room}px）")
    browser.close()
