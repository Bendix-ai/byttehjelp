import Foundation
#if os(iOS)
import ActivityKit

/// Live Activity-attributter for en pågående kamp. Statisk informasjon (lag, motstander)
/// settes ved start; `ContentState` oppdateres mens kampen pågår.
public struct ByttehjelpenActivityAttributes: ActivityAttributes, Sendable {
    public typealias ContentState = State

    public struct State: Codable, Hashable, Sendable {
        public var nextSubAt: Date
        public var currentPeriodIndex: Int
        public var totalPeriods: Int
        public var nextOutPlayerNumber: Int?
        public var nextOutPlayerName: String?
        public var nextInPlayerNumber: Int?
        public var nextInPlayerName: String?
        public var isPaused: Bool

        public init(
            nextSubAt: Date,
            currentPeriodIndex: Int,
            totalPeriods: Int,
            nextOutPlayerNumber: Int? = nil,
            nextOutPlayerName: String? = nil,
            nextInPlayerNumber: Int? = nil,
            nextInPlayerName: String? = nil,
            isPaused: Bool = false
        ) {
            self.nextSubAt = nextSubAt
            self.currentPeriodIndex = currentPeriodIndex
            self.totalPeriods = totalPeriods
            self.nextOutPlayerNumber = nextOutPlayerNumber
            self.nextOutPlayerName = nextOutPlayerName
            self.nextInPlayerNumber = nextInPlayerNumber
            self.nextInPlayerName = nextInPlayerName
            self.isPaused = isPaused
        }
    }

    public var teamName: String
    public var opponentName: String
    public var matchID: UUID

    public init(teamName: String, opponentName: String, matchID: UUID) {
        self.teamName = teamName
        self.opponentName = opponentName
        self.matchID = matchID
    }
}
#endif
