import Foundation

enum AppConfigurationError: LocalizedError {
    case missingWebRoot(String)
    case invalidAgentArguments(String)

    var errorDescription: String? {
        switch self {
        case .missingWebRoot(let path):
            return "WebRootPath is not a readable directory: \(path)"
        case .invalidAgentArguments(let reason):
            return "AgentArgs could not be parsed: \(reason)"
        }
    }
}

struct AgentInfo {
    let command: String
    let args: String
    let model: String?
    let reasoningEffort: String?
    let source: String

    var bridgeValue: [String: Any] {
        [
            "command": command,
            "args": args,
            "model": model ?? NSNull(),
            "reasoningEffort": reasoningEffort ?? NSNull(),
            "source": source,
        ]
    }
}

struct AppConfiguration {
    static let defaultWebRootPath =
        "/Users/arata/Library/Mobile Documents/com~apple~CloudDocs/claude code files/show-creative-ideas/shosai-app"
    static let defaultAgentCommand = "/Users/arata/.local/node/bin/codex"
    static let defaultAgentArgs =
        "exec --skip-git-repo-check --sandbox workspace-write -C <webRoot>"

    let webRootURL: URL
    let exportsURL: URL
    let agentExecutableURL: URL
    let agentArguments: [String]
    let agentModelOverride: String?
    let agentInfo: AgentInfo
    let agentTimeout: TimeInterval

    init(defaults: UserDefaults = .standard) throws {
        let configuredRoot = defaults.string(forKey: "WebRootPath")?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let rootPath = configuredRoot?.isEmpty == false
            ? configuredRoot!
            : Self.defaultWebRootPath
        let rootURL = URL(fileURLWithPath: rootPath, isDirectory: true)
            .standardizedFileURL
            .resolvingSymlinksInPath()

        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: rootURL.path, isDirectory: &isDirectory),
              isDirectory.boolValue,
              FileManager.default.isReadableFile(atPath: rootURL.path) else {
            throw AppConfigurationError.missingWebRoot(rootURL.path)
        }

        let configuredCommand = defaults.string(forKey: "AgentCommand")?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        let command = configuredCommand?.isEmpty == false
            ? configuredCommand!
            : Self.defaultAgentCommand

        let configuredArguments = defaults.string(forKey: "AgentArgs")
        let argumentsText = configuredArguments ?? Self.defaultAgentArgs
        let parsedArguments: [String]
        do {
            parsedArguments = try CommandLineTokenizer.parse(argumentsText)
        } catch {
            throw AppConfigurationError.invalidAgentArguments(error.localizedDescription)
        }

        webRootURL = rootURL
        exportsURL = rootURL
            .appendingPathComponent(".stage-sketch-mcp", isDirectory: true)
            .appendingPathComponent("exports", isDirectory: true)
        agentExecutableURL = URL(fileURLWithPath: command)
        agentArguments = parsedArguments.map {
            $0.replacingOccurrences(of: "<webRoot>", with: rootURL.path)
        }
        let defaultsModel = Self.nonempty(defaults.string(forKey: "AgentModel"))
        let defaultsReasoningEffort = Self.nonempty(
            defaults.string(forKey: "AgentReasoningEffort")
        )
        let codexConfig = Self.readCodexConfig()
        let model = defaultsModel ?? codexConfig.model
        let reasoningEffort = defaultsReasoningEffort ?? codexConfig.reasoningEffort
        let source: String
        if defaultsModel != nil || defaultsReasoningEffort != nil {
            source = "defaults"
        } else if codexConfig.model != nil || codexConfig.reasoningEffort != nil {
            source = "codex-config"
        } else {
            source = "unknown"
        }
        agentModelOverride = defaultsModel
        agentInfo = AgentInfo(
            command: command,
            args: argumentsText,
            model: model,
            reasoningEffort: reasoningEffort,
            source: source
        )
        agentTimeout = 600
    }

    private static func nonempty(_ value: String?) -> String? {
        let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed?.isEmpty == false ? trimmed : nil
    }

    private static func readCodexConfig() -> (model: String?, reasoningEffort: String?) {
        let configURL = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".codex", isDirectory: true)
            .appendingPathComponent("config.toml", isDirectory: false)
        guard let contents = try? String(contentsOf: configURL, encoding: .utf8) else {
            return (nil, nil)
        }

        var model: String?
        var reasoningEffort: String?
        for rawLine in contents.components(separatedBy: .newlines) {
            let line = rawLine.trimmingCharacters(in: .whitespacesAndNewlines)
            if line.hasPrefix("[") { break }
            if line.isEmpty || line.hasPrefix("#") { continue }
            if let value = quotedValue(in: line, key: "model") {
                model = nonempty(value)
            } else if let value = quotedValue(in: line, key: "model_reasoning_effort") {
                reasoningEffort = nonempty(value)
            }
        }
        return (model, reasoningEffort)
    }

    private static func quotedValue(in line: String, key: String) -> String? {
        guard line.hasPrefix(key) else { return nil }
        var remainder = line.dropFirst(key.count)
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard remainder.first == "=" else { return nil }
        remainder = remainder.dropFirst()
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard remainder.first == "\"" else { return nil }
        let quoted = remainder.dropFirst()
        guard let closingQuote = quoted.firstIndex(of: "\"") else { return nil }
        return String(quoted[..<closingQuote])
    }
}

private enum CommandLineTokenizer {
    private enum Quote {
        case single
        case double
    }

    static func parse(_ value: String) throws -> [String] {
        var result: [String] = []
        var current = ""
        var quote: Quote?
        var escaping = false
        var tokenStarted = false

        for character in value {
            if escaping {
                current.append(character)
                escaping = false
                tokenStarted = true
                continue
            }

            if character == "\\" && quote != .single {
                escaping = true
                tokenStarted = true
                continue
            }

            if character == "'" && quote != .double {
                quote = quote == .single ? nil : .single
                tokenStarted = true
                continue
            }

            if character == "\"" && quote != .single {
                quote = quote == .double ? nil : .double
                tokenStarted = true
                continue
            }

            if character.isWhitespace && quote == nil {
                if tokenStarted {
                    result.append(current)
                    current = ""
                    tokenStarted = false
                }
                continue
            }

            current.append(character)
            tokenStarted = true
        }

        if escaping {
            throw AppConfigurationError.invalidAgentArguments("trailing escape")
        }
        if quote != nil {
            throw AppConfigurationError.invalidAgentArguments("unterminated quote")
        }
        if tokenStarted {
            result.append(current)
        }
        return result
    }
}
