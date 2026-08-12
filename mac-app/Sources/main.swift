import AppKit
import Darwin
import Foundation

let application = NSApplication.shared
let diagnoseAskArgument = CommandLine.arguments.first {
    $0 == "--diagnose-ask"
        || $0 == "--diagnose-ask=real"
        || $0 == "--diagnose-ask=accept"
}

if CommandLine.arguments.contains("--diagnose-adopt") {
    application.setActivationPolicy(.prohibited)

    do {
        var runner: DiagnoseAdoptRunner?
        runner = try DiagnoseAdoptRunner { data, exitCode in
            FileHandle.standardOutput.write(data)
            FileHandle.standardOutput.write(Data([0x0A]))
            fflush(stdout)
            runner = nil
            exit(exitCode)
        }
        DispatchQueue.main.async {
            runner?.start()
        }
        application.run()
    } catch {
        let payload: [String: Any] = [
            "ok": false,
            "mode": "adopt",
            "fatalErrors": [error.localizedDescription]
        ]
        let data = (try? JSONSerialization.data(
            withJSONObject: payload,
            options: [.prettyPrinted, .sortedKeys]
        )) ?? Data(#"{"ok":false}"#.utf8)
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data([0x0A]))
        fflush(stdout)
        exit(1)
    }
} else if let diagnoseAskArgument {
    application.setActivationPolicy(.prohibited)

    do {
        let mode: DiagnoseAskMode
        switch diagnoseAskArgument {
        case "--diagnose-ask=real":
            mode = .real
        case "--diagnose-ask=accept":
            mode = .accept
        default:
            mode = .echo
        }
        let configuration = try mode.makeConfiguration()
        var runner: DiagnoseAskRunner?
        runner = DiagnoseAskRunner(
            configuration: configuration,
            mode: mode
        ) { data, exitCode in
            FileHandle.standardOutput.write(data)
            FileHandle.standardOutput.write(Data([0x0A]))
            fflush(stdout)
            runner = nil
            exit(exitCode)
        }
        DispatchQueue.main.async {
            runner?.start()
        }
        application.run()
    } catch {
        let payload: [String: Any] = [
            "ok": false,
            "mode": diagnoseAskArgument == "--diagnose-ask=real"
                ? "real"
                : (diagnoseAskArgument == "--diagnose-ask=accept" ? "accept" : "echo"),
            "fatalErrors": [error.localizedDescription]
        ]
        let data = (try? JSONSerialization.data(
            withJSONObject: payload,
            options: [.prettyPrinted, .sortedKeys]
        )) ?? Data(#"{"ok":false}"#.utf8)
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data([0x0A]))
        fflush(stdout)
        exit(1)
    }
} else if CommandLine.arguments.contains("--self-test") {
    application.setActivationPolicy(.prohibited)

    do {
        let configuration = try AppConfiguration()
        var runner: SelfTestRunner?
        runner = SelfTestRunner(configuration: configuration) { data, exitCode in
            FileHandle.standardOutput.write(data)
            FileHandle.standardOutput.write(Data([0x0A]))
            fflush(stdout)
            runner = nil
            exit(exitCode)
        }
        DispatchQueue.main.async {
            runner?.start()
        }
        application.run()
    } catch {
        let payload: [String: Any] = [
            "ok": false,
            "results": [],
            "error": error.localizedDescription
        ]
        let data = (try? JSONSerialization.data(
            withJSONObject: payload,
            options: [.prettyPrinted, .sortedKeys]
        )) ?? Data(#"{"ok":false,"results":[]}"#.utf8)
        FileHandle.standardOutput.write(data)
        FileHandle.standardOutput.write(Data([0x0A]))
        fflush(stdout)
        exit(1)
    }
} else {
    application.setActivationPolicy(.regular)
    let delegate = AppDelegate()
    application.delegate = delegate
    application.run()
}
