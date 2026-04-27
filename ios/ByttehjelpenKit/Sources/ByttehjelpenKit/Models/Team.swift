import Foundation
import SwiftData

@Model
public final class Team {
    @Attribute(.unique) public var id: UUID = UUID()
    public var name: String = ""
    public var formatRaw: String = PlayFormat.nineOnNine.rawValue
    public var defaultFormationID: UUID?
    public var createdAt: Date = Date()

    @Relationship(deleteRule: .cascade, inverse: \Player.team)
    public var players: [Player]? = []

    @Relationship(deleteRule: .cascade, inverse: \Formation.team)
    public var savedFormations: [Formation]? = []

    public var format: PlayFormat {
        get { PlayFormat(rawValue: formatRaw) ?? .nineOnNine }
        set { formatRaw = newValue.rawValue }
    }

    public init(
        id: UUID = UUID(),
        name: String,
        format: PlayFormat,
        defaultFormationID: UUID? = nil
    ) {
        self.id = id
        self.name = name
        self.formatRaw = format.rawValue
        self.defaultFormationID = defaultFormationID
    }
}

public struct TeamSnapshot: Sendable, Codable, Hashable {
    public let id: UUID
    public let name: String
    public let format: PlayFormat
    public let players: [PlayerSnapshot]
    public let defaultFormationID: UUID?

    public init(id: UUID, name: String, format: PlayFormat, players: [PlayerSnapshot], defaultFormationID: UUID?) {
        self.id = id
        self.name = name
        self.format = format
        self.players = players
        self.defaultFormationID = defaultFormationID
    }
}

public extension Team {
    var snapshot: TeamSnapshot {
        TeamSnapshot(
            id: id,
            name: name,
            format: format,
            players: (players ?? []).sorted(by: { $0.jerseyNumber < $1.jerseyNumber }).map(\.snapshot),
            defaultFormationID: defaultFormationID
        )
    }
}
