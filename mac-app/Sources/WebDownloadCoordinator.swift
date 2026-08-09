import AppKit
import WebKit

// <a download> を通常ブラウザと同じ保存操作へつなぐ。Web側はMac専用APIへ分岐しない。
final class WebDownloadCoordinator: NSObject, WKNavigationDelegate, WKDownloadDelegate {
    private var activeDownloads: [ObjectIdentifier: WKDownload] = [:]

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        decisionHandler(navigationAction.shouldPerformDownload ? .download : .allow)
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
