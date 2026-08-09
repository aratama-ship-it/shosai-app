import AppKit
import Foundation
import WebKit

final class SelfTestRunner: NSObject, WKNavigationDelegate {
    typealias Completion = (Data, Int32) -> Void

    private let environment: WebEnvironment
    private let agentRunner: AgentRunner
    private let webView: WKWebView
    private let completion: Completion
    private var results: [Int: [String: Any]] = [:]
    private var navigationCompletion: ((Result<Void, Error>) -> Void)?
    private var navigationTimeout: DispatchWorkItem?
    private var finished = false

    init(configuration: AppConfiguration, completion: @escaping Completion) {
        let temporaryMCPDataRootURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("stage-sketch-mac-self-test-\(UUID().uuidString)", isDirectory: true)
        environment = WebEnvironment(
            configuration: configuration,
            mcpDataRootURL: temporaryMCPDataRootURL,
            websiteDataStore: .nonPersistent()
        )
        agentRunner = AgentRunner(configuration: configuration)
        webView = environment.makeWebView(frame: .zero)
        self.completion = completion
        super.init()
        webView.navigationDelegate = self
    }

    func start() {
        let activationPolicy = NSApp.activationPolicy()
        record(
            id: 10,
            name: "no-main-menu-in-self-test",
            ok: activationPolicy == .prohibited && NSApp.mainMenu == nil,
            detail: "activationPolicy=\(activationPolicy.rawValue), mainMenu=\(NSApp.mainMenu == nil ? "nil" : "present")"
        )
        let normalStartupProbe = WKWebView(frame: .zero)
        let normalStartupUIDelegate = MacWebUIDelegate.installForNormalStartup(
            on: normalStartupProbe
        )
        let normalDelegateInstalled = normalStartupProbe.uiDelegate === normalStartupUIDelegate
        let selfTestRemainsHeadless = webView.uiDelegate == nil
        record(
            id: 12,
            name: "normal-startup-ui-delegate-and-headless-defaults",
            ok: normalDelegateInstalled && selfTestRemainsHeadless,
            detail: "normalStartupUIDelegate=\(normalDelegateInstalled ? "installed" : "missing"), selfTestUIDelegate=\(selfTestRemainsHeadless ? "nil" : "present")"
        )
        testAgentVersion()
    }

    private func testAgentVersion() {
        agentRunner.testVersion { [weak self] result in
            DispatchQueue.main.async {
                guard let self else { return }
                self.record(
                    id: 11,
                    name: "agent-version-with-runtime-environment",
                    ok: result.ok,
                    detail: result.detail
                )
                self.testIndexPage()
            }
        }
    }

    private func testIndexPage() {
        load(path: "index.html") { [weak self] loadResult in
            guard let self else { return }
            switch loadResult {
            case .success:
                self.record(
                    id: 1,
                    name: "load-index",
                    ok: true,
                    detail: "shosai://app/index.html loaded"
                )
                self.testIndexTitle()
            case .failure(let error):
                self.record(id: 1, name: "load-index", ok: false, detail: error.localizedDescription)
                self.record(id: 2, name: "index-title", ok: false, detail: "index page did not load")
                self.record(id: 3, name: "bridge-present", ok: false, detail: "index page did not load")
                self.record(id: 4, name: "list-edit-exports", ok: false, detail: "index page did not load")
                self.testStagePage()
            }
        }
    }

