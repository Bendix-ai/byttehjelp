import SwiftUI
import WidgetKit
import ByttehjelpenKit

struct LiveCountdownWidget: Widget {
    let kind: String = "no.bjarne.byttehjelpen.LiveCountdown"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LiveCountdownProvider()) { entry in
            LiveCountdownEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Bytte-nedtelling")
        .description("Vis tid til neste bytte uten å åpne appen.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

struct LiveCountdownEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}

struct LiveCountdownProvider: TimelineProvider {
    func placeholder(in context: Context) -> LiveCountdownEntry {
        LiveCountdownEntry(date: Date(), snapshot: .placeholder)
    }

    func getSnapshot(in context: Context, completion: @escaping (LiveCountdownEntry) -> Void) {
        completion(LiveCountdownEntry(date: Date(), snapshot: WidgetStore.read()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LiveCountdownEntry>) -> Void) {
        let entry = LiveCountdownEntry(date: Date(), snapshot: WidgetStore.read())
        // Oppdater hvert minutt mens kampen pågår.
        let next = Calendar.current.date(byAdding: .minute, value: 1, to: Date()) ?? Date().addingTimeInterval(60)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

struct LiveCountdownEntryView: View {
    let entry: LiveCountdownEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                RoundedRectangle(cornerRadius: 5, style: .continuous)
                    .fill(Color.bhPrimary)
                    .frame(width: 18, height: 18)
                    .overlay {
                        Text("B").font(.system(size: 11, weight: .heavy)).foregroundStyle(.white)
                    }
                Text("BYTTE")
                    .font(.system(size: 10, weight: .heavy))
                    .tracking(0.6)
                    .foregroundStyle(.secondary)
                Spacer()
                if entry.snapshot.hasLiveMatch {
                    Text("P\(entry.snapshot.currentPeriod)/\(entry.snapshot.totalPeriods)")
                        .font(.system(size: 10, weight: .heavy))
                        .padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Color.bhPrimary, in: RoundedRectangle(cornerRadius: 6, style: .continuous))
                        .foregroundStyle(.white)
                }
            }
            Spacer()
            VStack(alignment: .leading, spacing: 2) {
                Text(countdownText)
                    .font(BHFonts.tabular(size: 38, weight: .bold))
                    .tracking(-1.5)
                Text("vs " + (entry.snapshot.opponentName.isEmpty ? "—" : entry.snapshot.opponentName))
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.secondary)
            }
        }
        .padding(2)
    }

    private var countdownText: String {
        guard entry.snapshot.hasLiveMatch, let nextSubAt = entry.snapshot.nextSubAt else {
            return "—:—"
        }
        let secs = max(0, Int(nextSubAt.timeIntervalSince(entry.date)))
        return String(format: "%d:%02d", secs / 60, secs % 60)
    }
}
