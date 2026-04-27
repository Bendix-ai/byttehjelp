import Foundation

public enum PlayFormat: String, Codable, Sendable, CaseIterable {
    case fiveOnFive  = "5v5"
    case sevenOnSeven = "7v7"
    case nineOnNine   = "9v9"

    public var displayName: String { rawValue }
    public var fieldCount: Int {
        switch self {
        case .fiveOnFive: return 5
        case .sevenOnSeven: return 7
        case .nineOnNine: return 9
        }
    }
}

public enum PlayerRole: String, Codable, Sendable, CaseIterable {
    case keeper
    case forsvar
    case midtbane
    case angrep

    public var displayName: String {
        switch self {
        case .keeper: return "Keeper"
        case .forsvar: return "Forsvar"
        case .midtbane: return "Midtbane"
        case .angrep: return "Angrep"
        }
    }
}

public enum MatchStatus: String, Codable, Sendable {
    case planning
    case live
    case completed
}
