import CoreServices
import Foundation

final class ExportMonitor {
    typealias Callback = ([String: Any]) -> Void

    private let store: ExportStore
    private let callback: Callback
    private let queue = DispatchQueue(label: "local.shosai.export-monitor")
    private var knownNames = Set<String>()
    private var eventStream: FSEventStreamRef?
    private var pollTimer: DispatchSourceTimer?
    private var started = false

    init(store: ExportStore, callback: @escaping Callback) {
        self.store = store
        self.callback = callback
    }

    func start() {
        queue.async { [weak self] in
            guard let self, !self.started else { return }
            self.started = true
            self.knownNames = self.store.editSummaryNames()
            self.startFSEvents()
            self.startPolling()
        }
    }

    func stop() {
        queue.async { [weak self] in
            guard let self else { return }
            self.pollTimer?.cancel()
            self.pollTimer = nil
            if let stream = self.eventStream {
                FSEventStreamStop(stream)
                FSEventStreamInvalidate(stream)
                FSEventStreamRelease(stream)
                self.eventStream = nil
            }
            self.started = false
        }
    }

    private func startFSEvents() {
        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(
            atPath: store.directoryURL.path,
            isDirectory: &isDirectory
        ), isDirectory.boolValue else {
            return
        }

        var context = FSEventStreamContext(
            version: 0,
            info: Unmanaged.passUnretained(self).toOpaque(),
            retain: nil,
            release: nil,
            copyDescription: nil
        )
        let paths = [store.directoryURL.path] as CFArray
        let flags = FSEventStreamCreateFlags(
            kFSEventStreamCreateFlagFileEvents
                | kFSEventStreamCreateFlagWatchRoot
                | kFSEventStreamCreateFlagUseCFTypes
        )

        guard let stream = FSEventStreamCreate(
            kCFAllocatorDefault,
            Self.eventCallback,
            &context,
            paths,
            FSEventStreamEventId(kFSEventStreamEventIdSinceNow),
            1.0,
            flags
        ) else {
            return
        }

        eventStream = stream
        FSEventStreamSetDispatchQueue(stream, queue)
        FSEventStreamStart(stream)
    }

    private func startPolling() {
        let timer = DispatchSource.makeTimerSource(queue: queue)
        timer.schedule(deadline: .now() + 30, repeating: 30)
        timer.setEventHandler { [weak self] in
            self?.scanForNewExports()
        }
        pollTimer = timer
        timer.resume()
    }

    private func scanForNewExports() {
        let currentNames = store.editSummaryNames()
        let newNames = currentNames.subtracting(knownNames).sorted()
        knownNames = currentNames
        for name in newNames {
            callback(["name": name])
        }
    }

    private static let eventCallback: FSEventStreamCallback = {
        _, clientInfo, _, _, _, _ in
        guard let clientInfo else { return }
        let monitor = Unmanaged<ExportMonitor>
            .fromOpaque(clientInfo)
            .takeUnretainedValue()
        monitor.scanForNewExports()
    }
}
