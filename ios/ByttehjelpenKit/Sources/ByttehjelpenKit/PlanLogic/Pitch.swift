import Foundation
import CoreGraphics

/// 100×110 logisk koordinatsystem. Eget mål nederst (y=110), angrep mot toppen (y=20).
/// Speiler `src/utils/pitch.ts` på web.
public enum Pitch {
    public struct Coord: Sendable, Hashable {
        public let x: Double
        public let y: Double

        public init(x: Double, y: Double) {
            self.x = x
            self.y = y
        }
    }

    public enum Row: Double, Sendable {
        case keeper = 96
        case def    = 74
        case mid    = 46
        case att    = 20
    }

    private static let layouts: [String: [String: Coord]] = [
        "5v5-2-2": [
            "Keeper":      Coord(x: 50, y: Row.keeper.rawValue),
            "V. forsvar":  Coord(x: 30, y: Row.def.rawValue),
            "H. forsvar":  Coord(x: 70, y: Row.def.rawValue),
            "V. angrep":   Coord(x: 30, y: Row.att.rawValue),
            "H. angrep":   Coord(x: 70, y: Row.att.rawValue)
        ],
        "7v7-2-3-1": [
            "Keeper":      Coord(x: 50, y: Row.keeper.rawValue),
            "V. forsvar":  Coord(x: 30, y: Row.def.rawValue),
            "H. forsvar":  Coord(x: 70, y: Row.def.rawValue),
            "V. midtbane": Coord(x: 22, y: Row.mid.rawValue),
            "Midtbane":    Coord(x: 50, y: Row.mid.rawValue),
            "H. midtbane": Coord(x: 78, y: Row.mid.rawValue),
            "Spiss":       Coord(x: 50, y: Row.att.rawValue)
        ],
        "9v9-3-3-2": [
            "Keeper":      Coord(x: 50, y: Row.keeper.rawValue),
            "V. back":     Coord(x: 22, y: Row.def.rawValue),
            "Midtstopper": Coord(x: 50, y: Row.def.rawValue),
            "H. back":     Coord(x: 78, y: Row.def.rawValue),
            "V. midtbane": Coord(x: 22, y: Row.mid.rawValue),
            "S. midtbane": Coord(x: 50, y: Row.mid.rawValue),
            "H. midtbane": Coord(x: 78, y: Row.mid.rawValue),
            "V. angrep":   Coord(x: 35, y: Row.att.rawValue),
            "H. angrep":   Coord(x: 65, y: Row.att.rawValue)
        ]
    ]

    private static func guessRow(_ posName: String) -> Row {
        let n = posName.lowercased()
        if n.contains("keeper") || n == "gk" { return .keeper }
        if n.contains("spiss") || n.contains("angrep") || n.contains("forward") || n.contains("striker") { return .att }
        if n.contains("forsvar") || n.contains("back") || n.contains("stopper") || n.contains("libero") { return .def }
        if n.contains("midt") || n.contains("mid") { return .mid }
        return .mid
    }

    /// Returnerer koordinater for hver posisjon i en formasjon.
    /// Fallbacker til auto-layout hvis formasjonen ikke har en hardkodet layout.
    public static func layoutPositions(_ formation: FormationSnapshot) -> [String: Coord] {
        if let mapped = layouts[formation.id.uuidString] {
            return mapped
        }
        // Hardkodet via standardformasjons-IDer (mer pålitelig enn id-streng-lookup)
        switch (formation.format, formation.name) {
        case (.fiveOnFive, "2-2"): return layouts["5v5-2-2"] ?? [:]
        case (.sevenOnSeven, "2-3-1"): return layouts["7v7-2-3-1"] ?? [:]
        case (.nineOnNine, "3-3-2"): return layouts["9v9-3-3-2"] ?? [:]
        default: break
        }

        // Auto-layout for tilpassede formasjoner
        var rows: [Row: [String]] = [.keeper: [], .def: [], .mid: [], .att: []]
        for pos in formation.positions {
            rows[guessRow(pos), default: []].append(pos)
        }
        if (rows[.keeper]?.isEmpty ?? true), let first = formation.positions.first {
            rows[.keeper] = [first]
            for r: Row in [.def, .mid, .att] {
                rows[r] = rows[r]?.filter { $0 != first } ?? []
            }
        }
        var result: [String: Coord] = [:]
        for row in [Row.keeper, .def, .mid, .att] {
            let list = rows[row] ?? []
            let n = list.count
            for (i, pos) in list.enumerated() {
                let x = n == 1 ? 50.0 : 18.0 + (64.0 * Double(i)) / Double(max(1, n - 1))
                result[pos] = Coord(x: x, y: row.rawValue)
            }
        }
        return result
    }
}
