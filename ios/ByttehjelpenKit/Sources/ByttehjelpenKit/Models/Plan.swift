import Foundation

/// En periode = ett tidsvindu i en omgang. `positions` mapper posisjonsnavn → spiller-UUID-streng
/// (tom streng = ledig posisjon). `bench` er liste av spiller-UUID-strenger som er på benken.
public struct Period: Codable, Sendable, Hashable {
    public var startMinute: Int
    public var endMinute: Int
    public var positions: [String: String]
    public var bench: [String]

    public init(startMinute: Int, endMinute: Int, positions: [String: String], bench: [String]) {
        self.startMinute = startMinute
        self.endMinute = endMinute
        self.positions = positions
        self.bench = bench
    }
}

public struct Half: Codable, Sendable, Hashable {
    public var durationMinutes: Int
    public var periods: [Period]

    public init(durationMinutes: Int, periods: [Period]) {
        self.durationMinutes = durationMinutes
        self.periods = periods
    }
}

public struct Draft: Codable, Sendable, Hashable, Identifiable {
    public var id: UUID
    public var name: String
    public var formationID: UUID
    public var availablePlayerIDs: [UUID]
    public var halves: [Half]
    public var intervalMinutes: Double
    public var halfDurationMinutes: Int
    public var keeperLocked: Bool
    public var createdAt: Date
    public var updatedAt: Date

    public init(
        id: UUID = UUID(),
        name: String,
        formationID: UUID,
        availablePlayerIDs: [UUID],
        halves: [Half],
        intervalMinutes: Double,
        halfDurationMinutes: Int,
        keeperLocked: Bool = true,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.formationID = formationID
        self.availablePlayerIDs = availablePlayerIDs
        self.halves = halves
        self.intervalMinutes = intervalMinutes
        self.halfDurationMinutes = halfDurationMinutes
        self.keeperLocked = keeperLocked
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
