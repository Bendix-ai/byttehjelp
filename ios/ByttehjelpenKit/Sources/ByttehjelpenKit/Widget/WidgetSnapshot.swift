import Foundation

/// Pre-aggregert data som hovedappen skriver til App Group, og widget-extension leser.
/// Gjenbruker mønsteret fra KronerKamp/Mynt — UserDefaults + fil-fallback.
public struct WidgetSnapshot: Codable, Sendable, Hashable {
    public var hasLiveMatch: Bool
    public var matchID: UUID?
    public var teamName: String
    public var opponentName: String
    public var nextSubAt: Date?
    public var currentPeriod: Int
    public var totalPeriods: Int
    public var nextOutPlayer: PlayerChip?
    public var nextInPlayer: PlayerChip?
    public var generatedAt: Date

    public struct PlayerChip: Codable, Sendable, Hashable {
        public let number: Int
        public let name: String

        public init(number: Int, name: String) {
            self.number = number
            self.name = name
        }
    }

    public init(
        hasLiveMatch: Bool,
        matchID: UUID? = nil,
        teamName: String = "",
        opponentName: String = "",
        nextSubAt: Date? = nil,
        currentPeriod: Int = 0,
        totalPeriods: Int = 0,
        nextOutPlayer: PlayerChip? = nil,
        nextInPlayer: PlayerChip? = nil,
        generatedAt: Date = Date()
    ) {
        self.hasLiveMatch = hasLiveMatch
        self.matchID = matchID
        self.teamName = teamName
        self.opponentName = opponentName
        self.nextSubAt = nextSubAt
        self.currentPeriod = currentPeriod
        self.totalPeriods = totalPeriods
        self.nextOutPlayer = nextOutPlayer
        self.nextInPlayer = nextInPlayer
        self.generatedAt = generatedAt
    }

    public static let placeholder = WidgetSnapshot(
        hasLiveMatch: false,
        teamName: "Lyn G09 Blå",
        opponentName: "Skeid G09"
    )
}
