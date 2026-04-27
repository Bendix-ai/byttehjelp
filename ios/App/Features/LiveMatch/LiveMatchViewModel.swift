import Foundation
import Observation
import ByttehjelpenKit

/// State + logikk for live kamp-skjermen.
/// Driver en presis nedtelling, eksponerer "neste bytte"-info, og styrer pause/play.
@Observable
@MainActor
final class LiveMatchViewModel {
    // MARK: Inputs

    let match: Match
    let team: Team
    let plan: Draft

    // MARK: State

    /// Antall sekunder spilt i nåværende omgang.
    private(set) var elapsedSec: Int = 0
    private(set) var isRunning: Bool = false
    private(set) var halfIndex: Int = 0
    private(set) var periodIndex: Int = 0

    private var startedAt: Date?
    private var elapsedBeforePause: TimeInterval = 0
    private var tickTask: Task<Void, Never>?

    // MARK: Init

    init(match: Match, team: Team) {
        self.match = match
        self.team = team
        // displayPlan kan ikke være nil hvis match har drafts; vi laster fra Match.
        self.plan = match.displayPlan ?? Draft(
            name: "Tom",
            formationID: UUID(),
            availablePlayerIDs: [],
            halves: [],
            intervalMinutes: 7.5,
            halfDurationMinutes: 30
        )
    }

    /// Kalles eksplisitt fra `View.onDisappear` for å rydde opp.
    func teardown() {
        tickTask?.cancel()
        tickTask = nil
    }

    // MARK: Computed

    var halves: [Half] { plan.halves }

    var currentHalf: Half? {
        guard halfIndex < halves.count else { return nil }
        return halves[halfIndex]
    }

    var currentPeriod: Period? {
        guard let half = currentHalf, periodIndex < half.periods.count else { return nil }
        return half.periods[periodIndex]
    }

    var nextPeriod: Period? {
        guard let half = currentHalf else { return nil }
        let next = periodIndex + 1
        return next < half.periods.count ? half.periods[next] : nil
    }

    /// Sekunder til neste bytte. Nil hvis ingen flere perioder.
    var secondsToNextSub: Int? {
        guard let next = nextPeriod else { return nil }
        let boundary = next.startMinute * 60
        return max(0, boundary - elapsedSec)
    }

    var isImminent: Bool {
        if let s = secondsToNextSub, s > 0, s <= 60 { return true }
        return false
    }

    var halfDurationSec: Int {
        currentHalf.map { $0.durationMinutes * 60 } ?? 0
    }

    var isHalfDone: Bool {
        elapsedSec >= halfDurationSec
    }

    /// Kommende endringer fra nåværende → neste periode (filtrert: ikke flagg
    /// spillere som akkurat byttet inn).
    var upcomingChanges: [PendingChange] {
        guard let cur = currentPeriod, let next = nextPeriod else { return [] }
        let prev = periodIndex > 0 ? currentHalf?.periods[periodIndex - 1] : nil
        let recentlyIn: Set<String> = {
            guard let p = prev else { return [] }
            let prevField = Set(p.positions.values.filter { !$0.isEmpty })
            let curField = Set(cur.positions.values.filter { !$0.isEmpty })
            return curField.subtracting(prevField)
        }()

        var result: [PendingChange] = []
        for pos in cur.positions.keys.sorted() {
            let curPid = cur.positions[pos] ?? ""
            let nextPid = next.positions[pos] ?? ""
            if curPid != nextPid {
                if !curPid.isEmpty, recentlyIn.contains(curPid) { continue }
                result.append(PendingChange(
                    position: pos,
                    outgoingID: curPid.isEmpty ? nil : UUID(uuidString: curPid),
                    incomingID: nextPid.isEmpty ? nil : UUID(uuidString: nextPid)
                ))
            }
        }
        return result
    }

    // MARK: Actions

    func start() {
        guard !isRunning else { return }
        startedAt = Date()
        isRunning = true
        tickTask?.cancel()
        tickTask = Task { @MainActor [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(250))
                self?.tick()
            }
        }
    }

    func pause() {
        guard isRunning else { return }
        if let started = startedAt {
            elapsedBeforePause += Date().timeIntervalSince(started)
        }
        isRunning = false
        startedAt = nil
        tickTask?.cancel()
        tickTask = nil
    }

    func confirmSubstitution() {
        guard nextPeriod != nil else { return }
        periodIndex += 1
    }

    func advanceHalf() {
        halfIndex = min(halfIndex + 1, max(0, halves.count - 1))
        periodIndex = 0
        elapsedBeforePause = 0
        elapsedSec = 0
        startedAt = nil
        isRunning = false
    }

    // MARK: Internal

    private func tick() {
        guard let started = startedAt else { return }
        let now = Date()
        elapsedSec = Int(elapsedBeforePause + now.timeIntervalSince(started))

        // Auto-advance when crossing a period boundary
        if let next = nextPeriod {
            if elapsedSec >= next.startMinute * 60 {
                periodIndex += 1
            }
        }
    }

    // MARK: Helpers for view

    func playerName(_ id: UUID?) -> String? {
        guard let id else { return nil }
        return team.players?.first(where: { $0.id == id })?.name
    }

    func jerseyNumber(_ id: UUID?) -> Int? {
        guard let id else { return nil }
        return team.players?.first(where: { $0.id == id })?.jerseyNumber
    }
}

struct PendingChange: Identifiable, Hashable {
    let position: String
    let outgoingID: UUID?
    let incomingID: UUID?

    var id: String { position }
}
