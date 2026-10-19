import DeviceActivity
import ManagedSettings
import FamilyControls
import Foundation

// Paste this over the file Xcode creates for the "Device Activity Monitor Extension" target.
// It runs in the background, even when Routine is closed:
//   unlock time  -> apps open
//   minutes used -> apps blocked
//   end of day   -> apps blocked until the next unlock time
// Keep `appGroup` the same as in App/App/RoutineShared.swift.

private let appGroup = "group.com.routine.habits"
private let selectionKey = "routine.selection"

class DeviceActivityMonitorExtension: DeviceActivityMonitor {
    private let store = ManagedSettingsStore(named: ManagedSettingsStore.Name("routine"))

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        store.clearAllSettings()
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        shield()
    }

    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)
        shield()
    }

    private func shield() {
        guard let data = UserDefaults(suiteName: appGroup)?.data(forKey: selectionKey),
              let s = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) else { return }
        store.shield.applications = s.applicationTokens.isEmpty ? nil : s.applicationTokens
        store.shield.applicationCategories = s.categoryTokens.isEmpty ? nil : .specific(s.categoryTokens)
        store.shield.webDomains = s.webDomainTokens.isEmpty ? nil : s.webDomainTokens
    }
}
