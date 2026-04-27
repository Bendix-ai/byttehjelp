import Testing
@testable import ByttehjelpenKit

@Suite("Plan-builder")
struct PlanBuilderTests {

    @Test("buildHalf lager riktig antall perioder for 30 min × 7.5 min interval")
    func buildHalfPeriodCount() {
        let half = PlanBuilder.buildHalf(
            durationMinutes: 30,
            intervalMinutes: 7.5,
            positions: ["Keeper", "V. forsvar", "H. forsvar"]
        )
        #expect(half.periods.count == 4)
        #expect(half.periods.first?.startMinute == 0)
        #expect(half.periods.last?.endMinute == 30)
    }

    @Test("buildHalf har tomme posisjoner")
    func buildHalfEmptyPositions() {
        let half = PlanBuilder.buildHalf(
            durationMinutes: 30,
            intervalMinutes: 15,
            positions: ["Keeper", "V. back"]
        )
        for period in half.periods {
            #expect(period.positions["Keeper"] == "")
            #expect(period.positions["V. back"] == "")
            #expect(period.bench.isEmpty)
        }
    }

    @Test("buildHalf med interval = duration gir én periode")
    func buildHalfSinglePeriod() {
        let half = PlanBuilder.buildHalf(durationMinutes: 30, intervalMinutes: 30, positions: ["Keeper"])
        #expect(half.periods.count == 1)
    }

    @Test("computeBench setter alle ikke-på-banen-spillere på benken")
    func computeBenchAll() {
        let period = Period(
            startMinute: 0,
            endMinute: 15,
            positions: ["Keeper": "p1", "V. back": "p2", "H. back": ""],
            bench: []
        )
        let result = PlanBuilder.computeBench(
            period: period,
            allPlayerIDs: ["p1", "p2", "p3", "p4"],
            prevBench: []
        )
        #expect(result == ["p3", "p4"])
    }

    @Test("computeBench bevarer rekkefølge fra forrige benk")
    func computeBenchPreservesOrder() {
        let period = Period(
            startMinute: 0,
            endMinute: 15,
            positions: ["Keeper": "p1"],
            bench: []
        )
        let result = PlanBuilder.computeBench(
            period: period,
            allPlayerIDs: ["p1", "p2", "p3"],
            prevBench: ["p3", "p2"]
        )
        #expect(result == ["p3", "p2"])
    }

    @Test("copyForward propagerer posisjoner til neste periode")
    func copyForwardWorks() {
        var half = Half(durationMinutes: 30, periods: [
            Period(startMinute: 0, endMinute: 15, positions: ["Keeper": "p1", "V. back": "p2"], bench: []),
            Period(startMinute: 15, endMinute: 30, positions: ["Keeper": "", "V. back": ""], bench: [])
        ])
        PlanBuilder.copyForward(half: &half)
        #expect(half.periods[1].positions["Keeper"] == "p1")
        #expect(half.periods[1].positions["V. back"] == "p2")
    }

    @Test("calculatePlayingTime summerer minutter")
    func calculatePlayingTimeSums() {
        let half1 = Half(durationMinutes: 30, periods: [
            Period(startMinute: 0, endMinute: 15, positions: ["Keeper": "p1", "V. back": "p2"], bench: []),
            Period(startMinute: 15, endMinute: 30, positions: ["Keeper": "p1", "V. back": "p3"], bench: [])
        ])
        let times = PlanBuilder.calculatePlayingTime(halves: [half1])
        #expect(times["p1"] == 30)
        #expect(times["p2"] == 15)
        #expect(times["p3"] == 15)
    }

    @Test("substitutionDiff identifiserer ut/inn")
    func substitutionDiffWorks() {
        let prev = ["Keeper": "p1", "V. back": "p2", "H. back": "p3"]
        let next = ["Keeper": "p1", "V. back": "p4", "H. back": "p3"]
        let diff = PlanBuilder.substitutionDiff(prev: prev, next: next)
        #expect(diff.goingOut == ["p2"])
        #expect(diff.comingIn == ["p4"])
    }
}

@Suite("Formasjoner")
struct FormationsTests {
    @Test("standardformasjoner finnes for alle formater")
    func defaultsExist() {
        #expect(DefaultFormations.defaultFormation(for: .fiveOnFive).name == "2-2")
        #expect(DefaultFormations.defaultFormation(for: .sevenOnSeven).name == "2-3-1")
        #expect(DefaultFormations.defaultFormation(for: .nineOnNine).name == "3-3-2")
    }

    @Test("9v9 har 9 posisjoner")
    func nineOnNineHasNinePositions() {
        let formation = DefaultFormations.defaultFormation(for: .nineOnNine)
        #expect(formation.positions.count == 9)
        #expect(formation.positions.first == "Keeper")
    }
}

@Suite("Bane-layout")
struct PitchTests {
    @Test("Keeper er nederst på banen for 9v9")
    func keeperPositioning() {
        let formation = DefaultFormations.defaultFormation(for: .nineOnNine)
        let layout = Pitch.layoutPositions(formation)
        guard let keeper = layout["Keeper"] else {
            Issue.record("Keeper-koordinat mangler")
            return
        }
        #expect(keeper.y == Pitch.Row.keeper.rawValue)
        #expect(keeper.x == 50)
    }

    @Test("Spisser er øverst")
    func attackPositioning() {
        let formation = DefaultFormations.defaultFormation(for: .nineOnNine)
        let layout = Pitch.layoutPositions(formation)
        #expect(layout["V. angrep"]?.y == Pitch.Row.att.rawValue)
        #expect(layout["H. angrep"]?.y == Pitch.Row.att.rawValue)
    }
}
