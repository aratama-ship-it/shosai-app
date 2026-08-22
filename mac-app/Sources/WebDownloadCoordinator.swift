import AppKit
import WebKit

enum WebNavigationDecision: Equatable {
    case allow
    case download
    case cancel
    case openExternally(URL)
}

// <a download> を通常ブラウザと同じ保存操作へつなぐ。Web側はMac専用APIへ分岐しない。
final class WebDownloadCoordinator: NSObject, WKNavigationDelegate, WKDownloadDelegate {
    private var activeDownloads: [ObjectIdentifier: WKDownload] = [:]

    static func decision(
        for url: URL?,
        scheme: String?,
        isMainFrame: Bool,
        isLinkActivated: Bool,
        shouldPerformDownload: Bool
    ) -> WebNavigationDecision {
        if shouldPerformDownload { return .download }
        guard let url else { return .cancel }

        let normalizedScheme = (scheme ?? url.scheme ?? "").lowercased()
        if normalizedScheme == "shosai" { return .allow }
        if isMainFrame,
           isLinkActivated,
           normalizedScheme == "http" || normalizedScheme == "https" {
            return .openExternally(url)
        }
        return .cancel
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        let url = navigationAction.request.url
        switch Self.decision(
            for: url,
            scheme: url?.scheme,
            isMainFrame: navigationAction.targetFrame?.isMainFrame ?? true,
            isLinkActivated: navigationAction.navigationType == .linkActivated,
            shouldPerformDownload: navigationAction.shouldPerformDownload
        ) {
        case .allow:
            decisionHandler(.allow)
        case .download:
            decisionHandler(.download)
        case .cancel:
            decisionHandler(.cancel)
        case .openExternally(let target):
            decisionHandler(.cancel)
            NSWorkspace.shared.open(target)
        }
    }

    func webView(
        _ webView: WKWebView,
        navigationAction: WKNavigationAction,
        didBecome download: WKDownload
    ) {
        activeDownloads[ObjectIdentifier(download)] = download
        download.delegate = self
    }

    func download(
        _ download: WKDownload,
        decideDestinationUsing response: URLResponse,
        suggestedFilename: String,
        completionHandler: @escaping (URL?) -> Void
    ) {
        let panel = NSSavePanel()
        panel.canCreateDirectories = true
        panel.nameFieldStringValue = suggestedFilename
        panel.begin { response in
            completionHandler(response == .OK ? panel.url : nil)
        }
    }

    func downloadDidFinish(_ download: WKDownload) {
        activeDownloads.removeValue(forKey: ObjectIdentifier(download))
    }

    func download(
        _ download: WKDownload,
        didFailWithError error: Error,
        resumeData: Data?
    ) {
        activeDownloads.removeValue(forKey: ObjectIdentifier(download))
        guard (error as? URLError)?.code != .cancelled else { return }
        let alert = NSAlert()
        alert.messageText = "ファイルを保存できませんでした"
        alert.informativeText = error.localizedDescription
        alert.alertStyle = .warning
        alert.runModal()
    }
}
