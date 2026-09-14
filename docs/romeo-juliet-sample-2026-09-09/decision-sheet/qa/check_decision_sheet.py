#!/usr/bin/env python3
"""Browser checks for the standalone Romeo and Juliet decision sheet."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "qa"
URL = (
    sys.argv[1]
    if len(sys.argv) > 1
    else "http://127.0.0.1:18760/docs/romeo-juliet-sample-2026-09-09/decision-sheet/"
)


def check(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    results: dict[str, object] = {"url": URL, "checks": []}
    errors: list[str] = []

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            service_workers="block",
            permissions=["clipboard-read", "clipboard-write"],
        )
        page = context.new_page()
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(URL, wait_until="networkidle")
        page.evaluate("localStorage.clear()")
        page.reload(wait_until="networkidle")

        check(page.locator(".decision").count() == 21, "Expected 21 decisions")
        check(page.locator('.decision input[type="radio"]').count() == 84, "Expected 84 options")
        check(page.locator('.decision input[type="radio"]:checked').count() == 0, "No initial choice expected")
        check(page.locator("#progress-count").inner_text() == "0 / 21", "Initial progress mismatch")
        results["checks"].append("initial_state_0_of_21")

        page.locator('input[name="RJ-DEC-01"][value="compress-25"]').check()
        page.locator("#note-RJ-DEC-01").fill("尺は稽古後に再計測")
        page.locator('[data-production="venue"]').fill("会場未定、寸法は後日実測")
        page.locator("#recommend-all").click()
        check(page.locator("#progress-count").inner_text() == "21 / 21", "Recommended fill did not complete")
        check(page.locator('input[name="RJ-DEC-01"][value="compress-25"]').is_checked(), "Existing choice was overwritten")
        results["checks"].append("recommended_fill_preserves_existing_choice")

        page.locator("#unanswered-only").click()
        check(page.locator(".decision:visible").count() == 0, "Answered items remained in unanswered filter")
        page.locator("#unanswered-only").click()
        check(page.locator(".decision:visible").count() == 21, "All items were not restored")
        results["checks"].append("unanswered_filter")

        page.reload(wait_until="networkidle")
        check(page.locator("#progress-count").inner_text() == "21 / 21", "Answers did not persist")
        check(page.locator("#note-RJ-DEC-01").input_value() == "尺は稽古後に再計測", "Note did not persist")
        check(page.locator('[data-production="venue"]').input_value().startswith("会場未定"), "Production input did not persist")
        results["checks"].append("local_storage_reload")

        exported = page.evaluate("window.RJ_DECISION_SHEET.collect()")
        check(exported["schema"] == "romeo-juliet.user-decisions.v1", "Schema mismatch")
        check(exported["applicationStatus"] == "decisions_only_not_applied", "Application status mismatch")
        check(exported["progress"] == {"answered": 21, "total": 21, "complete": True}, "Export progress mismatch")
        check(len(exported["decisions"]) == 21, "Export decision count mismatch")
        check(exported["decisions"][0]["selectedOptionId"] == "compress-25", "Export lost alternate choice")
        check(exported["source"]["show"]["sha256"] == "34d9339a3c5d59c8095ee6d909b912a081b88359eecf7551e5eaddd7e256f1f6", "Source hash mismatch")
        results["checks"].append("machine_readable_export")

        with page.expect_download() as download_info:
            page.locator("#download-json").click()
        download = download_info.value
        download_path = OUT / "sample-export.json"
        download.save_as(download_path)
        downloaded = json.loads(download_path.read_text(encoding="utf-8"))
        check(downloaded["progress"]["answered"] == 21, "Downloaded JSON mismatch")
        results["checks"].append("json_download")

        page.locator("#copy-answers").click()
        copied = page.evaluate("navigator.clipboard.readText()")
        check("RJ-DEC-01: 約25分へ圧縮する" in copied, "Clipboard summary mismatch")
        check("まだ通し稿・Stage Sketch正本へ反映されていません" in copied, "Clipboard boundary missing")
        results["checks"].append("clipboard_summary")

        desktop_overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
        check(not desktop_overflow, "Desktop has horizontal overflow")
        page.screenshot(path=OUT / "interaction-desktop.png", full_page=False)

        page.set_viewport_size({"width": 390, "height": 844})
        page.reload(wait_until="networkidle")
        mobile_overflow = page.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
        check(not mobile_overflow, "Mobile has horizontal overflow")
        page.screenshot(path=OUT / "interaction-mobile.png", full_page=False)
        results["checks"].append("no_horizontal_overflow_1440_and_390")

        context.close()

        offline_context = browser.new_context(viewport={"width": 390, "height": 844})
        offline_page = offline_context.new_page()
        offline_errors: list[str] = []
        external_requests: list[str] = []
        offline_page.on("pageerror", lambda error: offline_errors.append(str(error)))
        offline_page.on(
            "request",
            lambda request: external_requests.append(request.url)
            if not request.url.startswith("file:")
            else None,
        )
        offline_page.goto(ROOT.joinpath("index.html").as_uri(), wait_until="load")
        check(offline_page.locator(".decision").count() == 21, "file:// did not render 21 decisions")
        check(not offline_errors, f"file:// page errors: {offline_errors}")
        check(not external_requests, f"Unexpected external requests: {external_requests}")
        results["checks"].append("standalone_file_mode_no_external_requests")
        offline_context.close()
        browser.close()

    check(not errors, f"Browser page errors: {errors}")
    results["pageErrors"] = errors
    results["status"] = "PASS"
    (OUT / "browser-checks.json").write_text(
        json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
