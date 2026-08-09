import Foundation
import WebKit

final class ShosaiSchemeHandler: NSObject, WKURLSchemeHandler {
    private let rootURL: URL
    private let rootPathPrefix: String

    init(rootURL: URL) {
        let canonicalRoot = rootURL.standardizedFileURL.resolvingSymlinksInPath()
        self.rootURL = canonicalRoot
        self.rootPathPrefix = canonicalRoot.path.hasSuffix("/")
            ? canonicalRoot.path
            : canonicalRoot.path + "/"
        super.init()
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let requestURL = urlSchemeTask.request.url else {
            send(status: 404, data: Data(), mimeType: "text/plain", to: urlSchemeTask)
            return
        }

        guard let fileURL = resolvedFileURL(for: requestURL),
              FileManager.default.isReadableFile(atPath: fileURL.path),
              let data = try? Data(contentsOf: fileURL, options: [.mappedIfSafe]) else {
            send(status: 404, data: Data(), mimeType: "text/plain", to: urlSchemeTask)
            return
        }

        send(status: 200, data: data, mimeType: mimeType(for: fileURL), to: urlSchemeTask)
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // Data is delivered synchronously, so there is no outstanding operation to cancel.
    }

    func statusCode(for requestURL: URL) -> Int {
        guard let fileURL = resolvedFileURL(for: requestURL),
              FileManager.default.isReadableFile(atPath: fileURL.path) else {
            return 404
        }
        return 200
    }

    private func resolvedFileURL(for requestURL: URL) -> URL? {
        guard requestURL.scheme?.lowercased() == "shosai",
              requestURL.host?.lowercased() == "app",
              let components = URLComponents(url: requestURL, resolvingAgainstBaseURL: false) else {
            return nil
        }

        let encodedPath = components.percentEncodedPath
        guard var decodedPath = encodedPath.removingPercentEncoding,
              !decodedPath.contains("\0") else {
            return nil
        }

        while decodedPath.hasPrefix("/") {
            decodedPath.removeFirst()
        }
        if decodedPath.isEmpty {
            decodedPath = "index.html"
        }

        let candidate = rootURL
            .appendingPathComponent(decodedPath, isDirectory: false)
            .standardizedFileURL
            .resolvingSymlinksInPath()
        let candidatePath = candidate.path

        guard candidatePath != rootURL.path,
              candidatePath.hasPrefix(rootPathPrefix) else {
            return nil
        }
        return candidate
    }

    private func send(
        status: Int,
        data: Data,
        mimeType: String,
        to task: WKURLSchemeTask
    ) {
        guard let requestURL = task.request.url,
              let response = HTTPURLResponse(
                url: requestURL,
                statusCode: status,
                httpVersion: "HTTP/1.1",
                headerFields: [
                    "Cache-Control": "no-store",
                    "Content-Length": String(data.count),
                    "Content-Type": mimeType
                ]
              ) else {
            task.didFailWithError(URLError(.badServerResponse))
            return
        }

        task.didReceive(response)
        if !data.isEmpty {
            task.didReceive(data)
        }
        task.didFinish()
    }

    private func mimeType(for fileURL: URL) -> String {
        switch fileURL.pathExtension.lowercased() {
        case "html":
            return "text/html; charset=utf-8"
        case "js":
            return "text/javascript; charset=utf-8"
        case "css":
            return "text/css; charset=utf-8"
        case "json":
            return "application/json; charset=utf-8"
        case "png":
            return "image/png"
        case "svg":
            return "image/svg+xml"
        case "webmanifest":
            return "application/manifest+json; charset=utf-8"
        case "woff2":
            return "font/woff2"
        case "jpg", "jpeg":
            return "image/jpeg"
        case "gif":
            return "image/gif"
        case "webp":
            return "image/webp"
        case "ico":
            return "image/x-icon"
        default:
            return "application/octet-stream"
        }
    }
}
