import Foundation
import SwiftData

@Model
public final class Player {
    @Attribute(.unique) public var id: UUID = UUID()
    public var name: String = ""
    /// Draktnummer (1-basert) — speiler index + 1 i web-appen.
    public var jerseyNumber: Int = 0
    public var rolesRaw: [String] = []
    public var team: Team?
    public var createdAt: Date = Date()

    public var roles: [PlayerRole] {
        get { rolesRaw.compactMap(PlayerRole.init(rawValue:)) }
        set { rolesRaw = newValue.map(\.rawValue) }
    }

    public init(
        id: UUID = UUID(),
        name: String,
        jerseyNumber: Int,
        roles: [PlayerRole] = []
    ) {
        self.id = id
        self.name = name
        self.jerseyNumber = jerseyNumber
        self.rolesRaw = roles.map(\.rawValue)
    }
}

public struct PlayerSnapshot: Sendable, Codable, Hashable {
    public let id: UUID
    public let name: String
    public let jerseyNumber: Int
    public let roles: [PlayerRole]

    public init(id: UUID, name: String, jerseyNumber: Int, roles: [PlayerRole]) {
        self.id = id
        self.name = name
        self.jerseyNumber = jerseyNumber
        self.roles = roles
    }
}

public extension Player {
    var snapshot: PlayerSnapshot {
        PlayerSnapshot(id: id, name: name, jerseyNumber: jerseyNumber, roles: roles)
    }
}
