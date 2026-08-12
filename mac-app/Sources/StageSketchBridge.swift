import Foundation
import WebKit

final class StageSketchBridge: NSObject, WKScriptMessageHandlerWithReply {
    static let runAgentMessage = "stageSketchRunAgent"
    static let stopAgentMessage = "stageSketchStopAgent"
    static let agentInfoMessage = "stageSketchAgentInfo"
    static let listExportsMessage = "stageSketchListEditExports"
    static let readExportMessage = "stageSketchReadExport"
    static let writeProjectMessage = "stageSketchWriteProject"
    static let latestPlanMessage = "stageSketchLatestPlan"

    weak var webView: WKWebView?
    var diagnosticMessageHandler: ((String) -> Void)?

    private let exportStore: ExportStore
    private let projectStore: StageSketchProjectStore
    private let agentRunner: AgentRunner

    init(
        exportStore: ExportStore,
        projectStore: StageSketchProjectStore,
        agentRunner: AgentRunner
    ) {
        self.exportStore = exportStore
        self.projectStore = projectStore
        self.agentRunner = agentRunner
        super.init()
    }

    func install(in userContentController: WKUserContentController) {
        userContentController.addScriptMessageHandler(
            self,
            contentWorld: .page,
            name: Self.runAgentMessage
        )
        userContentController.addScriptMessageHandler(
            self,
            contentWorld: .page,
            name: Self.stopAgentMessage
        )
        userContentController.addScriptMessageHandler(
            self,
            contentWorld: .page,
            name: Self.agentInfoMessage
        )
        userContentController.addScriptMessageHandler(
            self,
            contentWorld: .page,
            name: Self.listExportsMessage
        )
        userContentController.addScriptMessageHandler(
            self,
            contentWorld: .page,
            name: Self.readExportMessage
        )
        userContentController.addScriptMessageHandler(
            self,
            contentWorld: .page,
            name: Self.writeProjectMessage
        )
        userContentController.addScriptMessageHandler(
            self,
            contentWorld: .page,
            name: Self.latestPlanMessage
        )
        userContentController.addUserScript(WKUserScript(
            source: Self.injectionScript,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true,
            in: .page
        ))
    }

    func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage,
        replyHandler: @escaping (Any?, String?) -> Void
    ) {
        diagnosticMessageHandler?(message.name)
        switch message.name {
        case Self.runAgentMessage:
            guard let body = message.body as? [String: Any],
                  let prompt = body["prompt"] as? String else {
                replyHandler(nil, "runAgent accepts only a prompt string.")
                return
            }
            agentRunner.run(prompt: prompt) { result in
                DispatchQueue.main.async {
                    replyHandler(result.bridgeValue, nil)
                }
            }

        case Self.stopAgentMessage:
            agentRunner.stop { didStop in
                DispatchQueue.main.async {
                    replyHandler(didStop, nil)
                }
            }

        case Self.agentInfoMessage:
            replyHandler(agentRunner.agentInfo.bridgeValue, nil)

        case Self.listExportsMessage:
            do {
                replyHandler(try exportStore.listEditExports(), nil)
            } catch {
                replyHandler(nil, error.localizedDescription)
            }

        case Self.readExportMessage:
            guard let body = message.body as? [String: Any],
                  let name = body["name"] as? String else {
                replyHandler(nil, "readExport accepts only an export file name.")
                return
            }
            do {
                replyHandler(try exportStore.readExport(named: name), nil)
            } catch {
                replyHandler(nil, error.localizedDescription)
            }

        case Self.writeProjectMessage:
            guard let body = message.body as? [String: Any],
                  let document = body["document"] as? [String: Any] else {
                replyHandler(nil, "writeProject accepts only a document object.")
                return
            }
            do {
                replyHandler(try projectStore.writeProject(document), nil)
            } catch {
                replyHandler(nil, error.localizedDescription)
            }

        case Self.latestPlanMessage:
            guard let body = message.body as? [String: Any],
                  let projectID = body["projectId"] as? String else {
                replyHandler(nil, "latestPlan accepts only a projectId string.")
                return
            }
            do {
                let plan = try projectStore.latestPlan(projectID: projectID)
                replyHandler(plan ?? NSNull(), nil)
            } catch {
                replyHandler(nil, error.localizedDescription)
            }

        default:
            replyHandler(nil, "Unknown bridge operation.")
        }
    }

    func stopAgentForDiagnostics(completion: @escaping (Bool) -> Void) {
        agentRunner.stop(completion: completion)
    }

    func notifyEditAvailable(_ entry: [String: Any]) {
        guard JSONSerialization.isValidJSONObject(entry),
              let data = try? JSONSerialization.data(withJSONObject: entry),
              let json = String(data: data, encoding: .utf8) else {
            return
        }
        DispatchQueue.main.async { [weak self] in
            self?.webView?.evaluateJavaScript(
                "window.__stageSketchNotifyEditAvailable?.(\(json));",
                completionHandler: nil
            )
        }
    }

    private static let injectionScript = #"""
    (() => {
      "use strict";
      const handlers = window.webkit && window.webkit.messageHandlers;
      if (!handlers) return;

      const callbacks = new Set();
      const bridge = {
        version: "1",
        platform: "macos",
        runAgent(prompt) {
          if (typeof prompt !== "string") {
            return Promise.reject(new TypeError("runAgent expects a prompt string."));
          }
          return handlers.stageSketchRunAgent.postMessage({ prompt });
        },
        stopAgent() {
          return handlers.stageSketchStopAgent.postMessage({});
        },
        agentInfo() {
          return handlers.stageSketchAgentInfo.postMessage({});
        },
        listEditExports() {
          return handlers.stageSketchListEditExports.postMessage({});
        },
        readExport(name) {
          if (typeof name !== "string") {
            return Promise.reject(new TypeError("readExport expects a file name."));
          }
          return handlers.stageSketchReadExport.postMessage({ name });
        },
        writeProject(document) {
          if (document === null || typeof document !== "object" || Array.isArray(document)) {
            return Promise.reject(new TypeError("writeProject expects a document object."));
          }
          return handlers.stageSketchWriteProject.postMessage({ document });
        },
        latestPlan(projectId) {
          if (typeof projectId !== "string") {
            return Promise.reject(new TypeError("latestPlan expects a projectId string."));
          }
          return handlers.stageSketchLatestPlan.postMessage({ projectId });
        },
        onEditAvailable(callback) {
          if (typeof callback !== "function") {
            throw new TypeError("onEditAvailable expects a callback.");
          }
          callbacks.add(callback);
        }
      };

      Object.defineProperty(window, "stageSketchBridge", {
        value: Object.freeze(bridge),
        configurable: false,
        enumerable: true,
        writable: false
      });
      Object.defineProperty(window, "__stageSketchNotifyEditAvailable", {
        value(entry) {
          for (const callback of callbacks) {
            try {
              callback(entry);
            } catch (error) {
              console.error("stageSketchBridge onEditAvailable callback failed.", error);
            }
          }
        },
        configurable: false,
        enumerable: false,
        writable: false
      });
    })();
    """#
}
