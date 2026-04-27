import Foundation
import SwiftData

public enum ByttehjelpenStore {
    public static let schema = Schema([
        Team.self,
        Player.self,
        Formation.self,
        Match.self
    ])

    public enum StoreError: Error {
        case notFound
        case invalidConfiguration(String)
    }

    /// Lokalt-bare SwiftData-container i v1. CloudKit-mirror aktiveres i v1.2 via
    /// `cloudKitDatabase: .private(BHInfo.iCloudContainerIdentifier)` når vi har
    /// avklart konflikt-strategi.
    public static func container(inMemory: Bool = false) throws -> ModelContainer {
        if inMemory {
            let config = ModelConfiguration(isStoredInMemoryOnly: true)
            return try ModelContainer(for: schema, configurations: [config])
        }

        // App Group-container hvis registrert (krever entitlement på enhet/sim
        // signert med Bjarne's Team). Fall back til standard hvis ikke.
        let appGroupAvailable = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: BHInfo.appGroupIdentifier) != nil

        if appGroupAvailable {
            let config = ModelConfiguration(
                groupContainer: .identifier(BHInfo.appGroupIdentifier),
                cloudKitDatabase: .none
            )
            if let container = try? ModelContainer(for: schema, configurations: [config]) {
                return container
            }
        }

        let defaultConfig = ModelConfiguration(cloudKitDatabase: .none)
        return try ModelContainer(for: schema, configurations: [defaultConfig])
    }
}
