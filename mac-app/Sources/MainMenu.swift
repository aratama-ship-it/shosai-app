import AppKit
import WebKit

final class MainMenuController: NSObject {
    private weak var webView: WKWebView?

    init(webView: WKWebView) {
        self.webView = webView
        super.init()
    }

    func install(on application: NSApplication) {
        let mainMenu = NSMenu()
        mainMenu.addItem(makeApplicationMenuItem(application: application))
        mainMenu.addItem(makeEditMenuItem())
        mainMenu.addItem(makeViewMenuItem())

        let windowMenuItem = makeWindowMenuItem()
        mainMenu.addItem(windowMenuItem)

        application.mainMenu = mainMenu
        application.windowsMenu = windowMenuItem.submenu
    }

    private func makeApplicationMenuItem(application: NSApplication) -> NSMenuItem {
        let menuItem = NSMenuItem(title: "制作の書斎", action: nil, keyEquivalent: "")
        let menu = NSMenu(title: "制作の書斎")
        menuItem.submenu = menu

        menu.addItem(item(
            title: "制作の書斎について",
            action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)),
            target: application
        ))
        menu.addItem(.separator())
        menu.addItem(item(
            title: "制作の書斎を隠す",
            action: #selector(NSApplication.hide(_:)),
            keyEquivalent: "h",
            target: application
        ))
        menu.addItem(item(
            title: "ほかを隠す",
            action: #selector(NSApplication.hideOtherApplications(_:)),
            keyEquivalent: "h",
            modifiers: [.command, .option],
            target: application
        ))
        menu.addItem(item(
            title: "すべてを表示",
            action: #selector(NSApplication.unhideAllApplications(_:)),
            target: application
        ))
        menu.addItem(.separator())
        menu.addItem(item(
            title: "制作の書斎を終了",
            action: #selector(NSApplication.terminate(_:)),
            keyEquivalent: "q",
            target: application
        ))

        return menuItem
    }

    private func makeEditMenuItem() -> NSMenuItem {
        let menuItem = NSMenuItem(title: "編集", action: nil, keyEquivalent: "")
        let menu = NSMenu(title: "編集")
        menuItem.submenu = menu

        menu.addItem(item(
            title: "取り消す",
            action: Selector(("undo:")),
            keyEquivalent: "z"
        ))
        menu.addItem(item(
            title: "やり直す",
            action: Selector(("redo:")),
            keyEquivalent: "z",
            modifiers: [.command, .shift]
        ))
        menu.addItem(.separator())
        menu.addItem(item(
            title: "カット",
            action: #selector(NSText.cut(_:)),
            keyEquivalent: "x"
        ))
        menu.addItem(item(
            title: "コピー",
            action: #selector(NSText.copy(_:)),
            keyEquivalent: "c"
        ))
        menu.addItem(item(
            title: "ペースト",
            action: #selector(NSText.paste(_:)),
            keyEquivalent: "v"
        ))
        menu.addItem(item(
            title: "すべてを選択",
            action: #selector(NSText.selectAll(_:)),
            keyEquivalent: "a"
        ))

        return menuItem
    }

    private func makeViewMenuItem() -> NSMenuItem {
        let menuItem = NSMenuItem(title: "表示", action: nil, keyEquivalent: "")
        let menu = NSMenu(title: "表示")
        menuItem.submenu = menu

        menu.addItem(item(
            title: "再読み込み",
            action: #selector(reloadFromOrigin(_:)),
            keyEquivalent: "r",
            target: self
        ))
        menu.addItem(.separator())
        menu.addItem(item(
            title: "実際のサイズ",
            action: #selector(resetPageZoom(_:)),
            keyEquivalent: "0",
            target: self
        ))
        menu.addItem(item(
            title: "拡大",
            action: #selector(increasePageZoom(_:)),
            keyEquivalent: "+",
            target: self
        ))
        menu.addItem(item(
            title: "縮小",
            action: #selector(decreasePageZoom(_:)),
            keyEquivalent: "-",
            target: self
        ))

        return menuItem
    }

    private func makeWindowMenuItem() -> NSMenuItem {
        let menuItem = NSMenuItem(title: "ウインドウ", action: nil, keyEquivalent: "")
        let menu = NSMenu(title: "ウインドウ")
        menuItem.submenu = menu

        menu.addItem(item(
            title: "しまう",
            action: #selector(NSWindow.performMiniaturize(_:)),
            keyEquivalent: "m"
        ))
        menu.addItem(item(
            title: "閉じる",
            action: #selector(NSWindow.performClose(_:)),
            keyEquivalent: "w"
        ))
        menu.addItem(item(
            title: "ズーム",
            action: #selector(NSWindow.performZoom(_:))
        ))

        return menuItem
    }

    private func item(
        title: String,
        action: Selector?,
        keyEquivalent: String = "",
        modifiers: NSEvent.ModifierFlags = [.command],
        target: AnyObject? = nil
    ) -> NSMenuItem {
        let menuItem = NSMenuItem(
            title: title,
            action: action,
            keyEquivalent: keyEquivalent
        )
        menuItem.keyEquivalentModifierMask = modifiers
        menuItem.target = target
        return menuItem
    }

    @objc private func reloadFromOrigin(_ sender: Any?) {
        webView?.reloadFromOrigin()
    }

    @objc private func resetPageZoom(_ sender: Any?) {
        webView?.pageZoom = 1.0
    }

    @objc private func increasePageZoom(_ sender: Any?) {
        adjustPageZoom(by: 0.1)
    }

    @objc private func decreasePageZoom(_ sender: Any?) {
        adjustPageZoom(by: -0.1)
    }

    private func adjustPageZoom(by delta: CGFloat) {
        guard let webView else { return }
        let rounded = ((webView.pageZoom + delta) * 10).rounded() / 10
        webView.pageZoom = min(max(rounded, 0.5), 3.0)
    }
}
