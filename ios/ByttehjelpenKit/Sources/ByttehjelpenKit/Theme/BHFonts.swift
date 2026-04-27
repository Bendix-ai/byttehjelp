import SwiftUI

public enum BHFonts {
    /// Stor display-stil for hero-countdown.
    public static func displayCountdown() -> Font {
        .system(size: 92, weight: .bold, design: .default)
            .monospacedDigit()
    }

    /// Mellomstor digital tall (live activity, widgets).
    public static func displayMedium() -> Font {
        .system(size: 56, weight: .bold, design: .default)
            .monospacedDigit()
    }

    /// Tabular digital — for periode-pillen og bar-tall.
    public static func tabular(size: CGFloat, weight: Font.Weight = .semibold) -> Font {
        .system(size: size, weight: weight, design: .default).monospacedDigit()
    }

    /// Eyebrow / overline (uppercase tracker).
    public static func eyebrow() -> Font {
        .system(size: 11, weight: .bold, design: .default)
    }
}
