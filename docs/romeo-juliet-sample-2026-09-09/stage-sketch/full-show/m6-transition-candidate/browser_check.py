"""Browser-check the decision page and import the candidate into isolated Stage Sketch storage."""
import hashlib
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
QA = HERE / "qa"
QA.mkdir(exist_ok=True)
CANDIDATE = HERE / "romeo-juliet-m6-transition-candidate.stage-sketch.json"
APPROVAL = HERE / "owner-approval-2026-09-12.json"
PAGE = HERE / "index.html"
BASE = os.environ.get("M6_QA_BASE_URL", "http://127.0.0.1:18761")

document = json.loads(CANDIDATE.read_text(encoding="utf-8"))
approval = json.loads(APPROVAL.read_text(encoding="utf-8"))
expected = document["project"]
assert approval["status"] == "owner_approved_for_sample"
assert [item["choice"] for item in approval["decisions"]] == ["A", "A", "A"]
errors = []
checks = []


def exported(page):
    return json.loads(page.evaluate("window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()"))


with sync_playwright() as pw:
    browser = pw.chromium.launch()

    review_context = browser.new_context(locale="ja-JP")
    review = review_context.new_page()
    review.on("pageerror", lambda error: errors.append("review: " + str(error)))
    for width, height in ((1440, 1000), (390, 844)):
        review.set_viewport_size({"width": width, "height": height})
        review.goto(PAGE.as_uri())
        review.wait_for_selector(".stage-card")
        assert review.locator(".stage-card").count() == 5
        assert review.locator(".decision").count() == 3
        assert review.locator('.choice[aria-pressed="true"]').count() == 3
        assert review.evaluate("document.documentElement.scrollWidth <= innerWidth")
        heights = review.locator("button.choice").evaluate_all(
            "nodes => nodes.map(node => node.getBoundingClientRect().height)"
        )
        assert min(heights) >= 44, min(heights)
        review.screenshot(path=str(QA / f"decision-{width}.png"), full_page=True)
    for decision_id in ("M6-C1", "M6-C2", "M6-C3"):
        review.locator(f'.decision[data-decision="{decision_id}"] .choice[data-choice="A"]').click()
    answer = review.locator("#answer").inner_text()
    assert all(value in answer for value in ("M6-C1", "M6-C2", "M6-C3"))
    assert answer.count("A ") == 3
    review.screenshot(path=str(QA / "decision-selected-390.png"), full_page=True)
    checks.append("Decision page: owner-approved A/A/A preselected, 5 diagrams, 3 button groups, local answer assembly, 1440/390 overflow 0, choice buttons >=44px")
    review_context.close()

    app_context = browser.new_context(
        viewport={"width": 1440, "height": 1000},
        locale="ja-JP",
        accept_downloads=True,
        service_workers="block",
    )
    app_context.add_init_script("window.showSaveFilePicker = undefined;")
    app = app_context.new_page()
    app.on("pageerror", lambda error: errors.append("stage: " + str(error)))
    app.goto(BASE + "/stage.html")
    app.wait_for_function("!!window.SHOSAI_STAGE_SESSION_BRIDGE")
    if app.locator("#stage-tour-close").is_visible():
        app.locator("#stage-tour-close").click()
    app.locator("#stage-project-settings-open").click()
    import_label = app.locator("label.stage-import-label").filter(
        has=app.locator("#stage-import-json")
    )
    with app.expect_file_chooser() as chooser:
        import_label.click()
    chooser.value.set_files(str(CANDIDATE))
    app.locator("#stage-import-modal").wait_for(state="visible")
    summary = app.locator("#stage-import-summary").inner_text()
    assert expected["title"] in summary
    app.screenshot(path=str(QA / "stage-import-preview.png"), full_page=True)
    app.locator("#stage-import-as-new").click()
    app.wait_for_function(
        "(title) => JSON.parse(window.SHOSAI_STAGE_SESSION_BRIDGE.exportDocumentString()).project.title === title",
        arg=expected["title"],
    )
    for selector in ("#stage-project-settings-close", "#stage-import-close"):
        if app.locator(selector).is_visible():
            app.locator(selector).click()

    actual = exported(app)["project"]
    assert actual["id"] != expected["id"]
    assert len(actual["scenes"]) == 34
    assert len([scene for scene in actual["scenes"] if scene["kind"] == "scene"]) == 31
    assert len(actual["cast"]) == 10
    assert len(actual["sets"]) == 13
    ids = [scene["id"] for scene in actual["scenes"]]
    review_ids = [
        "rj-frame-rj-cond-01-b-02",
        "rj-frame-rj-cond-01-b-m6-01",
        "rj-frame-rj-cond-01-b-m6-02",
        "rj-frame-rj-cond-01-b-m6-03",
        "rj-frame-rj-cond-01-c-01",
    ]
    start = ids.index(review_ids[0])
    assert ids[start:start + 5] == review_ids

    expected_by_id = {scene["id"]: scene for scene in expected["scenes"]}
    for index, scene_id in enumerate(review_ids):
        row = app.locator('[data-scene-id="' + scene_id + '"]')
        row.locator(".stage-scene-chip").click()
        app.evaluate("window.SHOSAI_STAGE_SESSION_BRIDGE.finishSceneTransition()")
        current = exported(app)["project"]
        assert current["activeSceneId"] == scene_id
        got = next(scene for scene in current["scenes"] if scene["id"] == scene_id)
        wanted = expected_by_id[scene_id]
        assert got["rehearsal"] == wanted["rehearsal"]
        assert len(got["pieces"]) == len(wanted["pieces"])
        assert sum(piece.get("holdMode") == "face" for piece in got["pieces"]) == sum(
            piece.get("holdMode") == "face" for piece in wanted["pieces"]
        )
        app.screenshot(path=str(QA / f"stage-{index + 1}.png"))

    imported = exported(app)["project"]
    middle = next(scene for scene in imported["scenes"] if scene["id"] == review_ids[2])
    assert any(piece.get("setId") == "rj-set-bar" for piece in middle["pieces"])
    first = next(scene for scene in imported["scenes"] if scene["id"] == review_ids[1])
    assert not any(piece.get("setId") == "rj-set-bar" for piece in first["pieces"])
    assert first["rehearsal"]["holdDurationSeconds"] is None
    assert first["rehearsal"]["transitionToNextSeconds"] is None
    checks.append("Stage Sketch isolated import: comparison shown, opened as separate show, 34 section/scene rows, 31 scenes, 10 cast, 13 sets, 5 target layouts retained")
    app_context.close()
    browser.close()

assert not errors, errors
report = {
    "status": "pass",
    "baseUrl": BASE,
    "candidateSha256": hashlib.sha256(CANDIDATE.read_bytes()).hexdigest(),
    "approvalStatus": approval["status"],
    "approvedChoices": {item["id"]: item["choice"] for item in approval["decisions"]},
    "isolatedBrowserStorage": True,
    "userBrowserStorageModified": False,
    "viewports": ["1440x1000", "390x844"],
    "stageViewsChecked": 5,
    "decisionGroupsChecked": 3,
    "horizontalOverflow": 0,
    "pageErrors": errors,
    "checks": checks,
}
(QA / "browser-checks.json").write_text(
    json.dumps(report, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)
print(json.dumps(report, ensure_ascii=False, indent=2))
