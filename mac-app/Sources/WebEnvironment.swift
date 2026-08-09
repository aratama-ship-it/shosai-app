import AppKit
import Foundation
import WebKit

final class WebEnvironment {
    let configuration: AppConfiguration
    let schemeHandler: ShosaiSchemeHandler
    let exportStore: ExportStore
    let projectStore: StageSketchProjectStore
    let bridge: StageSketchBridge

    private let webViewConfiguration: WKWebViewConfiguration
    private var exportMonitor: ExportMonitor?

    init(
        configuration: AppConfiguration,
        mcpDataRootURL: URL? = nil,
        websiteDataStore: WKWebsiteDataStore = .default()
    ) {
        self.configuration = configuration
        schemeHandler = ShosaiSchemeHandler(rootURL: configuration.webRootURL)
        let dataRootURL = mcpDataRootURL
            ?? configuration.exportsURL.deletingLastPathComponent()
        exportStore = ExportStore(
            directoryURL: dataRootURL.appendingPathComponent("exports", isDirectory: true)
        )
        projectStore = StageSketchProjectStore(dataRootURL: dataRootURL)
        let agentEnvironmentOverrides = mcpDataRootURL == nil
            ? [:]
            : ["STAGE_SKETCH_MCP_DATA_DIR": dataRootURL.path]
        bridge = StageSketchBridge(
            exportStore: exportStore,
            projectStore: projectStore,
            agentRunner: AgentRunner(
                configuration: configuration,
                environmentOverrides: agentEnvironmentOverrides
            )
        )

        let contentController = WKUserContentController()
        bridge.install(in: contentController)

        let webConfiguration = WKWebViewConfiguration()
        webConfiguration.userContentController = contentController
        webConfiguration.websiteDataStore = websiteDataStore
        webConfiguration.setURLSchemeHandler(schemeHandler, forURLScheme: "shosai")
        webViewConfiguration = webConfiguration
    }

    func makeWebView(frame: NSRect) -> WKWebView {
        let webView = WKWebView(frame: frame, configuration: webViewConfiguration)
        bridge.webView = webView
        return webView
    }

    func startExportMonitoring() {
        guard exportMonitor == nil else { return }
        let monitor = ExportMonitor(store: exportStore) { [weak bridge] entry in
            bridge?.notifyEditAvailable(entry)
        }
        exportMonitor = monitor
        monitor.start()
    }
}
