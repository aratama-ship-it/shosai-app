import Darwin
import Foundation

struct AgentRunResult {
    let ok: Bool
    let output: String
    let exitCode: Int32

    var bridgeValue: [String: Any] {
        [
            "ok": ok,
            "output": output,
            "exitCode": Int(exitCode)
        ]
    }
}

struct AgentVersionTestResult {
    let ok: Bool
    let skipped: Bool
    let output: String
    let exitCode: Int32
    let path: String
    let home: String
    let lang: String

    var detail: String {
        let status = skipped ? "skipped" : (ok ? "passed" : "failed")
        let renderedOutput = output.isEmpty ? "(no output)" : output
        return "\(status); exitCode=\(exitCode); PATH=\(path); HOME=\(home); LANG=\(lang); output=\(renderedOutput)"
    }
}

final class AgentRunner {
    private static let standardExecutableDirectories = [
        "/usr/local/bin",
        "/opt/homebrew/bin",
        "/usr/bin",
        "/bin",
        "/usr/sbin",
        "/sbin",
    ]

    private let executableURL: URL
    private let configuredArguments: [String]
    private let configuredModelOverride: String?
    private let configurationAgentInfo: AgentInfo
    private let workingDirectoryURL: URL
    private let timeout: TimeInterval
    private let processEnvironment: [String: String]
    private let queue = DispatchQueue(label: "local.shosai.agent-runner", qos: .userInitiated)
    private let terminationQueue = DispatchQueue(
        label: "local.shosai.agent-runner.termination",
        qos: .userInitiated
    )
    private let stateLock = NSLock()
    private let terminationLock = NSLock()
    private var activeRunID: UUID?
    private var activeProcess: Process?
    private var stopRequested = false

    init(
        configuration: AppConfiguration,
        defaults: UserDefaults = .standard,
        environmentOverrides: [String: String] = [:]
    ) {
        executableURL = configuration.agentExecutableURL
        configuredArguments = configuration.agentArguments
        configuredModelOverride = configuration.agentModelOverride
        configurationAgentInfo = configuration.agentInfo
        workingDirectoryURL = configuration.webRootURL
        timeout = configuration.agentTimeout
        var environment = Self.makeProcessEnvironment(
            executableURL: configuration.agentExecutableURL,
            defaults: defaults
        )
        for (key, value) in environmentOverrides {
            environment[key] = value
        }
        processEnvironment = environment
    }

    private static func makeProcessEnvironment(
        executableURL: URL,
        defaults: UserDefaults
    ) -> [String: String] {
        var environment = ProcessInfo.processInfo.environment
        let configuredPath = defaults.string(forKey: "AgentPath")?
            .trimmingCharacters(in: .whitespacesAndNewlines)

        if let configuredPath, !configuredPath.isEmpty {
            environment["PATH"] = configuredPath
        } else {
            let executableDirectory = executableURL
                .deletingLastPathComponent()
                .standardizedFileURL
                .path
            var directories: [String] = []
            for directory in [executableDirectory] + standardExecutableDirectories
                where !directory.isEmpty && !directories.contains(directory) {
                directories.append(directory)
            }
            environment["PATH"] = directories.joined(separator: ":")
        }

        environment["HOME"] = FileManager.default.homeDirectoryForCurrentUser.path
        let inheritedLang = environment["LANG"]?
            .trimmingCharacters(in: .whitespacesAndNewlines)
        environment["LANG"] = inheritedLang?.isEmpty == false
            ? inheritedLang!
            : "en_US.UTF-8"
        return environment
    }

    func run(prompt: String, completion: @escaping (AgentRunResult) -> Void) {
        stateLock.lock()
        guard activeRunID == nil else {
            stateLock.unlock()
            completion(AgentRunResult(
                ok: false,
                output: "Agent is already running.",
                exitCode: 75
            ))
            return
        }
        let runID = UUID()
        activeRunID = runID
        activeProcess = nil
        stopRequested = false
        stateLock.unlock()

        queue.async { [weak self] in
            self?.execute(prompt: prompt, runID: runID, completion: completion)
        }
    }

    func stop(completion: @escaping (Bool) -> Void) {
        stateLock.lock()
        guard activeRunID != nil else {
            stateLock.unlock()
            completion(false)
            return
        }
        stopRequested = true
        let process = activeProcess
        stateLock.unlock()

        guard let process else {
            // The run has been accepted but has not launched yet. execute() observes
            // stopRequested before Process.run() and returns the same stopped result.
            completion(true)
            return
        }
        terminationQueue.async { [weak self] in
            self?.terminateProcess(process)
            completion(true)
        }
    }

    func testVersion(completion: @escaping (AgentVersionTestResult) -> Void) {
        queue.async { [weak self] in
            guard let self else { return }
            completion(self.executeVersionTest())
        }
    }

    var agentInfo: AgentInfo {
        configurationAgentInfo
    }

