import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity

/// Shared between the app and the RoutineMonitor extension (through the App Group).
/// If you change the bundle id, change `appGroup` here and in RoutineMonitor too.
enum RoutineShared {
    static let appGroup = "group.com.routine.habits"
    static let selectionKey = "routine.selection"
    static let configKey = "routine.config"
    static let activity = DeviceActivityName("routine.daily")
    static let limitEvent = DeviceActivityEvent.Name("routine.limit")

    static var defaults: UserDefaults { UserDefaults(suiteName: appGroup) ?? .standard }

    @available(iOS 16.0, *)
    static var store: ManagedSettingsStore { ManagedSettingsStore(named: ManagedSettingsStore.Name("routine")) }

    @available(iOS 16.0, *)
    static func loadSelection() -> FamilyActivitySelection {
        guard let data = defaults.data(forKey: selectionKey),
              let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
        else { return FamilyActivitySelection() }
        return selection
    }

    @available(iOS 16.0, *)
    static func saveSelection(_ selection: FamilyActivitySelection) {
        if let data = try? JSONEncoder().encode(selection) {
            defaults.set(data, forKey: selectionKey)
        }
    }

    @available(iOS 16.0, *)
    static func selectedCount(_ s: FamilyActivitySelection) -> Int {
        s.applicationTokens.count + s.categoryTokens.count + s.webDomainTokens.count
    }

    /// Show Apple's "Time limit" screen on the chosen apps.
    @available(iOS 16.0, *)
    static func shield() {
        let s = loadSelection()
        store.shield.applications = s.applicationTokens.isEmpty ? nil : s.applicationTokens
        store.shield.applicationCategories = s.categoryTokens.isEmpty ? nil : .specific(s.categoryTokens)
        store.shield.webDomains = s.webDomainTokens.isEmpty ? nil : s.webDomainTokens
    }

    @available(iOS 16.0, *)
    static func unshield() {
        store.clearAllSettings()
    }
}