    private func testIndexTitle() {
        let script = #"""
        JSON.stringify({
          title: document.title,
          migrationType: typeof window.SHOSAI_STORAGE_MIGRATION,
          exportButton: Boolean(document.getElementById("btn-storage-migration-export")),
          importButton: Boolean(document.getElementById("btn-storage-migration-import"))
        })
        """#
        webView.evaluateJavaScript(script) { [weak self] value, error in
            guard let self else { return }
            let text = value as? String ?? ""
            let data = text.data(using: .utf8) ?? Data()
            let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let title = object?["title"] as? String ?? ""
            let migrationType = object?["migrationType"] as? String ?? ""
            let exportButton = object?["exportButton"] as? Bool ?? false
            let importButton = object?["importButton"] as? Bool ?? false
            self.record(
                id: 2,
                name: "index-title",
                ok: error == nil
                    && !title.isEmpty
                    && migrationType == "object"
                    && exportButton
                    && importButton,
                detail: error?.localizedDescription ?? text
            )
            self.testBridgePresence()
        }
    }

    private func testBridgePresence() {
        let script = #"""
        JSON.stringify({
          bridgeType: typeof window.stageSketchBridge,
          stopType: typeof window.stageSketchBridge?.stopAgent
        })
        """#
        webView.evaluateJavaScript(script) { [weak self] value, error in
            guard let self else { return }
            let text = value as? String ?? ""
            let data = text.data(using: .utf8) ?? Data()
            let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            let bridgeType = object?["bridgeType"] as? String ?? ""
            let stopType = object?["stopType"] as? String ?? ""
            self.record(
                id: 3,
                name: "bridge-present",
                ok: error == nil && bridgeType == "object" && stopType == "function",
                detail: error?.localizedDescription ?? text
            )
            self.testAgentInfo()
        }
    }

    private func testAgentInfo() {
        let script = #"""
        const info = await window.stageSketchBridge.agentInfo();
        return JSON.stringify({
          command: info.command,
          args: info.args,
          modelValue: info.model,
          reasoningEffortValue: info.reasoningEffort,
          hasModel: Object.prototype.hasOwnProperty.call(info, "model"),
          hasReasoningEffort: Object.prototype.hasOwnProperty.call(info, "reasoningEffort"),
          source: info.source
        });
        """#
        webView.callAsyncJavaScript(
            script,
            arguments: [:],
            in: nil,
            in: .page
        ) { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let value):
                let text = value as? String ?? ""
                let data = text.data(using: .utf8) ?? Data()
                let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
                let command = object?["command"] as? String ?? ""
                let args = object?["args"] as? String
                let source = object?["source"] as? String ?? ""
                let modelValue = object?["modelValue"]
                let reasoningEffortValue = object?["reasoningEffortValue"]
                let modelIsValid = modelValue is String || modelValue is NSNull
                let reasoningEffortIsValid = reasoningEffortValue is String
                    || reasoningEffortValue is NSNull
                let ok = !command.isEmpty
                    && args != nil
                    && object?["hasModel"] as? Bool == true
                    && object?["hasReasoningEffort"] as? Bool == true
                    && modelIsValid
                    && reasoningEffortIsValid
                    && ["defaults", "codex-config", "unknown"].contains(source)
                self.record(
                    id: 13,
                    name: "agent-info-values",
                    ok: ok,
                    detail: text.isEmpty ? "bridge verification returned no data" : text
                )
            case .failure(let error):
                self.record(
                    id: 13,
                    name: "agent-info-values",
                    ok: false,
                    detail: error.localizedDescription
                )
            }
            self.testListEditExports()
        }
    }

    private func testListEditExports() {
        let script = #"""
        const entries = await window.stageSketchBridge.listEditExports();
        const stopIdle = await window.stageSketchBridge.stopAgent();
        let readObject = true;
        let readName = null;
        if (Array.isArray(entries) && entries.length > 0) {
          readName = entries[0].name;
          const value = await window.stageSketchBridge.readExport(readName);
          readObject = value !== null && typeof value === "object" && !Array.isArray(value);
        }
        return JSON.stringify({
          isArray: Array.isArray(entries),
          stopIdle,
          readObject,
          readName
        });
        """#
        webView.callAsyncJavaScript(
            script,
            arguments: [:],
            in: nil,
            in: .page
        ) { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let value):
                let text = value as? String ?? ""
                let data = text.data(using: .utf8) ?? Data()
                let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
                let isArray = object?["isArray"] as? Bool ?? false
                let stopIdle = object?["stopIdle"] as? Bool
                let readObject = object?["readObject"] as? Bool ?? false
                let ok = isArray && stopIdle == false && readObject
                self.record(
                    id: 4,
                    name: "list-edit-exports",
                    ok: ok,
                    detail: text.isEmpty ? "bridge verification returned no data" : text
                )
            case .failure(let error):
                self.record(
                    id: 4,
                    name: "list-edit-exports",
                    ok: false,
                    detail: error.localizedDescription
                )
            }
            self.testStagePage()
        }
    }

    private func testStagePage() {
        load(path: "stage.html") { [weak self] loadResult in
            guard let self else { return }
            guard case .success = loadResult else {
                let detail: String
                if case .failure(let error) = loadResult {
                    detail = error.localizedDescription
                } else {
                    detail = "stage page did not load"
                }
                self.record(id: 5, name: "load-stage-and-bridge", ok: false, detail: detail)
                self.testTraversalRejection()
                return
            }

            let script = #"""
            const exports = await window.stageSketchBridge.listEditExports();
            return JSON.stringify({
              title: document.title,
              bridgeType: typeof window.stageSketchBridge,
              stopType: typeof window.stageSketchBridge.stopAgent,
              askPanel: Boolean(document.getElementById("stage-ask-panel")),
              exportsIsArray: Array.isArray(exports)
            });
            """#
            self.webView.callAsyncJavaScript(
                script,
                arguments: [:],
                in: nil,
                in: .page
            ) { [weak self] result in
                guard let self else { return }
                switch result {
                case .success(let value):
                    let text = value as? String ?? ""
                    let data = text.data(using: .utf8) ?? Data()
                    let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
                    let title = object?["title"] as? String ?? ""
                    let bridgeType = object?["bridgeType"] as? String ?? ""
                    let stopType = object?["stopType"] as? String ?? ""
                    let askPanel = object?["askPanel"] as? Bool ?? false
                    let exportsIsArray = object?["exportsIsArray"] as? Bool ?? false
                    let ok = !title.isEmpty
                        && bridgeType == "object"
                        && stopType == "function"
                        && askPanel
                        && exportsIsArray
                    self.record(
                        id: 5,
                        name: "load-stage-and-bridge",
                        ok: ok,
                        detail: text.isEmpty ? "stage verification returned no data" : text
                    )
                case .failure(let error):
                    self.record(
                        id: 5,
                        name: "load-stage-and-bridge",
                        ok: false,
                        detail: error.localizedDescription
                    )
                }
                self.testTraversalRejection()
            }
        }
    }

    private func testTraversalRejection() {
        let traversalURL = URL(string: "shosai://app/../../secret")!
        let status = environment.schemeHandler.statusCode(for: traversalURL)
        record(
            id: 6,
            name: "reject-path-traversal",
            ok: status == 404,
            detail: "status \(status)"
        )
        testInvalidProjectWrite()
    }

    private func testInvalidProjectWrite() {
        let script = #"""
        try {
          await window.stageSketchBridge.writeProject({
            kind: "shosai-stage-sketch",
            version: 2,
            project: { id: "self-test-invalid-version", scenes: [] }
          });
          return JSON.stringify({ rejected: false, error: null });
        } catch (error) {
          return JSON.stringify({ rejected: true, error: String(error && error.message || error) });
        }
        """#
        webView.callAsyncJavaScript(
            script,
            arguments: [:],
            in: nil,
            in: .page
        ) { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let value):
                let text = value as? String ?? ""
                let data = text.data(using: .utf8) ?? Data()
                let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
                self.record(
                    id: 7,
                    name: "write-project-reject-invalid-version",
                    ok: object?["rejected"] as? Bool == true,
                    detail: text.isEmpty ? "bridge verification returned no data" : text
                )
            case .failure(let error):
                self.record(
                    id: 7,
                    name: "write-project-reject-invalid-version",
                    ok: false,
                    detail: error.localizedDescription
                )
            }
            self.testWriteProjectAndLatestPlan()
        }
    }

    private func testWriteProjectAndLatestPlan() {
        let script = #"""
        const document = {
          kind: "shosai-stage-sketch",
          version: 3,
          project: {
            id: "self-test-roundtrip",
            title: "Self Test",
            venue: "proscenium",
            venueSize: "mid",
            cast: [],
            sets: [],
            scenes: [{
              id: "scene-1",
              kind: "scene",
              title: "Self Test Scene",
              pieces: []
            }],
            activeSceneId: "scene-1"
          }
        };
        const first = await window.stageSketchBridge.writeProject(document);
        const second = await window.stageSketchBridge.writeProject(document);
        const plan = await window.stageSketchBridge.latestPlan(first.projectId);
        return JSON.stringify({ first, second, plan });
        """#
        webView.callAsyncJavaScript(
            script,
            arguments: [:],
            in: nil,
            in: .page
        ) { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let value):
                let text = value as? String ?? ""
                let data = text.data(using: .utf8) ?? Data()
                let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
                let first = object?["first"] as? [String: Any]
                let second = object?["second"] as? [String: Any]
                let planIsNull = object?["plan"] is NSNull
                let ok = first?["projectId"] as? String == "self-test-roundtrip"
                    && first?["revision"] as? Int == 1
                    && second?["revision"] as? Int == 2
                    && planIsNull
                self.record(
                    id: 8,
                    name: "write-project-latest-plan-roundtrip",
                    ok: ok,
                    detail: text.isEmpty ? "bridge verification returned no data" : text
                )
            case .failure(let error):
                self.record(
                    id: 8,
                    name: "write-project-latest-plan-roundtrip",
                    ok: false,
                    detail: error.localizedDescription
                )
            }
            self.testProjectIDTraversalRejection()
        }
    }

    private func testProjectIDTraversalRejection() {
        let script = #"""
        try {
          await window.stageSketchBridge.writeProject({
            kind: "shosai-stage-sketch",
            version: 3,
            project: { id: "../outside", scenes: [] }
          });
          return JSON.stringify({ rejected: false, error: null });
        } catch (error) {
          return JSON.stringify({ rejected: true, error: String(error && error.message || error) });
        }
        """#
        webView.callAsyncJavaScript(
            script,
            arguments: [:],
            in: nil,
            in: .page
        ) { [weak self] result in
            guard let self else { return }
            switch result {
            case .success(let value):
                let text = value as? String ?? ""
                let data = text.data(using: .utf8) ?? Data()
                let object = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
                self.record(
                    id: 9,
                    name: "write-project-reject-project-id-traversal",
                    ok: object?["rejected"] as? Bool == true,
                    detail: text.isEmpty ? "bridge verification returned no data" : text
                )
            case .failure(let error):
                self.record(
                    id: 9,
                    name: "write-project-reject-project-id-traversal",
                    ok: false,
                    detail: error.localizedDescription
                )
            }
            self.finish()
        }
    }

    private func load(path: String, completion: @escaping (Result<Void, Error>) -> Void) {
        navigationTimeout?.cancel()
        navigationCompletion = completion
        let timeout = DispatchWorkItem { [weak self] in
            guard let self, let pending = self.navigationCompletion else { return }
            self.navigationCompletion = nil
            self.webView.stopLoading()
            pending(.failure(URLError(.timedOut)))
        }
        navigationTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 30, execute: timeout)
        webView.load(URLRequest(url: URL(string: "shosai://app/\(path)")!))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        finishNavigation(with: .success(()))
    }

    func webView(
        _ webView: WKWebView,
        didFail navigation: WKNavigation!,
        withError error: Error
    ) {
        finishNavigation(with: .failure(error))
    }

    func webView(
        _ webView: WKWebView,
        didFailProvisionalNavigation navigation: WKNavigation!,
        withError error: Error
    ) {
        finishNavigation(with: .failure(error))
    }

    private func finishNavigation(with result: Result<Void, Error>) {
        guard let pending = navigationCompletion else { return }
        navigationCompletion = nil
        navigationTimeout?.cancel()
        navigationTimeout = nil
        pending(result)
    }

    private func record(id: Int, name: String, ok: Bool, detail: String) {
        results[id] = [
            "id": id,
            "name": name,
            "ok": ok,
            "detail": detail
        ]
    }

    private func finish() {
        guard !finished else { return }
        finished = true
        navigationTimeout?.cancel()

        for id in 1...13 where results[id] == nil {
            record(id: id, name: "missing-result", ok: false, detail: "test did not run")
        }

        let orderedResults = (1...13).compactMap { results[$0] }
        let ok = orderedResults.allSatisfy { $0["ok"] as? Bool == true }
        let payload: [String: Any] = [
            "ok": ok,
            "results": orderedResults
        ]
        let data = (try? JSONSerialization.data(
            withJSONObject: payload,
            options: [.prettyPrinted, .sortedKeys]
        )) ?? Data(#"{"ok":false,"results":[]}"#.utf8)
        completion(data, ok ? 0 : 1)
    }
}
