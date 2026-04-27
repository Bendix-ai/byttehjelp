import Foundation
import SwiftData

/// Seedet demo-data — Lyn G09 Blå med en aktiv kamp mot Skeid G09.
/// Idempotent: kjøres bare hvis ingen lag finnes.
public enum SeedData {
    public struct DemoMatch: Sendable {
        public let teamID: UUID
        public let matchID: UUID
    }

    @MainActor
    @discardableResult
    public static func seedIfEmpty(in context: ModelContext) throws -> DemoMatch? {
        // Sjekk om vi allerede har et lag.
        let existing = try context.fetchCount(FetchDescriptor<Team>())
        if existing > 0 { return nil }

        let formation = DefaultFormations.defaultFormation(for: .sevenOnSeven)
        let formationModel = Formation(
            id: formation.id,
            name: formation.name,
            format: formation.format,
            positions: formation.positions,
            isCustom: false
        )
        context.insert(formationModel)

        let team = Team(name: "Lyn G09 Blå", format: .sevenOnSeven, defaultFormationID: formation.id)
        context.insert(team)
        formationModel.team = team

        let names = ["Mathias", "Filip", "Aksel", "Theodor", "Sondre", "Iver", "Oskar", "Noah", "Jakob", "Magnus", "Henrik"]
        var players: [Player] = []
        for (i, name) in names.enumerated() {
            let role: PlayerRole? = i == 0 ? .keeper : nil
            let p = Player(name: name, jerseyNumber: i + 1, roles: role.map { [$0] } ?? [])
            p.team = team
            context.insert(p)
            players.append(p)
        }

        // Lag en starting plan
        let positions = formation.positions
        let playerIDs = players.map(\.id)

        var firstHalf = PlanBuilder.autoRotate(
            availablePlayerIDs: playerIDs.map(\.uuidString),
            positions: positions,
            halfDurationMinutes: 30
        )
        var secondHalf = PlanBuilder.autoRotate(
            availablePlayerIDs: playerIDs.map(\.uuidString),
            positions: positions,
            halfDurationMinutes: 30
        )
        PlanBuilder.recomputeAllBenches(half: &firstHalf, allPlayerIDs: playerIDs.map(\.uuidString))
        PlanBuilder.recomputeAllBenches(half: &secondHalf, allPlayerIDs: playerIDs.map(\.uuidString))

        let draft = Draft(
            name: "Standard",
            formationID: formation.id,
            availablePlayerIDs: playerIDs,
            halves: [firstHalf, secondHalf],
            intervalMinutes: 7.5,
            halfDurationMinutes: 30
        )

        let matchDate = Date()
        let match = Match(
            teamID: team.id,
            opponentName: "Skeid G09",
            date: matchDate,
            kickoffTime: "17:30",
            venue: "Voldsløkka 2",
            format: .sevenOnSeven,
            drafts: [draft],
            activeDraftID: draft.id,
            status: .planning
        )
        context.insert(match)

        try context.save()
        return DemoMatch(teamID: team.id, matchID: match.id)
    }
}
