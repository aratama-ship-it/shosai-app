import AppKit
import Foundation
import WebKit

final class DiagnoseAdoptRunner: NSObject, WKNavigationDelegate {
    typealias Completion = (Data, Int32) -> Void

    private let environment: WebEnvironment
    private let webView: WKWebView
    private let configuration: AppConfiguration
    private let temporaryMCPDataRootURL: URL
    private let fakeAgentURL: URL
    private let completion: Completion
    private let startedAt = Date()
    private var navigationTimeout: DispatchWorkItem?
    private var workflowTimeout: DispatchWorkItem?
    private var initialProbe: [String: Any]?
    private var draftProbe: [String: Any]?
    private var after3SecondsProbe: [String: Any]?
    private var after8SecondsProbe: [String: Any]?
    private var bridgeCalls: [[String: Any]] = []
    private var fatalErrors: [String] = []
    private var cleanupAgentWasRunning = false
    private var finished = false
    private var finishing = false

    init(completion: @escaping Completion) throws {
        let root = FileManager.default.temporaryDirectory
            .appendingPathComponent(
                "stage-sketch-mac-diagnose-adopt-\(UUID().uuidString)",
                isDirectory: true
            )
        try FileManager.default.createDirectory(
            at: root,
            withIntermediateDirectories: true
        )
        let fakeAgentURL = root.appendingPathComponent("fake-agent.sh", isDirectory: false)
        try Self.fakeAgentScript.write(to: fakeAgentURL, atomically: true, encoding: .utf8)
        try FileManager.default.setAttributes(
            [.posixPermissions: NSNumber(value: 0o700)],
            ofItemAtPath: fakeAgentURL.path
        )
        let configuration = try Self.makeConfiguration(fakeAgentURL: fakeAgentURL)
        let environment = WebEnvironment(
            configuration: configuration,
            mcpDataRootURL: root,
            websiteDataStore: .nonPersistent()
        )
        let webView = environment.makeWebView(frame: .zero)

        self.environment = environment
        self.webView = webView
        self.configuration = configuration
        temporaryMCPDataRootURL = root
        self.fakeAgentURL = fakeAgentURL
        self.completion = completion
        super.init()

        webView.configuration.userContentController.addUserScript(WKUserScript(
            source: Self.errorCaptureScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true,
            in: .page
        ))
        webView.navigationDelegate = self
        environment.bridge.diagnosticMessageHandler = { [weak self] name in
            guard let self else { return }
            bridgeCalls.append([
                "name": name,
                "millisecondsSinceStart": Int(Date().timeIntervalSince(startedAt) * 1_000),
            ])
        }
    }

