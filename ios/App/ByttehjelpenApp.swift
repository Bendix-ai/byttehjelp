import SwiftUI
import SwiftData
import ByttehjelpenKit

@main
struct ByttehjelpenApp: App {
    let modelContainer: ModelContainer

    init() {
        do {
            self.modelContainer = try ByttehjelpenStore.container()
        } catch {
            fatalError("Klarte ikke å sette opp SwiftData-container: \(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .task {
                    await seedIfNeeded()
                }
        }
        .modelContainer(modelContainer)
    }

    @MainActor
    private func seedIfNeeded() async {
        do {
            _ = try SeedData.seedIfEmpty(in: modelContainer.mainContext)
        } catch {
            print("Seed feilet: \(error)")
        }
    }
}
