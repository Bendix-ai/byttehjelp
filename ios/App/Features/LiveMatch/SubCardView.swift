import SwiftUI
import ByttehjelpenKit

struct SubCardView: View {
    enum Kind { case out, `in` }

    let kind: Kind
    let number: Int?
    let name: String?
    let position: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 5) {
                Image(systemName: kind == .out ? "arrow.down" : "arrow.up")
                    .font(.system(size: 11, weight: .bold))
                Text(kind == .out ? "UT" : "INN")
                    .font(.system(size: 9.5, weight: .heavy))
                    .tracking(1.2)
            }
            .opacity(0.85)
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(number.map { "#\($0)" } ?? "–")
                    .font(BHFonts.tabular(size: 22, weight: .bold))
                Text(name ?? "–")
                    .font(.system(size: 14, weight: .semibold))
                    .lineLimit(1)
            }
            Text(position)
                .font(.system(size: 11, weight: .medium))
                .opacity(0.7)
                .lineLimit(1)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(background, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .foregroundStyle(foreground)
    }

    private var background: Color {
        kind == .out ? .bhSubOutBg : .bhSubInBg
    }

    private var foreground: Color {
        kind == .out ? .bhSubOutInk : .bhSubInInk
    }
}

#Preview {
    VStack(spacing: 12) {
        SubCardView(kind: .out, number: 7, name: "Theodor", position: "V. midtbane")
        SubCardView(kind: .in, number: 6, name: "Noah", position: "V. midtbane")
    }
    .padding()
}
