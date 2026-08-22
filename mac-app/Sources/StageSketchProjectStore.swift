import Darwin
import Foundation

enum StageSketchProjectStoreError: LocalizedError {
    case invalidDocument
    case invalidProjectID
    case invalidExistingProject
    case invalidRevision
    case invalidExpectedRevision
    case lockTimeout
    case unsafePath

    var errorDescription: String? {
        switch self {
        case .invalidDocument:
            return "writeProject requires a shosai-stage-sketch version 3 object with project.scenes as an array."
        case .invalidProjectID:
            return "projectId must begin with an ASCII letter or number and contain only letters, numbers, dots, underscores, or hyphens (96 characters maximum)."
        case .invalidExistingProject:
            return "The existing project file is not a valid matching stage-sketch version 3 document."
        case .invalidRevision:
            return "The existing project revision is not a positive integer."
        case .invalidExpectedRevision:
            return "expectedRevision must be null or a positive integer."
        case .lockTimeout:
            return "別のCodexまたはClaude Codeがこの下書きを編集中です。数秒後に読み直してください。"
        case .unsafePath:
            return "The requested MCP path is outside its allowed directory."
        }
    }
}

final class StageSketchProjectStore {
    private let dataRootURL: URL
    private let projectsDirectoryURL: URL
    private let historyDirectoryURL: URL
    private let locksDirectoryURL: URL
    private let plansDirectoryURL: URL
    private let rootPathPrefix: String
    private let isoFormatter: ISO8601DateFormatter

    init(dataRootURL: URL) {
        let canonicalRoot = dataRootURL.standardizedFileURL.resolvingSymlinksInPath()
        self.dataRootURL = canonicalRoot
        projectsDirectoryURL = canonicalRoot.appendingPathComponent("projects", isDirectory: true)
        historyDirectoryURL = canonicalRoot.appendingPathComponent("history", isDirectory: true)
        locksDirectoryURL = canonicalRoot.appendingPathComponent("locks", isDirectory: true)
        plansDirectoryURL = canonicalRoot.appendingPathComponent("plans", isDirectory: true)
        rootPathPrefix = canonicalRoot.path.hasSuffix("/")
            ? canonicalRoot.path
            : canonicalRoot.path + "/"
        isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    }

    func writeProject(
        _ document: [String: Any],
        expectedRevision: Int?,
        allowFirstSync: Bool = false
    ) throws -> [String: Any] {
        let projectID = try projectID(in: document)
        try ensureDirectory(projectsDirectoryURL)
        try ensureDirectory(historyDirectoryURL)
        try ensureDirectory(locksDirectoryURL)

        return try withProjectLock(projectID: projectID) {
            let projectURL = try safeFileURL(
                in: projectsDirectoryURL,
                named: "\(projectID).json",
                allowedExtension: "json"
            )
            let existingDocument: [String: Any]?
            if FileManager.default.fileExists(atPath: projectURL.path) {
                existingDocument = try readProject(at: projectURL, expectedProjectID: projectID)
            } else {
                existingDocument = nil
            }

            let currentRevision = try existingDocument.map(revision(in:)) ?? 0
            if existingDocument != nil,
               expectedRevision != currentRevision,
               !(expectedRevision == nil && allowFirstSync) {
                return [
                    "projectId": projectID,
                    "conflict": true,
                    "currentRevision": currentRevision
                ]
            }

            if let existingDocument {
                try archive(existingDocument, projectID: projectID, revision: currentRevision)
            }

            let now = isoFormatter.string(from: Date())
            var storedDocument = document
            var metadata = (existingDocument?["mcpMeta"] as? [String: Any])
                ?? (document["mcpMeta"] as? [String: Any])
                ?? [:]
            metadata["status"] = "draft"
            metadata["revision"] = currentRevision + 1
            metadata["createdAt"] = metadata["createdAt"] as? String ?? now
            metadata["updatedAt"] = now
            metadata["createdBy"] = metadata["createdBy"] as? String ?? "shosai-mac-app"
            storedDocument["mcpMeta"] = metadata

            try writeJSONObject(storedDocument, to: projectURL)
            return [
                "projectId": projectID,
                "revision": currentRevision + 1
            ]
        }
    }

