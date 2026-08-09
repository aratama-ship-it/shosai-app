import AppKit
import WebKit

final class AppDelegate: NSObject, NSApplicationDelegate {
    private var window: NSWindow?
    private var environment: WebEnvironment?
    private var downloadCoordinator: WebDownloadCoordinator?
    private var mainMenuController: MainMenuController?
    private var webUIDelegate: MacWebUIDelegate?

    func applicationDidFinishLaunching(_ notification: Notification) {
        do {
            let appConfiguration = try AppConfiguration()
            let environment = WebEnvironment(configuration: appConfiguration)
            self.environment = environment

            let initialFrame = NSRect(x: 0, y: 0, width: 1320, height: 860)
            let window = NSWindow(
                contentRect: initialFrame,
                styleMask: [.titled, .closable, .miniaturizable, .resizable],
                backing: .buffered,
                defer: false
            )
            window.title = "制作の書斎"
            window.minSize = NSSize(width: 900, height: 620)
            window.center()

            let webView = environment.makeWebView(frame: window.contentView?.bounds ?? initialFrame)
            let webUIDelegate = MacWebUIDelegate.installForNormalStartup(on: webView)
            self.webUIDelegate = webUIDelegate
            let downloadCoordinator = WebDownloadCoordinator()
            webView.navigationDelegate = downloadCoordinator
            self.downloadCoordinator = downloadCoordinator
            webView.autoresizingMask = [.width, .height]
            window.contentView = webView

            let mainMenuController = MainMenuController(webView: webView)
            mainMenuController.install(on: NSApp)
            self.mainMenuController = mainMenuController

            window.makeKeyAndOrderFront(nil)
            self.window = window

            webView.load(URLRequest(url: URL(string: "shosai://app/index.html")!))
            environment.startExportMonitoring()
            NSApp.activate(ignoringOtherApps: true)
        } catch {
            let alert = NSAlert()
            alert.messageText = "制作の書斎を起動できません"
            alert.informativeText = error.localizedDescription
            alert.alertStyle = .critical
            alert.runModal()
            NSApp.terminate(nil)
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}
