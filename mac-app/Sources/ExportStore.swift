import Foundation

enum ExportStoreError: LocalizedError {
    case invalidName
    case notFound
    case invalidJSON

    var errorDescription: String? {
        switch self {
        case .invalidName:
            return "Export name must be a single .json file name."
        case .notFound:
            return "Export file was not found."
        case .invalidJSON:
            return "Export file does not contain a JSON object."
        }
    }
}

final class ExportStore {
    let directoryURL: URL
    private let canonicalDirectoryURL: URL
    private let directoryPathPrefix: String
    private let isoFormatter: ISO8601DateFormatter

    init(directoryURL: URL) {
        self.directoryURL = directoryURL.standardizedFileURL
        canonicalDirectoryURL = directoryURL
            .standardizedFileURL
            .resolvingSymlinksInPath()
        directoryPathPrefix = canonicalDirectoryURL.path.hasSuffix("/")
            ? canonicalDirectoryURL.path
            : canonicalDirectoryURL.path + "/"
        isoFormatter = ISO8601DateFormatter()
        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    }

    func listEditExports() throws -> [[String: Any]] {
        guard FileManager.default.fileExists(atPath: directoryURL.path) else {
            return []
        }

        let urls = try FileManager.default.contentsOfDirectory(
            at: directoryURL,
            includingPropertiesForKeys: [.contentModificationDateKey, .isRegularFileKey],
            // iCloud can mark normal export files with the BSD hidden flag. Filtering by
            // extension below is sufficient and keeps those valid JSON exports visible.
            options: []
        )

        var entries: [[String: Any]] = []
        for url in urls where url.pathExtension.lowercased() == "json" {
            guard let safeURL = safeFileURL(named: url.lastPathComponent),
                  let values = try? safeURL.resourceValues(
                    forKeys: [.contentModificationDateKey, .isRegularFileKey]
                  ),
                  values.isRegularFile == true,
                  let data = try? Data(contentsOf: safeURL),
                  let object = try? JSONSerialization.jsonObject(with: data),
                  let dictionary = object as? [String: Any] else {
                continue
            }

            let modifiedAt = values.contentModificationDate ?? .distantPast
            entries.append([
                "name": safeURL.lastPathComponent,
                "modifiedAt": isoFormatter.string(from: modifiedAt),
                "modifiedTimestamp": modifiedAt.timeIntervalSince1970,
                "hasEditSummary": dictionary["editSummary"] != nil
            ])
        }

        entries.sort {
            let left = $0["modifiedTimestamp"] as? TimeInterval ?? 0
            let right = $1["modifiedTimestamp"] as? TimeInterval ?? 0
            if left == right {
                return ($0["name"] as? String ?? "") < ($1["name"] as? String ?? "")
            }
            return left > right
        }

        return entries.map { entry in
            var publicEntry = entry
            publicEntry.removeValue(forKey: "modifiedTimestamp")
            return publicEntry
        }
    }

    func readExport(named name: String) throws -> [String: Any] {
        guard let fileURL = safeFileURL(named: name) else {
            throw ExportStoreError.invalidName
        }
        guard FileManager.default.isReadableFile(atPath: fileURL.path),
              let data = try? Data(contentsOf: fileURL) else {
            throw ExportStoreError.notFound
        }
        guard let object = try? JSONSerialization.jsonObject(with: data),
              let dictionary = object as? [String: Any] else {
            throw ExportStoreError.invalidJSON
        }
        return dictionary
    }

    func editSummaryNames() -> Set<String> {
        let entries = (try? listEditExports()) ?? []
        return Set(entries.compactMap { entry in
            guard entry["hasEditSummary"] as? Bool == true else { return nil }
            return entry["name"] as? String
        })
    }

    private func safeFileURL(named name: String) -> URL? {
        guard !name.isEmpty,
              name == (name as NSString).lastPathComponent,
              !name.contains("/"),
              !name.contains("\\"),
              URL(fileURLWithPath: name).pathExtension.lowercased() == "json" else {
            return nil
        }

        let candidate = canonicalDirectoryURL
            .appendingPathComponent(name, isDirectory: false)
            .standardizedFileURL
            .resolvingSymlinksInPath()
        guard candidate.path.hasPrefix(directoryPathPrefix) else {
            return nil
        }
        return candidate
    }
}
