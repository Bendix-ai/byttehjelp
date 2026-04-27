import Foundation
#if canImport(WidgetKit)
import WidgetKit
#endif

/// Skriver/leser `WidgetSnapshot` via App Group.
/// Speiler `WidgetStore` fra KronerKamp/Mynt: UserDefaults først, fil-fallback.
public enum WidgetStore {
    private static let snapshotKey = "byttehjelpen.widget.snapshot.v1"

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: BHInfo.appGroupIdentifier)
    }

    private static var fallbackURL: URL? {
        FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: BHInfo.appGroupIdentifier)?
            .appendingPathComponent("widget-snapshot.json")
    }

    public static func write(_ snapshot: WidgetSnapshot) {
        guard let data = try? JSONEncoder().encode(snapshot) else { return }
        defaults?.set(data, forKey: snapshotKey)
        if let url = fallbackURL {
            try? data.write(to: url, options: .atomic)
        }
        reloadTimelines()
    }

    public static func read() -> WidgetSnapshot {
        if let data = defaults?.data(forKey: snapshotKey),
           let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: data) {
            return snapshot
        }
        if let url = fallbackURL,
           let data = try? Data(contentsOf: url),
           let snapshot = try? JSONDecoder().decode(WidgetSnapshot.self, from: data) {
            return snapshot
        }
        return .placeholder
    }

    private static func reloadTimelines() {
        #if canImport(WidgetKit)
        WidgetCenter.shared.reloadAllTimelines()
        #endif
    }
}
