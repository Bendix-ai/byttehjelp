import Foundation
import SwiftData

@Model
public final class Match {
    @Attribute(.unique) public var id: UUID = UUID()
    public var teamID: UUID = UUID()
    public var opponentName: String = ""
    public var date: Date = Date()
    public var kickoffTime: String?
    public var venue: String?
    public var formatRaw: String = PlayFormat.nineOnNine.rawValue
    public var activeDraftID: UUID = UUID()
    public var statusRaw: String = MatchStatus.planning.rawValue
    public var resultHome: Int?
    public var resultAway: Int?
    public var createdAt: Date = Date()

    /// JSON-encoded `[Draft]` (alle planlagte varianter for kampen).
    public var draftsData: Data = Data()

    /// JSON-encoded `Draft?` — frosset snapshot ved kamp-start.
    public var livePlanData: Data?

    public var format: PlayFormat {
        get { PlayFormat(rawValue: formatRaw) ?? .nineOnNine }
        set { formatRaw = newValue.rawValue }
    }

    public var status: MatchStatus {
        get { MatchStatus(rawValue: statusRaw) ?? .planning }
        set { statusRaw = newValue.rawValue }
    }

    public var drafts: [Draft] {
        get { (try? JSONDecoder().decode([Draft].self, from: draftsData)) ?? [] }
        set { draftsData = (try? JSONEncoder().encode(newValue)) ?? Data() }
    }

    public var livePlan: Draft? {
        get {
            guard let data = livePlanData else { return nil }
            return try? JSONDecoder().decode(Draft.self, from: data)
        }
        set { livePlanData = newValue.flatMap { try? JSONEncoder().encode($0) } }
    }

    public init(
        id: UUID = UUID(),
        teamID: UUID,
        opponentName: String,
        date: Date,
        kickoffTime: String? = nil,
        venue: String? = nil,
        format: PlayFormat,
        drafts: [Draft],
        activeDraftID: UUID,
        status: MatchStatus = .planning
    ) {
        self.id = id
        self.teamID = teamID
        self.opponentName = opponentName
        self.date = date
        self.kickoffTime = kickoffTime
        self.venue = venue
        self.formatRaw = format.rawValue
        self.activeDraftID = activeDraftID
        self.statusRaw = status.rawValue
        self.draftsData = (try? JSONEncoder().encode(drafts)) ?? Data()
    }
}

public extension Match {
    /// Returnerer aktiv plan: livePlan hvis frosset, ellers active draft, ellers første draft.
    var displayPlan: Draft? {
        if let live = livePlan { return live }
        let all = drafts
        if let active = all.first(where: { $0.id == activeDraftID }) { return active }
        return all.first
    }
}
