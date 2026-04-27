import Foundation

/// Plan-logikk portert fra `src/utils/plan.ts` og `src/utils/substitution.ts`.
public enum PlanBuilder {

    // MARK: - Build

    /// Bygger en omgang fra ønsket varighet og bytte-intervall.
    public static func buildHalf(durationMinutes: Int, intervalMinutes: Double, positions: [String]) -> Half {
        let periodCount = max(1, Int(round(Double(durationMinutes) / intervalMinutes)))
        var periods: [Period] = []
        for i in 0 ..< periodCount {
            let start = roundedHalf(Double(i) * intervalMinutes)
            let end = i == periodCount - 1 ? Double(durationMinutes) : roundedHalf(Double(i + 1) * intervalMinutes)
            var posMap: [String: String] = [:]
            for p in positions { posMap[p] = "" }
            periods.append(Period(
                startMinute: Int(start.rounded()),
                endMinute: Int(end.rounded()),
                positions: posMap,
                bench: []
            ))
        }
        return Half(durationMinutes: durationMinutes, periods: periods)
    }

    /// Avrunder til 1 desimal.
    private static func roundedHalf(_ x: Double) -> Double {
        (x * 10).rounded() / 10
    }

    // MARK: - Bench

    /// Beregner benk for en gitt periode basert på alle tilgjengelige spillere
    /// og forrige periodes benk (for å bevare rekkefølge).
    public static func computeBench(period: Period, allPlayerIDs: [String], prevBench: [String]) -> [String] {
        let onField = Set(period.positions.values.filter { !$0.isEmpty })
        let shouldBeBenched = allPlayerIDs.filter { !onField.contains($0) }
        var ordered: [String] = []
        for id in prevBench where shouldBeBenched.contains(id) {
            ordered.append(id)
        }
        for id in shouldBeBenched where !ordered.contains(id) {
            ordered.append(id)
        }
        return ordered
    }

    /// Reberegner benk for alle perioder i en omgang.
    public static func recomputeAllBenches(half: inout Half, allPlayerIDs: [String]) {
        for i in 0 ..< half.periods.count {
            let prev = i > 0 ? half.periods[i - 1].bench : []
            half.periods[i].bench = computeBench(period: half.periods[i], allPlayerIDs: allPlayerIDs, prevBench: prev)
        }
    }

    /// Forward-propagerer ufylte posisjoner — hvis periode `i` ikke har spiller på en posisjon,
    /// kopier fra `i-1`.
    public static func copyForward(half: inout Half) {
        for i in 1 ..< half.periods.count {
            for pos in half.periods[i].positions.keys {
                if (half.periods[i].positions[pos] ?? "").isEmpty,
                   let prev = half.periods[i - 1].positions[pos], !prev.isEmpty {
                    half.periods[i].positions[pos] = prev
                }
            }
        }
    }

    // MARK: - Diff

    public struct SubstitutionDiff: Sendable, Hashable {
        public let goingOut: Set<String>
        public let comingIn: Set<String>
    }

    public static func substitutionDiff(prev: [String: String], next: [String: String]) -> SubstitutionDiff {
        let prevField = Set(prev.values.filter { !$0.isEmpty })
        let nextField = Set(next.values.filter { !$0.isEmpty })
        return SubstitutionDiff(
            goingOut: prevField.subtracting(nextField),
            comingIn: nextField.subtracting(prevField)
        )
    }

    // MARK: - Playing time

    /// Returnerer minutter per spiller på tvers av alle omganger.
    public static func calculatePlayingTime(halves: [Half]) -> [String: Double] {
        var minutes: [String: Double] = [:]
        for half in halves {
            for period in half.periods {
                let duration = Double(period.endMinute - period.startMinute)
                for playerID in period.positions.values where !playerID.isEmpty {
                    minutes[playerID, default: 0] += duration
                }
            }
        }
        return minutes
    }

    // MARK: - Auto-rotate

    /// Genererer en omgang hvor spillerne roterer slik at hver bytter seg ut etter tur.
    public static func autoRotate(availablePlayerIDs: [String], positions: [String], halfDurationMinutes: Int) -> Half {
        let fieldCount = positions.count
        let benchCount = availablePlayerIDs.count - fieldCount

        if benchCount <= 0 {
            var posMap: [String: String] = [:]
            for (i, pos) in positions.enumerated() {
                posMap[pos] = i < availablePlayerIDs.count ? availablePlayerIDs[i] : ""
            }
            return Half(
                durationMinutes: halfDurationMinutes,
                periods: [Period(startMinute: 0, endMinute: halfDurationMinutes, positions: posMap, bench: [])]
            )
        }

        let periodCount = benchCount + 1
        let periodLength = roundedHalf(Double(halfDurationMinutes) / Double(periodCount))
        let players = availablePlayerIDs
        var periods: [Period] = []

        for p in 0 ..< periodCount {
            let offset = p * benchCount
            var rotated: [String] = []
            for i in 0 ..< players.count {
                rotated.append(players[(i + offset) % players.count])
            }
            let fieldPlayers = Array(rotated.prefix(fieldCount))
            let benchPlayers = Array(rotated.dropFirst(fieldCount))

            var posMap: [String: String] = [:]
            for (i, pos) in positions.enumerated() {
                posMap[pos] = i < fieldPlayers.count ? fieldPlayers[i] : ""
            }
            let start = roundedHalf(Double(p) * periodLength)
            let end = p == periodCount - 1 ? Double(halfDurationMinutes) : roundedHalf(Double(p + 1) * periodLength)
            periods.append(Period(
                startMinute: Int(start.rounded()),
                endMinute: Int(end.rounded()),
                positions: posMap,
                bench: benchPlayers
            ))
        }

        return Half(durationMinutes: halfDurationMinutes, periods: periods)
    }
}
