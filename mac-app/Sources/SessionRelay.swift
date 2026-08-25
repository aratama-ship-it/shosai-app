import AppKit
import Foundation
import Security

private struct SessionCredentials {
    let user: String
    let password: String
}

private enum SessionCredentialStoreError: LocalizedError {
    case keychain(OSStatus)
    case invalidItem

    var errorDescription: String? {
        switch self {
        case .keychain(let status):
            return "Keychain operation failed (\(status))."
        case .invalidItem:
            return "The saved session login is invalid."
        }
    }
}

private final class SessionCredentialStore {
    static let service = "shosai-app-session"

    func load() throws -> SessionCredentials? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.service,
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecReturnAttributes as String: true,
            kSecReturnData as String: true
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess else {
            throw SessionCredentialStoreError.keychain(status)
        }
        guard let result = item as? [String: Any],
              let user = result[kSecAttrAccount as String] as? String,
              let passwordData = result[kSecValueData as String] as? Data,
              let password = String(data: passwordData, encoding: .utf8),
              !user.isEmpty,
              !password.isEmpty else {
            throw SessionCredentialStoreError.invalidItem
        }
        return SessionCredentials(user: user, password: password)
    }

    func save(_ credentials: SessionCredentials) throws {
        try remove()
        let item: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.service,
            kSecAttrAccount as String: credentials.user,
            kSecValueData as String: Data(credentials.password.utf8),
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]
        let status = SecItemAdd(item as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw SessionCredentialStoreError.keychain(status)
        }
    }

    func remove() throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: Self.service
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw SessionCredentialStoreError.keychain(status)
        }
    }
}

final class SessionRelay: NSObject, URLSessionWebSocketDelegate {
    static let productionOrigin = "https://shosai-app.juggler-arata.workers.dev"

    var eventHandler: (([String: Any]) -> Void)?

    private let credentialStore: SessionCredentialStore
    private var urlSession: URLSession!
    private var webSocketTask: URLSessionWebSocketTask?
    private var startInProgress = false

    override convenience init() {
        self.init(credentialStore: SessionCredentialStore())
    }

    private init(credentialStore: SessionCredentialStore) {
        self.credentialStore = credentialStore
        super.init()
        let configuration = URLSessionConfiguration.ephemeral
        configuration.waitsForConnectivity = false
        urlSession = URLSession(
            configuration: configuration,
            delegate: self,
            delegateQueue: OperationQueue.main
        )
    }

    func startSession(completion: @escaping ([String: Any]) -> Void) {
        dispatchPrecondition(condition: .onQueue(.main))
        guard !startInProgress else {
            completion(Self.failure("network"))
            return
        }
        startInProgress = true

        do {
            if let credentials = try credentialStore.load() {
                createSession(credentials: credentials, shouldSave: false, completion: completion)
            } else {
                promptAndCreateSession(showUnauthorizedMessage: false, completion: completion)
            }
        } catch {
            finishStart(Self.failure("network"), completion: completion)
        }
    }

    func connect(
        roomID: String,
        role: String,
        name: String,
        hostKey: String,
        completion: @escaping ([String: Any]) -> Void
    ) {
        dispatchPrecondition(condition: .onQueue(.main))
        guard Self.validRoomID(roomID),
              role == "host" || role == "guest",
              !name.isEmpty,
              role != "host" || !hostKey.isEmpty else {
            completion(Self.failure("http-400"))
            return
        }

        let credentials: SessionCredentials
        do {
            guard let saved = try credentialStore.load() else {
                completion(Self.failure("unauthorized"))
                return
            }
            credentials = saved
        } catch {
            completion(Self.failure("network"))
            return
        }

        guard var components = URLComponents(string: Self.productionOrigin) else {
            completion(Self.failure("network"))
            return
        }
        components.scheme = "wss"
        components.path = "/session/\(roomID)/ws"
        var queryItems = [
            URLQueryItem(name: "role", value: role),
            URLQueryItem(name: "name", value: name)
        ]
        if role == "host" {
            queryItems.append(URLQueryItem(name: "key", value: hostKey))
        }
        components.queryItems = queryItems
        guard let url = components.url else {
            completion(Self.failure("network"))
            return
        }

        replaceCurrentSocket()
        var request = URLRequest(url: url)
        request.timeoutInterval = 30
        request.setValue(Self.basicAuthorization(credentials), forHTTPHeaderField: "Authorization")
        let task = urlSession.webSocketTask(with: request)
        webSocketTask = task
        task.resume()
        completion(["ok": true])
    }

