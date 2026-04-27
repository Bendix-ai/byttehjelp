import Foundation
import SwiftData

@Model
public final class Formation {
    @Attribute(.unique) public var id: UUID = UUID()
    public var name: String = ""
    public var formatRaw: String = PlayFormat.nineOnNine.rawValue
    /// Posisjonsnavnene i rekkefølge (Keeper, V. forsvar, ...).
    public var positions: [String] = []
    public var isCustom: Bool = true
    public var team: Team?

    public var format: PlayFormat {
        get { PlayFormat(rawValue: formatRaw) ?? .nineOnNine }
        set { formatRaw = newValue.rawValue }
    }

    public init(
        id: UUID = UUID(),
        name: String,
        format: PlayFormat,
        positions: [String],
        isCustom: Bool = false
    ) {
        self.id = id
        self.name = name
        self.formatRaw = format.rawValue
        self.positions = positions
        self.isCustom = isCustom
    }
}

public struct FormationSnapshot: Sendable, Codable, Hashable {
    public let id: UUID
    public let name: String
    public let format: PlayFormat
    public let positions: [String]
    public let isCustom: Bool

    public init(id: UUID, name: String, format: PlayFormat, positions: [String], isCustom: Bool) {
        self.id = id
        self.name = name
        self.format = format
        self.positions = positions
        self.isCustom = isCustom
    }
}

public extension Formation {
    var snapshot: FormationSnapshot {
        FormationSnapshot(id: id, name: name, format: format, positions: positions, isCustom: isCustom)
    }
}
