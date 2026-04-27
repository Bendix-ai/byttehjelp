import SwiftUI

// Brand-paletten er låst på tvers av web og iOS. Endringer her må reflekteres i
// `src/index.css` (web) og design-bundlen.
public extension Color {
    static let bhPrimary       = Color(bhHex: 0x1E40AF)
    static let bhPrimaryLight  = Color(bhHex: 0x3B82F6)
    static let bhPrimarySoft   = Color(bhHex: 0xE8EDFF)

    static let bhKeeperBg      = Color(bhHex: 0xFDE68A)
    static let bhKeeperInk     = Color(bhHex: 0x92400E)

    static let bhSubInBg       = Color(bhHex: 0xD9EAD3)
    static let bhSubInInk      = Color(bhHex: 0x1F6B32)
    static let bhSubInBgDark   = Color(bhHex: 0x1F3A26)
    static let bhSubInInkDark  = Color(bhHex: 0x86EFAC)

    static let bhSubOutBg      = Color(bhHex: 0xF4CCCC)
    static let bhSubOutInk     = Color(bhHex: 0x8A1F1F)
    static let bhSubOutBgDark  = Color(bhHex: 0x3A1F1F)
    static let bhSubOutInkDark = Color(bhHex: 0xFCA5A5)

    static let bhPitchTop      = Color(bhHex: 0x16A34A)
    static let bhPitchBottom   = Color(bhHex: 0x15803D)

    static let bhSurface       = Color(bhHex: 0xF7F8FA)
}

public extension Color {
    init(bhHex: UInt32, opacity: Double = 1.0) {
        let r = Double((bhHex >> 16) & 0xFF) / 255
        let g = Double((bhHex >> 8) & 0xFF) / 255
        let b = Double(bhHex & 0xFF) / 255
        self.init(red: r, green: g, blue: b, opacity: opacity)
    }
}