    private func withProjectLock<T>(projectID: String, operation: () throws -> T) throws -> T {
        let lockURL = try safeFileURL(
            in: locksDirectoryURL,
            named: "\(projectID).lock",
            allowedExtension: "lock"
        )
        let deadline = Date().addingTimeInterval(4)
        var descriptor: Int32 = -1
        while descriptor < 0 {
            descriptor = Darwin.open(lockURL.path, O_CREAT | O_EXCL | O_WRONLY, 0o644)
            if descriptor >= 0 { break }
            guard errno == EEXIST else {
                throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
            }
            guard Date() < deadline else {
                throw StageSketchProjectStoreError.lockTimeout
            }
            Thread.sleep(forTimeInterval: 0.05)
        }

        do {
            let lockText = "\(getpid()) \(isoFormatter.string(from: Date()))\n"
            try writeLockText(lockText, descriptor: descriptor)
        } catch {
            Darwin.close(descriptor)
            try? FileManager.default.removeItem(at: lockURL)
            throw error
        }

        defer {
            Darwin.close(descriptor)
            try? FileManager.default.removeItem(at: lockURL)
        }
        return try operation()
    }

    private func writeLockText(_ text: String, descriptor: Int32) throws {
        let data = Data(text.utf8)
        try data.withUnsafeBytes { rawBuffer in
            guard var pointer = rawBuffer.baseAddress else { return }
            var remaining = rawBuffer.count
            while remaining > 0 {
                let count = Darwin.write(descriptor, pointer, remaining)
                guard count >= 0 else {
                    throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO)
                }
                guard count > 0 else { throw POSIXError(.EIO) }
                remaining -= count
                pointer = pointer.advanced(by: count)
            }
        }
    }

    func latestPlan(projectID: String) throws -> [String: Any]? {
        try validateProjectID(projectID)
        guard FileManager.default.fileExists(atPath: plansDirectoryURL.path) else {
            return nil
        }
        try assertSafeDirectory(plansDirectoryURL)

        let entries = try FileManager.default.contentsOfDirectory(
            at: plansDirectoryURL,
            includingPropertiesForKeys: [.contentModificationDateKey, .isRegularFileKey],
            options: []
        )
        var latest: (date: Date, name: String, plan: [String: Any])?
        for entry in entries where entry.pathExtension.lowercased() == "json" {
            guard let planURL = try? safeFileURL(
                in: plansDirectoryURL,
                named: entry.lastPathComponent,
                allowedExtension: "json"
            ),
            let values = try? planURL.resourceValues(
                forKeys: [.contentModificationDateKey, .isRegularFileKey]
            ),
            values.isRegularFile == true,
            let data = try? Data(contentsOf: planURL),
            let object = try? JSONSerialization.jsonObject(with: data),
            let plan = object as? [String: Any],
            plan["kind"] as? String == "stage-sketch-edit-plan",
            isInteger(plan["version"], equalTo: 1),
            plan["projectId"] as? String == projectID else {
                continue
            }

            let date = values.contentModificationDate ?? .distantPast
            if latest == nil
                || date > latest!.date
                || (date == latest!.date && entry.lastPathComponent > latest!.name) {
                latest = (date, entry.lastPathComponent, plan)
            }
        }
        return latest?.plan
    }

    private func projectID(in document: [String: Any]) throws -> String {
        guard document["kind"] as? String == "shosai-stage-sketch",
              isVersionThree(document["version"]),
              let project = document["project"] as? [String: Any],
              project["scenes"] is [Any],
              let projectID = project["id"] as? String else {
            throw StageSketchProjectStoreError.invalidDocument
        }
        try validateProjectID(projectID)
        guard JSONSerialization.isValidJSONObject(document) else {
            throw StageSketchProjectStoreError.invalidDocument
        }
        return projectID
    }

    private func isVersionThree(_ value: Any?) -> Bool {
        isInteger(value, equalTo: 3)
    }

    private func isInteger(_ value: Any?, equalTo expected: Int) -> Bool {
        guard let number = value as? NSNumber,
              CFGetTypeID(number) != CFBooleanGetTypeID() else {
            return false
        }
        return number.doubleValue == Double(expected) && number.intValue == expected
    }

    private func validateProjectID(_ projectID: String) throws {
        guard projectID.range(
            of: #"^[A-Za-z0-9][A-Za-z0-9._-]{0,95}$"#,
            options: .regularExpression
        ) != nil else {
            throw StageSketchProjectStoreError.invalidProjectID
        }
    }

    private func readProject(at url: URL, expectedProjectID: String) throws -> [String: Any] {
        let data = try Data(contentsOf: url)
        guard let object = try? JSONSerialization.jsonObject(with: data),
              let document = object as? [String: Any],
              let existingProjectID = try? projectID(in: document),
              existingProjectID == expectedProjectID else {
            throw StageSketchProjectStoreError.invalidExistingProject
        }
        return document
    }

    private func revision(in document: [String: Any]) throws -> Int {
        guard let metadata = document["mcpMeta"] as? [String: Any],
              let rawRevision = metadata["revision"] else {
            return 1
        }
        guard let number = rawRevision as? NSNumber,
              CFGetTypeID(number) != CFBooleanGetTypeID(),
              number.doubleValue.rounded(.towardZero) == number.doubleValue,
              number.doubleValue >= 1,
              number.doubleValue <= Double(Int.max - 1) else {
            throw StageSketchProjectStoreError.invalidRevision
        }
        return number.intValue
    }

    private func archive(
        _ document: [String: Any],
        projectID: String,
        revision: Int
    ) throws {
        let projectHistoryURL = historyDirectoryURL
            .appendingPathComponent(projectID, isDirectory: true)
        try ensureDirectory(projectHistoryURL)
        let historyURL = try safeFileURL(
            in: projectHistoryURL,
            named: "revision-\(revision).json",
            allowedExtension: "json"
        )
        guard !FileManager.default.fileExists(atPath: historyURL.path) else {
            return
        }
        try writeJSONObject(document, to: historyURL)
    }

    private func writeJSONObject(_ object: [String: Any], to url: URL) throws {
        var data = try JSONSerialization.data(
            withJSONObject: object,
            options: [.prettyPrinted, .sortedKeys]
        )
        data.append(0x0A)
        try data.write(to: url, options: .atomic)
    }

    private func ensureDirectory(_ directoryURL: URL) throws {
        guard directoryURL.path == dataRootURL.path
            || directoryURL.path.hasPrefix(rootPathPrefix) else {
            throw StageSketchProjectStoreError.unsafePath
        }
        try FileManager.default.createDirectory(
            at: directoryURL,
            withIntermediateDirectories: true
        )
        try assertSafeDirectory(directoryURL)
    }

    private func assertSafeDirectory(_ directoryURL: URL) throws {
        let standardized = directoryURL.standardizedFileURL
        let resolved = standardized.resolvingSymlinksInPath()
        guard resolved.path == standardized.path,
              resolved.path == dataRootURL.path || resolved.path.hasPrefix(rootPathPrefix) else {
            throw StageSketchProjectStoreError.unsafePath
        }
    }

    private func safeFileURL(
        in directoryURL: URL,
        named name: String,
        allowedExtension: String
    ) throws -> URL {
        guard !name.isEmpty,
              name == (name as NSString).lastPathComponent,
              !name.contains("/"),
              !name.contains("\\"),
              URL(fileURLWithPath: name).pathExtension.lowercased() == allowedExtension else {
            throw StageSketchProjectStoreError.unsafePath
        }

        try assertSafeDirectory(directoryURL)
        let candidate = directoryURL
            .appendingPathComponent(name, isDirectory: false)
            .standardizedFileURL
            .resolvingSymlinksInPath()
        let prefix = directoryURL.path.hasSuffix("/")
            ? directoryURL.path
            : directoryURL.path + "/"
        guard candidate.path.hasPrefix(prefix) else {
            throw StageSketchProjectStoreError.unsafePath
        }
        return candidate
    }
}