    func send(text: String, completion: @escaping ([String: Any]) -> Void) {
        dispatchPrecondition(condition: .onQueue(.main))
        guard let task = webSocketTask else {
            completion(["ok": false])
            return
        }
        task.send(.string(text)) { [weak self, weak task] error in
            DispatchQueue.main.async {
                guard let self, let task, self.webSocketTask === task else {
                    completion(["ok": false])
                    return
                }
                if error != nil {
                    self.failCurrentSocket(task)
                    completion(["ok": false])
                } else {
                    completion(["ok": true])
                }
            }
        }
    }

    func disconnect(completion: @escaping ([String: Any]) -> Void) {
        dispatchPrecondition(condition: .onQueue(.main))
        if let task = webSocketTask {
            webSocketTask = nil
            task.cancel(with: .goingAway, reason: nil)
            emit(["type": "close"])
        }
        completion(["ok": true])
    }

    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didOpenWithProtocol protocol: String?
    ) {
        guard self.webSocketTask === webSocketTask else { return }
        emit(["type": "open"])
        receiveNextMessage(from: webSocketTask)
    }

    func urlSession(
        _ session: URLSession,
        webSocketTask: URLSessionWebSocketTask,
        didCloseWith closeCode: URLSessionWebSocketTask.CloseCode,
        reason: Data?
    ) {
        guard self.webSocketTask === webSocketTask else { return }
        self.webSocketTask = nil
        emit(["type": "close"])
    }

    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didCompleteWithError error: Error?
    ) {
        guard let webSocketTask = task as? URLSessionWebSocketTask,
              self.webSocketTask === webSocketTask,
              let error else { return }
        let nsError = error as NSError
        if nsError.domain == NSURLErrorDomain
            && nsError.code == NSURLErrorUserAuthenticationRequired {
            try? credentialStore.remove()
        }
        failCurrentSocket(webSocketTask)
    }

    private func promptAndCreateSession(
        showUnauthorizedMessage: Bool,
        completion: @escaping ([String: Any]) -> Void
    ) {
        guard let credentials = promptForCredentials(
            showUnauthorizedMessage: showUnauthorizedMessage
        ) else {
            finishStart(Self.failure("cancelled"), completion: completion)
            return
        }
        createSession(credentials: credentials, shouldSave: true, completion: completion)
    }

    private func createSession(
        credentials: SessionCredentials,
        shouldSave: Bool,
        completion: @escaping ([String: Any]) -> Void
    ) {
        guard let originURL = URL(string: Self.productionOrigin) else {
            finishStart(Self.failure("network"), completion: completion)
            return
        }
        var request = URLRequest(url: originURL.appendingPathComponent("session/new"))
        request.httpMethod = "POST"
        request.timeoutInterval = 30
        request.setValue(Self.basicAuthorization(credentials), forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        urlSession.dataTask(with: request) { [weak self] data, response, error in
            DispatchQueue.main.async {
                guard let self else { return }
                guard error == nil, let httpResponse = response as? HTTPURLResponse else {
                    self.finishStart(Self.failure("network"), completion: completion)
                    return
                }
                if httpResponse.statusCode == 401 {
                    do {
                        try self.credentialStore.remove()
                    } catch {
                        self.finishStart(Self.failure("unauthorized"), completion: completion)
                        return
                    }
                    self.promptAndCreateSession(
                        showUnauthorizedMessage: true,
                        completion: completion
                    )
                    return
                }
                guard httpResponse.statusCode == 200 else {
                    self.finishStart(
                        Self.failure("http-\(httpResponse.statusCode)"),
                        completion: completion
                    )
                    return
                }
                guard let data,
                      let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let roomID = object["roomId"] as? String,
                      let hostKey = object["hostKey"] as? String,
                      Self.validRoomID(roomID),
                      !hostKey.isEmpty else {
                    self.finishStart(Self.failure("http-200"), completion: completion)
                    return
                }
                if shouldSave {
                    do {
                        try self.credentialStore.save(credentials)
                    } catch {
                        self.finishStart(Self.failure("network"), completion: completion)
                        return
                    }
                }
                self.finishStart([
                    "ok": true,
                    "roomId": roomID,
                    "hostKey": hostKey,
                    "origin": Self.productionOrigin
                ], completion: completion)
            }
        }.resume()
    }

    private func promptForCredentials(showUnauthorizedMessage: Bool) -> SessionCredentials? {
        var validationMessage = showUnauthorizedMessage
            ? "お名前かパスワードが違うようです"
            : ""
        while true {
            let alert = NSAlert()
            alert.messageText = "会議用セッションのログイン"
            alert.informativeText = validationMessage
            alert.alertStyle = showUnauthorizedMessage ? .warning : .informational
            alert.addButton(withTitle: "ログイン")
            alert.addButton(withTitle: "キャンセル")

            let userField = NSTextField(string: "")
            userField.placeholderString = "ID"
            userField.setAccessibilityLabel("ID")
            let passwordField = NSSecureTextField(string: "")
            passwordField.placeholderString = "パスワード"
            passwordField.setAccessibilityLabel("パスワード")
            let stack = NSStackView(views: [userField, passwordField])
            stack.orientation = .vertical
            stack.alignment = .leading
            stack.distribution = .fillEqually
            stack.spacing = 8
            stack.frame = NSRect(x: 0, y: 0, width: 320, height: 64)
            userField.widthAnchor.constraint(equalToConstant: 320).isActive = true
            passwordField.widthAnchor.constraint(equalToConstant: 320).isActive = true
            alert.accessoryView = stack
            alert.window.initialFirstResponder = userField

            guard alert.runModal() == .alertFirstButtonReturn else { return nil }
            let user = userField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
            let password = passwordField.stringValue
            if !user.isEmpty, !password.isEmpty, !user.contains(":") {
                return SessionCredentials(user: user, password: password)
            }
            validationMessage = user.contains(":")
                ? "IDにはコロンを使用できません。"
                : "IDとパスワードを入力してください。"
        }
    }

    private func receiveNextMessage(from task: URLSessionWebSocketTask) {
        task.receive { [weak self, weak task] result in
            DispatchQueue.main.async {
                guard let self, let task, self.webSocketTask === task else { return }
                switch result {
                case .success(.string(let text)):
                    self.emit(["type": "message", "data": text])
                    self.receiveNextMessage(from: task)
                case .success(.data):
                    self.receiveNextMessage(from: task)
                case .failure:
                    self.failCurrentSocket(task)
                @unknown default:
                    self.receiveNextMessage(from: task)
                }
            }
        }
    }

    private func replaceCurrentSocket() {
        guard let task = webSocketTask else { return }
        webSocketTask = nil
        task.cancel(with: .goingAway, reason: nil)
    }

    private func failCurrentSocket(_ task: URLSessionWebSocketTask) {
        guard webSocketTask === task else { return }
        webSocketTask = nil
        task.cancel(with: .goingAway, reason: nil)
        emit(["type": "error"])
        emit(["type": "close"])
    }

    private func emit(_ event: [String: Any]) {
        eventHandler?(event)
    }

    private func finishStart(
        _ result: [String: Any],
        completion: @escaping ([String: Any]) -> Void
    ) {
        startInProgress = false
        completion(result)
    }

    private static func failure(_ reason: String) -> [String: Any] {
        ["ok": false, "reason": reason]
    }

    private static func basicAuthorization(_ credentials: SessionCredentials) -> String {
        let value = Data("\(credentials.user):\(credentials.password)".utf8).base64EncodedString()
        return "Basic \(value)"
    }

    private static func validRoomID(_ value: String) -> Bool {
        value.range(of: #"^[a-z0-9]{1,64}$"#, options: .regularExpression) != nil
    }
}