    private func execute(
        prompt: String,
        runID: UUID,
        completion: @escaping (AgentRunResult) -> Void
    ) {
        let process = Process()
        let outputPipe = Pipe()
        let outputLock = NSLock()
        var collectedData = Data()

        process.executableURL = executableURL
        // The prompt is always one final argument. No shell is involved, and JavaScript
        // cannot alter the configured executable or its preceding arguments.
        let modelArguments = configuredModelOverride.map { ["-m", $0] } ?? []
        process.arguments = configuredArguments + modelArguments + [prompt]
        process.currentDirectoryURL = workingDirectoryURL
        process.environment = processEnvironment
        process.standardInput = FileHandle.nullDevice
        process.standardOutput = outputPipe
        process.standardError = outputPipe

        outputPipe.fileHandleForReading.readabilityHandler = { handle in
            let chunk = handle.availableData
            guard !chunk.isEmpty else { return }
            outputLock.lock()
            collectedData.append(chunk)
            outputLock.unlock()
        }

        stateLock.lock()
        guard activeRunID == runID, !stopRequested else {
            clearActiveRunLocked(runID)
            stateLock.unlock()
            outputPipe.fileHandleForReading.readabilityHandler = nil
            completion(stoppedResult())
            return
        }
        activeProcess = process
        do {
            // Keep the state lock through launch so stop() cannot observe a Process that
            // has been registered but is not running yet.
            try process.run()
        } catch {
            clearActiveRunLocked(runID)
            stateLock.unlock()
            outputPipe.fileHandleForReading.readabilityHandler = nil
            completion(AgentRunResult(
                ok: false,
                output: error.localizedDescription,
                exitCode: -1
            ))
            return
        }
        stateLock.unlock()

        let deadline = Date().addingTimeInterval(timeout)
        var timedOut = false
        while process.isRunning {
            if Date() >= deadline {
                timedOut = true
                terminateProcess(process)
                break
            }
            Thread.sleep(forTimeInterval: 0.1)
        }
        process.waitUntilExit()

        stateLock.lock()
        let stopped = activeRunID == runID && stopRequested
        clearActiveRunLocked(runID)
        stateLock.unlock()

        outputPipe.fileHandleForReading.readabilityHandler = nil
        if let remainder = try? outputPipe.fileHandleForReading.readToEnd(),
           !remainder.isEmpty {
            outputLock.lock()
            collectedData.append(remainder)
            outputLock.unlock()
        }

        outputLock.lock()
        let outputData = collectedData
        outputLock.unlock()

        var output = String(data: outputData, encoding: .utf8)
            ?? String(decoding: outputData, as: UTF8.self)
        if stopped {
            appendStatus("Agent stopped by user.", to: &output)
        } else if timedOut {
            appendStatus("Agent timed out after \(Int(timeout)) seconds.", to: &output)
        }

        completion(AgentRunResult(
            ok: !stopped && !timedOut && process.terminationStatus == 0,
            output: output,
            exitCode: stopped ? 130 : (timedOut ? 124 : process.terminationStatus)
        ))
    }

    private func executeVersionTest() -> AgentVersionTestResult {
        let path = processEnvironment["PATH"] ?? ""
        let home = processEnvironment["HOME"] ?? ""
        let lang = processEnvironment["LANG"] ?? ""
        var isDirectory: ObjCBool = false
        let exists = FileManager.default.fileExists(
            atPath: executableURL.path,
            isDirectory: &isDirectory
        )
        guard exists,
              !isDirectory.boolValue,
              FileManager.default.isExecutableFile(atPath: executableURL.path) else {
            return AgentVersionTestResult(
                ok: true,
                skipped: true,
                output: "Agent command not found or not executable: \(executableURL.path)",
                exitCode: 0,
                path: path,
                home: home,
                lang: lang
            )
        }

        let process = Process()
        let outputPipe = Pipe()
        process.executableURL = executableURL
        process.arguments = ["--version"]
        process.currentDirectoryURL = workingDirectoryURL
        process.environment = processEnvironment
        process.standardInput = FileHandle.nullDevice
        process.standardOutput = outputPipe
        process.standardError = outputPipe

        do {
            try process.run()
        } catch {
            return AgentVersionTestResult(
                ok: false,
                skipped: false,
                output: error.localizedDescription,
                exitCode: -1,
                path: path,
                home: home,
                lang: lang
            )
        }

        let deadline = Date().addingTimeInterval(15)
        while process.isRunning && Date() < deadline {
            Thread.sleep(forTimeInterval: 0.05)
        }
        if process.isRunning {
            terminateProcess(process)
        }
        process.waitUntilExit()
        let data = (try? outputPipe.fileHandleForReading.readToEnd()) ?? Data()
        var output = String(data: data, encoding: .utf8)
            ?? String(decoding: data, as: UTF8.self)
        output = output.trimmingCharacters(in: .whitespacesAndNewlines)
        let timedOut = Date() >= deadline && process.terminationStatus != 0
        if timedOut {
            appendStatus("Agent version check timed out after 15 seconds.", to: &output)
        }

        return AgentVersionTestResult(
            ok: !timedOut && process.terminationStatus == 0,
            skipped: false,
            output: output,
            exitCode: timedOut ? 124 : process.terminationStatus,
            path: path,
            home: home,
            lang: lang
        )
    }

    private func terminateProcess(_ process: Process) {
        terminationLock.lock()
        defer { terminationLock.unlock() }
        if process.isRunning {
            process.terminate()
        }
        let terminationDeadline = Date().addingTimeInterval(2)
        while process.isRunning && Date() < terminationDeadline {
            Thread.sleep(forTimeInterval: 0.05)
        }
        if process.isRunning {
            kill(process.processIdentifier, SIGKILL)
        }
    }

    private func clearActiveRunLocked(_ runID: UUID) {
        guard activeRunID == runID else { return }
        activeRunID = nil
        activeProcess = nil
        stopRequested = false
    }

    private func stoppedResult() -> AgentRunResult {
        AgentRunResult(ok: false, output: "Agent stopped by user.", exitCode: 130)
    }

    private func appendStatus(_ status: String, to output: inout String) {
        if !output.isEmpty && !output.hasSuffix("\n") {
            output += "\n"
        }
        output += status
    }
}
