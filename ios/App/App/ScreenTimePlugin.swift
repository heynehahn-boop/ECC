import Foundation
import Capacitor
import SwiftUI
import FamilyControls
import ManagedSettings
import DeviceActivity

/// JavaScript name: `ScreenTime` (see src/native.js).
/// Blocks the chosen apps until the unlock time, then allows them for N minutes a day.
/// The RoutineMonitor extension re-blocks them when the minutes are used up and at the end of the day.
@objc(ScreenTimePlugin)
public class ScreenTimePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ScreenTimePlugin"
    public let jsName = "ScreenTime"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pickApps", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "applySchedule", returnType: CAPPluginReturnPromise),
    ]

    @objc func getStatus(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else {
            call.resolve(["supported": false, "authorized": false, "selectedCount": 0])
            return
        }
        let authorized = AuthorizationCenter.shared.authorizationStatus == .approved
        let selection = RoutineShared.loadSelection()
        call.resolve([
            "supported": true,
            "authorized": authorized,
            "selectedCount": RoutineShared.selectedCount(selection),
        ])
    }

    @objc func requestAuthorization(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { call.reject("Screen Time needs iOS 16 or newer"); return }
        Task { @MainActor in
            do {
                try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
                call.resolve(["authorized": AuthorizationCenter.shared.authorizationStatus == .approved])
            } catch {
                call.reject("Screen Time access was not allowed: \(error.localizedDescription)")
            }
        }
    }

    @objc func pickApps(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { call.reject("Screen Time needs iOS 16 or newer"); return }
        DispatchQueue.main.async {
            let model = PickerModel(selection: RoutineShared.loadSelection())
            let picker = AppPickerView(model: model) { [weak self] saved in
                self?.bridge?.viewController?.dismiss(animated: true)
                if saved {
                    RoutineShared.saveSelection(model.selection)
                    call.resolve(["selectedCount": RoutineShared.selectedCount(model.selection)])
                } else {
                    call.reject("cancelled")
                }
            }
            let host = UIHostingController(rootView: picker)
            host.modalPresentationStyle = .pageSheet
            self.bridge?.viewController?.present(host, animated: true)
        }
    }

    @objc func applySchedule(_ call: CAPPluginCall) {
        guard #available(iOS 16.0, *) else { call.reject("Screen Time needs iOS 16 or newer"); return }
        let unlock = call.getString("unlock") ?? "20:00"
        let minutes = max(1, min(240, call.getInt("minutes") ?? 10))
        let enabled = call.getBool("enabled") ?? false
        let parts = unlock.split(separator: ":").compactMap { Int($0) }
        let hour = parts.first ?? 20
        let minute = parts.count > 1 ? parts[1] : 0
        let unlockMinute = hour * 60 + minute

        RoutineShared.defaults.set(["unlock": unlock, "minutes": minutes, "enabled": enabled], forKey: RoutineShared.configKey)

        let center = DeviceActivityCenter()
        center.stopMonitoring([RoutineShared.activity])

        guard enabled else {
            RoutineShared.unshield()
            call.resolve(["enabled": false])
            return
        }
        // Apple needs the daily window to be at least 15 minutes long.
        guard unlockMinute <= 23 * 60 + 44 else {
            call.reject("Pick an unlock time before 23:45")
            return
        }

        let selection = RoutineShared.loadSelection()
        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: hour, minute: minute),
            intervalEnd: DateComponents(hour: 23, minute: 59),
            repeats: true
        )
        let event = DeviceActivityEvent(
            applications: selection.applicationTokens,
            categories: selection.categoryTokens,
            webDomains: selection.webDomainTokens,
            threshold: DateComponents(minute: minutes)
        )
        do {
            try center.startMonitoring(RoutineShared.activity, during: schedule, events: [RoutineShared.limitEvent: event])
        } catch {
            call.reject("Could not start the Screen Time schedule: \(error.localizedDescription)")
            return
        }

        // Before the unlock time the apps are blocked straight away.
        let now = Calendar.current.dateComponents([.hour, .minute], from: Date())
        let nowMinute = (now.hour ?? 0) * 60 + (now.minute ?? 0)
        if nowMinute < unlockMinute { RoutineShared.shield() } else { RoutineShared.unshield() }
        call.resolve(["enabled": true])
    }
}

@available(iOS 16.0, *)
final class PickerModel: ObservableObject {
    @Published var selection: FamilyActivitySelection
    init(selection: FamilyActivitySelection) { self.selection = selection }
}

@available(iOS 16.0, *)
struct AppPickerView: View {
    @ObservedObject var model: PickerModel
    let onDone: (Bool) -> Void

    var body: some View {
        NavigationView {
            FamilyActivityPicker(selection: $model.selection)
                .navigationTitle("Apps to limit")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { onDone(false) } }
                    ToolbarItem(placement: .confirmationAction) { Button("Done") { onDone(true) }.bold() }
                }
        }
    }
}
