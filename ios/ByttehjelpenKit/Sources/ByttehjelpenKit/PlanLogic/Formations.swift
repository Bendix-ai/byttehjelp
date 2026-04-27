import Foundation

/// Standardformasjoner basert på NFFs retningslinjer for barnefotball.
/// Speiler `src/constants/formations.ts` på web.
public enum DefaultFormations {
    public static let all: [FormationSnapshot] = [
        FormationSnapshot(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000005a55")!,
            name: "2-2",
            format: .fiveOnFive,
            positions: ["Keeper", "V. forsvar", "H. forsvar", "V. angrep", "H. angrep"],
            isCustom: false
        ),
        FormationSnapshot(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000007a77")!,
            name: "2-3-1",
            format: .sevenOnSeven,
            positions: ["Keeper", "V. forsvar", "H. forsvar", "V. midtbane", "Midtbane", "H. midtbane", "Spiss"],
            isCustom: false
        ),
        FormationSnapshot(
            id: UUID(uuidString: "00000000-0000-0000-0000-000000009a99")!,
            name: "3-3-2",
            format: .nineOnNine,
            positions: ["Keeper", "V. back", "Midtstopper", "H. back", "V. midtbane", "S. midtbane", "H. midtbane", "V. angrep", "H. angrep"],
            isCustom: false
        )
    ]

    public static func formations(for format: PlayFormat) -> [FormationSnapshot] {
        all.filter { $0.format == format }
    }

    public static func defaultFormation(for format: PlayFormat) -> FormationSnapshot {
        // Garantert ikke-tom siden vi har én standard per format.
        formations(for: format).first!
    }
}
