import SwiftUI
import SwiftData
import ByttehjelpenKit

struct RootView: View {
    @Query private var matches: [Match]
    @Query private var teams: [Team]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if let match = currentMatch, let team = teams.first(where: { $0.id == match.teamID }) {
                    LiveMatchView(match: match, team: team)
                } else {
                    EmptyState()
                }
            }
            .background(Color.bhSurface.ignoresSafeArea())
        }
    }

    /// I MVP viser vi bare den ene aktive demo-kampen.
    private var currentMatch: Match? {
        matches.first(where: { $0.status == .live })
            ?? matches.first(where: { $0.status == .planning })
            ?? matches.first
    }
}

private struct EmptyState: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "soccerball")
                .font(.system(size: 48))
                .foregroundStyle(Color.bhPrimary)
            Text("Klar for første kamp")
                .font(.title2.weight(.bold))
            Text("Demo-data lastes inn ved oppstart. Lukk og åpne appen om du ikke ser en kamp.")
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

#Preview {
    RootView()
        .modelContainer(for: [Team.self, Player.self, Formation.self, Match.self], inMemory: true)
}