    func start() {
        let timeout = DispatchWorkItem { [weak self] in
            guard let self, !finished else { return }
            fatalErrors.append("stage.html load timed out after 30 seconds")
            webView.stopLoading()
            stopAgentAndFinish()
        }
        navigationTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 30, execute: timeout)
        webView.load(URLRequest(url: URL(string: "shosai://app/stage.html")!))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard !finished, !finishing else { return }
        navigationTimeout?.cancel()
        navigationTimeout = nil
        let timeout = DispatchWorkItem { [weak self] in
            guard let self, !finished, !finishing else { return }
            fatalErrors.append("adopt workflow timed out after 30 seconds")
            stopAgentAndFinish()
        }
        workflowTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 30, execute: timeout)
        // 初期描画の180ms遅延保存が終わってから棚の基準件数を取る。
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in
            self?.runInitialProbe()
        }
    }

    func webView(
        _ webView: WKWebView,
        didFail navigation: WKNavigation!,
        withError error: Error
    ) {
        failNavigation(error)
    }

    func webView(
        _ webView: WKWebView,
        didFailProvisionalNavigation navigation: WKNavigation!,
        withError error: Error
    ) {
        failNavigation(error)
    }

    private func failNavigation(_ error: Error) {
        guard !finished, !finishing else { return }
        navigationTimeout?.cancel()
        navigationTimeout = nil
        fatalErrors.append("stage.html load failed: \(error.localizedDescription)")
        stopAgentAndFinish()
    }

    private func runInitialProbe() {
        webView.evaluateJavaScript(Self.initialProbeScript) { [weak self] value, error in
            guard let self, !finished, !finishing else { return }
            if let error {
                fatalErrors.append("initial interaction failed: \(error.localizedDescription)")
                stopAgentAndFinish()
                return
            }
            guard let object = decodeJSONObject(value) else {
                fatalErrors.append("initial interaction returned invalid JSON")
                stopAgentAndFinish()
                return
            }
            initialProbe = object
            pollForDraft(attempt: 0)
        }
    }

    private func pollForDraft(attempt: Int) {
        guard !finished, !finishing else { return }
        webView.evaluateJavaScript(Self.draftAndAdoptProbeScript) { [weak self] value, error in
            guard let self, !finished, !finishing else { return }
            if let error {
                fatalErrors.append("draft probe failed: \(error.localizedDescription)")
                stopAgentAndFinish()
                return
            }
            guard let object = decodeJSONObject(value) else {
                fatalErrors.append("draft probe returned invalid JSON")
                stopAgentAndFinish()
                return
            }
            if object["adoptClicked"] as? Bool == true {
                draftProbe = object
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
                    self?.captureAfter3Seconds()
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 8) { [weak self] in
                    self?.captureAfter8Seconds()
                }
                return
            }
            if attempt >= 60 {
                draftProbe = object
                fatalErrors.append("draft and adopt button did not become ready within 15 seconds")
                stopAgentAndFinish()
                return
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self] in
                self?.pollForDraft(attempt: attempt + 1)
            }
        }
    }

    private func captureAfter3Seconds() {
        guard !finished, !finishing else { return }
        webView.evaluateJavaScript(Self.snapshotProbeScript) { [weak self] value, error in
            guard let self, !finished, !finishing else { return }
            if let error {
                fatalErrors.append("3-second probe failed: \(error.localizedDescription)")
            } else if let object = decodeJSONObject(value) {
                after3SecondsProbe = object
            } else {
                fatalErrors.append("3-second probe returned invalid JSON")
            }
        }
    }

    private func captureAfter8Seconds() {
        guard !finished, !finishing else { return }
        webView.evaluateJavaScript(Self.snapshotProbeScript) { [weak self] value, error in
            guard let self, !finished, !finishing else { return }
            if let error {
                fatalErrors.append("8-second probe failed: \(error.localizedDescription)")
            } else if let object = decodeJSONObject(value) {
                after8SecondsProbe = object
            } else {
                fatalErrors.append("8-second probe returned invalid JSON")
            }
            workflowTimeout?.cancel()
            workflowTimeout = nil
            stopAgentAndFinish()
        }
    }

    private func stopAgentAndFinish() {
        guard !finished, !finishing else { return }
        finishing = true
        environment.bridge.stopAgentForDiagnostics { [weak self] didStop in
            DispatchQueue.main.async {
                guard let self, !self.finished else { return }
                self.cleanupAgentWasRunning = didStop
                self.finish()
            }
        }
    }

    private func decodeJSONObject(_ value: Any?) -> [String: Any]? {
        guard let text = value as? String,
              let data = text.data(using: .utf8) else {
            return nil
        }
        return (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
    }

    private func finish() {
        guard !finished else { return }
        finished = true
        navigationTimeout?.cancel()
        workflowTimeout?.cancel()

        let initialSnapshot = initialProbe?["snapshot"] as? [String: Any] ?? [:]
        let draftSnapshot = draftProbe?["snapshot"] as? [String: Any] ?? [:]
        let finalSnapshot = after8SecondsProbe ?? [:]
        let initialShelf = initialSnapshot["shelf"] as? [String: Any] ?? [:]
        let finalShelf = finalSnapshot["shelf"] as? [String: Any] ?? [:]
        let initialCount = initialShelf["count"] as? Int ?? -1
        let finalCount = finalShelf["count"] as? Int ?? -1
        let initialShelfIDs = initialShelf["ids"] as? [String] ?? []
        let finalProjectID = finalShelf["currentProjectId"] as? String
        let finalCast = finalSnapshot["cast"] as? [String: Any] ?? [:]
        let finalCastText = finalCast["textContent"] as? String ?? ""
        let finalDraft = finalSnapshot["stageAskDraft"] as? [String: Any] ?? [:]
        let finalBadge = finalSnapshot["draftBadge"] as? [String: Any] ?? [:]
        let draftBadge = draftSnapshot["draftBadge"] as? [String: Any] ?? [:]
        let runAgentCount = bridgeCalls.filter {
            $0["name"] as? String == StageSketchBridge.runAgentMessage
        }.count
        let stages = finalSnapshot["adoptStages"] as? [[String: Any]] ?? []
        let detectedBeforeExit = stages.contains {
            $0["stage"] as? String == "export-detected-before-agent-exit"
        }
        let checks: [String: Bool] = [
            "draftShownBeforeAdopt": (draftSnapshot["stageAskDraft"] as? [String: Any])?["hidden"] as? Bool == false,
            "draftBadgeShownBeforeAdopt": draftBadge["visible"] as? Bool == true,
            "twoAgentCallsCompleted": runAgentCount == 2,
            "shelfIncreasedByOne": initialCount >= 0 && finalCount == initialCount + 1,
            "newShowSelected": finalProjectID.map { !initialShelfIDs.contains($0) } ?? false,
            "exportUsedBeforeAgentExit": detectedBeforeExit,
            "newPerformerInCastDOM": finalCastText.contains("演者1"),
            "draftPanelCleared": finalDraft["hidden"] as? Bool == true,
            "draftBadgeCleared": finalBadge["visible"] as? Bool == false,
            "noCapturedExceptions": ((finalSnapshot["exceptions"] as? [Any]) ?? []).isEmpty,
        ]
        let ok = fatalErrors.isEmpty
            && initialProbe != nil
            && draftProbe != nil
            && after3SecondsProbe != nil
            && after8SecondsProbe != nil
            && checks.values.allSatisfy { $0 }
        let payload: [String: Any] = [
            "ok": ok,
            "mode": "adopt",
            "pageURL": "shosai://app/stage.html",
            "agent": [
                "command": configuration.agentExecutableURL.path,
                "arguments": configuration.agentArguments,
                "fake": true,
            ],
            "mcpDataRoot": [
                "path": temporaryMCPDataRootURL.path,
                "temporary": true,
                "passedToAgentAs": "STAGE_SKETCH_MCP_DATA_DIR",
            ],
            "fakeAgentPath": fakeAgentURL.path,
            "snapshots": [
                "immediatelyAfterRequest": initialSnapshot,
                "immediatelyBeforeAdopt": draftSnapshot,
                "after3Seconds": after3SecondsProbe ?? [:],
                "after8Seconds": finalSnapshot,
            ],
            "adoptStages": finalSnapshot["adoptStages"] ?? [],
            "exceptions": finalSnapshot["exceptions"] ?? [],
            "bridgeCalls": bridgeCalls,
            "checks": checks,
            "cleanup": [
                "stopAgentAttempted": true,
                "agentWasRunningAtCleanup": cleanupAgentWasRunning,
            ],
            "fatalErrors": fatalErrors,
        ]
        let data = (try? JSONSerialization.data(
            withJSONObject: payload,
            options: [.prettyPrinted, .sortedKeys]
        )) ?? Data(#"{"ok":false,"fatalErrors":["JSON encoding failed"]}"#.utf8)
        completion(data, ok ? 0 : 1)
    }

    private static func makeConfiguration(fakeAgentURL: URL) throws -> AppConfiguration {
        let defaults = UserDefaults.standard
        let domainName = UserDefaults.argumentDomain
        let originalDomain = defaults.volatileDomain(forName: domainName)
        var diagnosticDomain = originalDomain
        diagnosticDomain["AgentCommand"] = fakeAgentURL.path
        diagnosticDomain["AgentArgs"] = ""
        defaults.setVolatileDomain(diagnosticDomain, forName: domainName)
        defer {
            defaults.setVolatileDomain(originalDomain, forName: domainName)
        }
        return try AppConfiguration(defaults: defaults)
    }

    private static let errorCaptureScript = #"""
    (() => {
      "use strict";
      const startedAt = Date.now();
      const diagnosis = {
        startedAt,
        exceptions: [],
        stages: [],
        draftBadgeVisible: false
      };
      const details = (error) => ({
        name: error && typeof error.name === "string" ? error.name : null,
        message: error && typeof error.message === "string" ? error.message : String(error ?? ""),
        stack: error && typeof error.stack === "string" ? error.stack : null
      });
      Object.defineProperty(window, "__stageAdoptDiagnosis", {
        value: diagnosis,
        configurable: false,
        enumerable: false,
        writable: false
      });
      const previousOnError = window.onerror;
      window.onerror = function(message, source, line, column, error) {
        diagnosis.exceptions.push({
          type: "window.onerror",
          millisecondsSinceInstall: Date.now() - startedAt,
          message: String(message ?? ""),
          source: typeof source === "string" ? source : null,
          line: Number(line) || null,
          column: Number(column) || null,
          error: details(error)
        });
        return typeof previousOnError === "function"
          ? previousOnError.apply(this, arguments)
          : false;
      };
      window.addEventListener("unhandledrejection", (event) => {
        diagnosis.exceptions.push({
          type: "unhandledrejection",
          millisecondsSinceInstall: Date.now() - startedAt,
          reason: details(event.reason)
        });
      });
      window.confirm = () => true;
    })();
    """#

    private static let snapshotFunction = #"""
      const elementState = (selector) => {
        const element = document.querySelector(selector);
        return {
          exists: Boolean(element),
          hidden: element ? Boolean(element.hidden) : null,
          textContent: element ? element.textContent : null
        };
      };
      const parseStorage = (key, fallback) => {
        try { return JSON.parse(localStorage.getItem(key) || fallback); }
        catch (error) { return { __error: String(error && error.stack || error) }; }
      };
      const current = parseStorage("shosai-stage-sketch-v1", "{}");
      const shows = parseStorage("shosai-stage-shows-v1", "{}");
      const showEntries = shows && typeof shows === "object" && !Array.isArray(shows)
        ? Object.entries(shows)
        : [];
      const diagnosis = window.__stageAdoptDiagnosis || {};
      const castHost = document.querySelector("#stage-cast-list");
      return {
        stageAskIdle: elementState("#stage-ask-idle"),
        stageAskRunning: elementState("#stage-ask-running"),
        stageAskElapsed: elementState("#stage-ask-elapsed"),
        stageAskError: elementState("#stage-ask-error"),
        stageAskDraft: elementState("#stage-ask-draft"),
        stageAskAdopt: elementState("#stage-ask-adopt"),
        draftBadge: { visible: Boolean(diagnosis.draftBadgeVisible) },
        cast: {
          rowCount: castHost ? castHost.querySelectorAll(".stage-cast-row").length : null,
          textContent: castHost ? castHost.textContent : null,
          names: castHost
            ? [...castHost.querySelectorAll(".stage-cast-name")].map((node) => node.textContent)
            : []
        },
        shelf: {
          count: showEntries.length,
          names: showEntries.map(([, entry]) => entry?.state?.project?.title ?? null),
          ids: showEntries.map(([id]) => id),
          currentProjectId: current?.project?.id ?? null,
          currentTitle: current?.project?.title ?? null,
          currentCastNames: Array.isArray(current?.project?.cast)
            ? current.project.cast.map((item) => item?.name ?? null)
            : [],
          currentPieceCastIds: Array.isArray(current?.project?.scenes)
            ? current.project.scenes.flatMap((scene) => (scene?.pieces || [])
              .map((piece) => piece?.castId).filter(Boolean))
            : []
        },
        adoptStages: Array.isArray(diagnosis.stages) ? diagnosis.stages.slice() : [],
        exceptions: Array.isArray(diagnosis.exceptions) ? diagnosis.exceptions.slice() : []
      };
    """#

    private static let initialProbeScript = #"""
    (() => {
      "use strict";
      localStorage.setItem("shosai-stage-agent-permission-v1", "accepted");
      const showsOpen = document.querySelector("#stage-shows-open");
      const showsClose = document.querySelector("#stage-shows-close");
      if (showsOpen) showsOpen.click();
      if (showsClose) showsClose.click();
      const input = document.querySelector("#stage-ask-input");
      const run = document.querySelector("#stage-ask-run");
      if (input) {
        input.value = "演者を1人追加して";
        input.dispatchEvent(new Event("input", { bubbles: true }));
      }
      if (run) run.click();
      const snapshot = (() => {
    \#(snapshotFunction)
      })();
      return JSON.stringify({
        requestedText: input ? input.value : null,
        requestClicked: Boolean(run),
        snapshot
      });
    })()
    """#

    private static let draftAndAdoptProbeScript = #"""
    (() => {
      "use strict";
      const draft = document.querySelector("#stage-ask-draft");
      const adopt = document.querySelector("#stage-ask-adopt");
      const ready = Boolean(draft && !draft.hidden && adopt && !adopt.hidden);
      const snapshot = (() => {
    \#(snapshotFunction)
      })();
      if (ready) adopt.click();
      return JSON.stringify({ ready, adoptClicked: ready, snapshot });
    })()
    """#

    private static let snapshotProbeScript = #"""
    (() => {
      "use strict";
      const snapshot = (() => {
    \#(snapshotFunction)
      })();
      return JSON.stringify(snapshot);
    })()
    """#

    private static let fakeAgentScript = #"""
    #!/bin/sh
    set -eu
    data_root="${STAGE_SKETCH_MCP_DATA_DIR:?STAGE_SKETCH_MCP_DATA_DIR is required}"
    count_file="$data_root/diagnose-adopt-call-count"
    count=0
    if [ -f "$count_file" ]; then
      count=$(sed -n '1p' "$count_file")
    fi
    count=$((count + 1))
    printf '%s\n' "$count" > "$count_file"
    mkdir -p "$data_root/plans" "$data_root/exports"
    /usr/bin/python3 - "$data_root" "$count" <<'PY'
    import copy
    import glob
    import json
    import os
    import sys

    root = sys.argv[1]
    call = int(sys.argv[2])
    projects = sorted(glob.glob(os.path.join(root, "projects", "*.json")))
    if len(projects) != 1:
        raise SystemExit(f"expected one project, found {len(projects)}")
    with open(projects[0], encoding="utf-8") as handle:
        document = json.load(handle)
    project = document["project"]
    project_id = project["id"]
    revision = int(document.get("mcpMeta", {}).get("revision", 1))
    scene = next(item for item in project["scenes"] if item.get("kind", "scene") == "scene")
    plan_id = "plan-diagnose-adopt"
    plan_path = os.path.join(root, "plans", f"{plan_id}.json")
    placement = {
        "assetType": "performer", "assetName": "演者1", "language": "ja",
        "u": 0.62, "v": 0.46, "size": 100, "color": "#a84b26",
        "facing": 0, "pose": "stand", "heightCm": 165,
    }
    piece_diff = {
        "change": "add", "assetType": "performer", "label": "演者1",
        "from": None,
        "to": {"u": 0.62, "v": 0.46, "size": 100, "color": "#a84b26", "facing": 0},
    }

    if call == 1:
        plan = {
            "kind": "stage-sketch-edit-plan", "version": 1, "planId": plan_id,
            "projectId": project_id, "expectedRevision": revision,
            "request": "演者を1人追加して", "status": "proposed",
            "operations": [{"op": "add_placement", "sceneId": scene["id"], "placement": placement}],
            "diff": [{
                "sceneId": scene["id"], "sceneTitle": scene.get("title", "シーン 1"),
                "before": [], "after": ["演者1"], "lines": ["演者1を追加。"],
                "pieces": [piece_diff],
            }],
            "summary": "演者1を追加。", "warnings": [], "questions": [],
            "requiresConfirmation": True,
        }
        with open(plan_path, "w", encoding="utf-8") as handle:
            json.dump(plan, handle, ensure_ascii=False, indent=2, sort_keys=True)
            handle.write("\n")
        print("fake plan created")
        raise SystemExit(0)

    if call != 2:
        raise SystemExit(f"unexpected fake agent call {call}")
    with open(plan_path, encoding="utf-8") as handle:
        plan = json.load(handle)
    cast_id = "diagnose-cast-1"
    piece_id = "diagnose-piece-1"
    project.setdefault("cast", []).append({
        "id": cast_id, "name": "演者1", "color": "#a84b26",
        "heightCm": 165, "note": "", "locked": False,
    })
    scene.setdefault("pieces", []).append({
        "id": piece_id, "type": "performer", "castId": cast_id,
        "u": 0.62, "v": 0.46, "size": 100, "color": "#a84b26",
        "name": "", "facing": 0, "pose": "stand",
    })
    applied_revision = revision + 1
    metadata = dict(document.get("mcpMeta", {}))
    metadata.update({"status": "applied", "revision": applied_revision})
    document["mcpMeta"] = metadata
    plan["status"] = "applied"
    plan["appliedRevision"] = applied_revision
    with open(projects[0], "w", encoding="utf-8") as handle:
        json.dump(document, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")
    with open(plan_path, "w", encoding="utf-8") as handle:
        json.dump(plan, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")
    exported = copy.deepcopy(document)
    exported.pop("mcpMeta", None)
    exported["editSummary"] = {
        "planId": plan_id, "request": plan["request"], "summary": plan["summary"],
        "baseRevision": revision, "appliedRevision": applied_revision,
        "diff": plan["diff"], "warnings": plan["warnings"],
    }
    export_path = os.path.join(root, "exports", "diagnose-adopt-result.json")
    with open(export_path, "w", encoding="utf-8") as handle:
        json.dump(exported, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")
    print("fake plan applied and export created")
    PY
    if [ "$count" -eq 2 ]; then
      sleep 20
    fi
    """#
}
