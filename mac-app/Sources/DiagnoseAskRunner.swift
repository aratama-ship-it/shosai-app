import AppKit
import Foundation
import WebKit

enum DiagnoseAskMode: String {
    case echo
    case real
    case accept

    var automaticallyAcceptsConfirmation: Bool {
        self == .accept
    }

    var usesRealCommand: Bool {
        self == .real
    }

    func makeConfiguration(defaults: UserDefaults = .standard) throws -> AppConfiguration {
        guard !usesRealCommand else {
            return try AppConfiguration(defaults: defaults)
        }

        let domainName = UserDefaults.argumentDomain
        let originalDomain = defaults.volatileDomain(forName: domainName)
        var diagnosticDomain = originalDomain
        diagnosticDomain["AgentCommand"] = "/bin/echo"
        defaults.setVolatileDomain(diagnosticDomain, forName: domainName)
        defer {
            defaults.setVolatileDomain(originalDomain, forName: domainName)
        }
        return try AppConfiguration(defaults: defaults)
    }
}

final class DiagnoseAskRunner: NSObject, WKNavigationDelegate {
    typealias Completion = (Data, Int32) -> Void

    private let environment: WebEnvironment
    private let webView: WKWebView
    private let configuration: AppConfiguration
    private let mode: DiagnoseAskMode
    private let temporaryMCPDataRootURL: URL
    private let completion: Completion
    private let startedAt = Date()
    private var navigationTimeout: DispatchWorkItem?
    private var probeTimeout: DispatchWorkItem?
    private var initialProbe: [String: Any]?
    private var finalProbe: [String: Any]?
    private var bridgeCalls: [[String: Any]] = []
    private var fatalErrors: [String] = []
    private var cleanupAgentWasRunning = false
    private var finishing = false
    private var finished = false

    init(
        configuration: AppConfiguration,
        mode: DiagnoseAskMode,
        completion: @escaping Completion
    ) {
        let temporaryMCPDataRootURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(
                "stage-sketch-mac-diagnose-ask-\(UUID().uuidString)",
                isDirectory: true
            )
        let environment = WebEnvironment(
            configuration: configuration,
            mcpDataRootURL: temporaryMCPDataRootURL,
            websiteDataStore: .nonPersistent()
        )
        let webView = environment.makeWebView(frame: .zero)

        self.environment = environment
        self.webView = webView
        self.configuration = configuration
        self.mode = mode
        self.temporaryMCPDataRootURL = temporaryMCPDataRootURL
        self.completion = completion
        super.init()

        webView.configuration.userContentController.addUserScript(WKUserScript(
            source: Self.errorCaptureScript(
                autoAcceptPermission: mode.automaticallyAcceptsConfirmation
            ),
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true,
            in: .page
        ))
        webView.navigationDelegate = self
        environment.bridge.diagnosticMessageHandler = { [weak self] name in
            guard let self else { return }
            self.bridgeCalls.append([
                "name": name,
                "millisecondsSinceStart": Int(
                    Date().timeIntervalSince(self.startedAt) * 1_000
                )
            ])
        }
    }

    func start() {
        let timeout = DispatchWorkItem { [weak self] in
            guard let self, !self.finished else { return }
            self.fatalErrors.append("stage.html load timed out after 30 seconds")
            self.webView.stopLoading()
            self.stopAgentAndFinish()
        }
        navigationTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 30, execute: timeout)
        webView.load(URLRequest(url: URL(string: "shosai://app/stage.html")!))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        guard !finished, !finishing else { return }
        navigationTimeout?.cancel()
        navigationTimeout = nil
        runInitialProbe()
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
        let timeout = makeProbeTimeout(label: "initial JavaScript probe", seconds: 15)
        probeTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 15, execute: timeout)
        webView.evaluateJavaScript(Self.initialProbeScript) { [weak self] value, error in
            guard let self, !self.finished, !self.finishing else { return }
            self.probeTimeout?.cancel()
            self.probeTimeout = nil
            if let error {
                self.fatalErrors.append("initial JavaScript probe failed: \(error.localizedDescription)")
                self.stopAgentAndFinish()
                return
            }
            guard let object = self.decodeJSONObject(value) else {
                self.fatalErrors.append("initial JavaScript probe returned invalid JSON")
                self.stopAgentAndFinish()
                return
            }
            self.initialProbe = object
            DispatchQueue.main.asyncAfter(deadline: .now() + 3) { [weak self] in
                self?.runFinalProbe()
            }
        }
    }

    private func runFinalProbe() {
        guard !finished else { return }
        let timeout = makeProbeTimeout(label: "3-second JavaScript probe", seconds: 15)
        probeTimeout = timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 15, execute: timeout)
        webView.evaluateJavaScript(Self.finalProbeScript) { [weak self] value, error in
            guard let self, !self.finished, !self.finishing else { return }
            self.probeTimeout?.cancel()
            self.probeTimeout = nil
            if let error {
                self.fatalErrors.append("3-second JavaScript probe failed: \(error.localizedDescription)")
            } else if let object = self.decodeJSONObject(value) {
                self.finalProbe = object
            } else {
                self.fatalErrors.append("3-second JavaScript probe returned invalid JSON")
            }
            self.stopAgentAndFinish()
        }
    }

    private func makeProbeTimeout(label: String, seconds: Int) -> DispatchWorkItem {
        DispatchWorkItem { [weak self] in
            guard let self, !self.finished, !self.finishing else { return }
            self.fatalErrors.append("\(label) timed out after \(seconds) seconds")
            self.stopAgentAndFinish()
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
        probeTimeout?.cancel()

        let initial = initialProbe ?? [:]
        let final = finalProbe ?? [:]
        let initialPermission = initial["permission"] as? [String: Any] ?? [:]
        let value: ([String: Any], String) -> Any = { object, key in
            object[key] ?? NSNull()
        }
        let confirmations = final["confirmations"] as? [[String: Any]] ?? []
        let confirmationResult = confirmations.last?["result"] as? Bool
        let finalSnapshot = final["snapshot"] as? [String: Any] ?? [:]
        let stageAskError = finalSnapshot["stageAskError"] as? [String: Any] ?? [:]
        let cancellationRendered = stageAskError["hidden"] as? Bool == false
            && stageAskError["textContent"] as? String == "取り消しました"
        let runAgentReached = bridgeCalls.contains { call in
            call["name"] as? String == StageSketchBridge.runAgentMessage
        }
        let uiDelegateAbsent = webView.uiDelegate == nil
        let confirmationMatchedMode = confirmationResult == mode.automaticallyAcceptsConfirmation
        let diagnosticChecks: [String: Bool] = [
            "headlessUIDelegateAbsent": uiDelegateAbsent,
            "confirmationMatchedMode": confirmationMatchedMode,
            "cancellationRenderedWhenRejected": mode.automaticallyAcceptsConfirmation
                || cancellationRendered,
            "runAgentReachedWhenAccepted": !mode.automaticallyAcceptsConfirmation
                || runAgentReached,
            "runAgentSkippedWhenRejected": mode.automaticallyAcceptsConfirmation
                || !runAgentReached
        ]
        let ok = fatalErrors.isEmpty
            && initialProbe != nil
            && finalProbe != nil
            && diagnosticChecks.values.allSatisfy { $0 }
        let payload: [String: Any] = [
            "ok": ok,
            "mode": mode.rawValue,
            "pageURL": "shosai://app/stage.html",
            "agent": [
                "command": configuration.agentExecutableURL.path,
                "arguments": configuration.agentArguments,
                "usesRealCommand": mode.usesRealCommand
            ],
            "mcpDataRoot": [
                "path": temporaryMCPDataRootURL.path,
                "temporary": true,
                "passedToAgentAs": "STAGE_SKETCH_MCP_DATA_DIR"
            ],
            "bridgeMethods": value(initial, "bridgeMethods"),
            "bridgeAvailable": value(initial, "bridgeAvailable"),
            "elements": value(initial, "elements"),
            "interaction": value(initial, "interaction"),
            "permission": [
                "key": value(initialPermission, "key"),
                "beforeClick": value(initialPermission, "beforeClick"),
                "immediatelyAfterClick": value(initialPermission, "immediatelyAfterClick"),
                "after3Seconds": value(final, "permissionAfter3Seconds")
            ],
            "snapshots": [
                "immediatelyAfterClick": value(initial, "snapshot"),
                "after3Seconds": value(final, "snapshot")
            ],
            "errorCapture": value(final, "errorCapture"),
            "confirmations": value(final, "confirmations"),
            "checks": diagnosticChecks,
            "exceptions": value(final, "exceptions"),
            "bridgeCalls": bridgeCalls,
            "cleanup": [
                "stopAgentAttempted": true,
                "agentWasRunningAtCleanup": cleanupAgentWasRunning
            ],
            "fatalErrors": fatalErrors
        ]
        let data = (try? JSONSerialization.data(
            withJSONObject: payload,
            options: [.prettyPrinted, .sortedKeys]
        )) ?? Data(#"{"ok":false,"fatalErrors":["JSON encoding failed"]}"#.utf8)
        completion(data, ok ? 0 : 1)
    }

    private static func errorCaptureScript(autoAcceptPermission: Bool) -> String {
        let confirmExpression = autoAcceptPermission
            ? "true"
            : "originalConfirm ? Boolean(originalConfirm(message)) : false"
        return #"""
    (() => {
      "use strict";
      const startedAt = Date.now();
      const state = {
        installed: true,
        installedAt: new Date().toISOString(),
        phase: "loading",
        exceptions: [],
        confirmations: [],
        unhandledRejectionListenerInstalled: false
      };
      const errorDetails = (error) => ({
        name: error && typeof error.name === "string" ? error.name : null,
        message: error && typeof error.message === "string" ? error.message : String(error ?? ""),
        stack: error && typeof error.stack === "string" ? error.stack : null
      });
      const recordException = (type, details) => {
        state.exceptions.push({
          type,
          phase: state.phase,
          millisecondsSinceInstall: Date.now() - startedAt,
          ...details
        });
      };
      Object.defineProperty(window, "__stageAskDiagnosis", {
        value: state,
        configurable: false,
        enumerable: false,
        writable: false
      });

      const previousOnError = window.onerror;
      window.onerror = function(message, source, line, column, error) {
        recordException("window.onerror", {
          message: String(message ?? ""),
          source: typeof source === "string" ? source : null,
          line: Number.isFinite(Number(line)) ? Number(line) : null,
          column: Number.isFinite(Number(column)) ? Number(column) : null,
          error: errorDetails(error)
        });
        if (typeof previousOnError === "function") {
          return previousOnError.apply(this, arguments);
        }
        return false;
      };

      window.addEventListener("unhandledrejection", (event) => {
        recordException("unhandledrejection", {
          reason: errorDetails(event.reason)
        });
      });
      state.unhandledRejectionListenerInstalled = true;

      const originalConfirm = typeof window.confirm === "function"
        ? window.confirm.bind(window)
        : null;
      window.confirm = function(message) {
        const call = {
          phase: state.phase,
          millisecondsSinceInstall: Date.now() - startedAt,
          message: String(message ?? ""),
          result: null,
          error: null
        };
        try {
          call.result = \#(confirmExpression);
          return call.result;
        } catch (error) {
          call.error = errorDetails(error);
          recordException("window.confirm", { error: call.error });
          throw error;
        } finally {
          state.confirmations.push(call);
        }
      };
    })();
    """#
    }

    private static let initialProbeScript = #"""
    (() => {
      "use strict";
      const diagnosis = window.__stageAskDiagnosis || null;
      const bridge = window.stageSketchBridge;
      const model = window.SHOSAI_STAGE_AI_PANEL_MODEL;
      const methodNames = [
        "runAgent", "stopAgent", "writeProject",
        "latestPlan", "listEditExports", "readExport"
      ];
      const bridgeMethods = Object.fromEntries(
        methodNames.map((name) => [name, typeof bridge?.[name]])
      );
      let bridgeAvailable = null;
      let bridgeAvailabilityError = null;
      try {
        bridgeAvailable = typeof model?.isBridgeAvailable === "function"
          ? Boolean(model.isBridgeAvailable(bridge))
          : null;
      } catch (error) {
        bridgeAvailabilityError = String(error && error.stack || error);
      }
      const permissionKey = typeof model?.permissionKey === "string"
        ? model.permissionKey
        : "shosai-stage-agent-permission-v1";
      const readPermission = () => {
        try {
          return { value: window.localStorage.getItem(permissionKey), error: null };
        } catch (error) {
          return { value: null, error: String(error && error.stack || error) };
        }
      };
      const elementState = (selector) => {
        const element = document.querySelector(selector);
        return {
          exists: Boolean(element),
          hidden: element ? Boolean(element.hidden) : null,
          textContent: element ? element.textContent : null
        };
      };
      const snapshot = () => ({
        stageAskIdle: elementState("#stage-ask-idle"),
        stageAskRunning: elementState("#stage-ask-running"),
        stageAskElapsed: elementState("#stage-ask-elapsed"),
        stageAskError: elementState("#stage-ask-error"),
        stageAskDraft: elementState("#stage-ask-draft")
      });
      const permissionBefore = readPermission();
      if (diagnosis) diagnosis.phase = "interaction";

      const input = document.querySelector("#stage-ask-input");
      const run = document.querySelector("#stage-ask-run");
      const interaction = {
        requestedText: "1場面目の照明を画面左へ寄せて",
        inputEventDispatched: false,
        clickDispatched: false,
        synchronousError: null
      };
      try {
        if (input) {
          input.value = interaction.requestedText;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          interaction.inputEventDispatched = true;
        }
        if (run) {
          run.click();
          interaction.clickDispatched = true;
        }
      } catch (error) {
        interaction.synchronousError = String(error && error.stack || error);
      }

      return JSON.stringify({
        bridgeMethods,
        bridgeAvailable: {
          result: bridgeAvailable,
          error: bridgeAvailabilityError,
          modelType: typeof model,
          isBridgeAvailableType: typeof model?.isBridgeAvailable
        },
        elements: {
          askPanel: Boolean(document.querySelector('[data-panel="ask"]')),
          stageAskRun: Boolean(run),
          stageAskInput: Boolean(input)
        },
        interaction,
        permission: {
          key: permissionKey,
          beforeClick: permissionBefore,
          immediatelyAfterClick: readPermission()
        },
        snapshot: snapshot()
      });
    })()
    """#

    private static let finalProbeScript = #"""
    (() => {
      "use strict";
      const diagnosis = window.__stageAskDiagnosis || null;
      const model = window.SHOSAI_STAGE_AI_PANEL_MODEL;
      const permissionKey = typeof model?.permissionKey === "string"
        ? model.permissionKey
        : "shosai-stage-agent-permission-v1";
      const readPermission = () => {
        try {
          return { value: window.localStorage.getItem(permissionKey), error: null };
        } catch (error) {
          return { value: null, error: String(error && error.stack || error) };
        }
      };
      const elementState = (selector) => {
        const element = document.querySelector(selector);
        return {
          exists: Boolean(element),
          hidden: element ? Boolean(element.hidden) : null,
          textContent: element ? element.textContent : null
        };
      };
      return JSON.stringify({
        snapshot: {
          stageAskIdle: elementState("#stage-ask-idle"),
          stageAskRunning: elementState("#stage-ask-running"),
          stageAskElapsed: elementState("#stage-ask-elapsed"),
          stageAskError: elementState("#stage-ask-error"),
          stageAskDraft: elementState("#stage-ask-draft")
        },
        permissionAfter3Seconds: readPermission(),
        errorCapture: {
          installed: Boolean(diagnosis?.installed),
          installedAt: diagnosis?.installedAt ?? null,
          currentPhase: diagnosis?.phase ?? null,
          windowOnErrorType: typeof window.onerror,
          unhandledRejectionListenerInstalled:
            Boolean(diagnosis?.unhandledRejectionListenerInstalled)
        },
        confirmations: Array.isArray(diagnosis?.confirmations)
          ? diagnosis.confirmations.slice()
          : [],
        exceptions: Array.isArray(diagnosis?.exceptions)
          ? diagnosis.exceptions.slice()
          : []
      });
    })()
    """#
}
