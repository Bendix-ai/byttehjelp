import SwiftUI
import ByttehjelpenKit

struct LiveMatchView: View {
    let match: Match
    let team: Team

    @State private var viewModel: LiveMatchViewModel?

    var body: some View {
        Group {
            if let vm = viewModel {
                content(vm: vm)
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .task {
            if viewModel == nil {
                viewModel = LiveMatchViewModel(match: match, team: team)
            }
        }
        .onDisappear {
            viewModel?.teardown()
        }
    }

    @ViewBuilder
    private func content(vm: LiveMatchViewModel) -> some View {
        VStack(spacing: 0) {
            topContextBand(vm: vm)
                .padding(.horizontal, 20)
                .padding(.top, 8)
                .padding(.bottom, 6)

            periodMeter(vm: vm)
                .padding(.horizontal, 20)
                .padding(.bottom, 4)

            heroCountdown(vm: vm)
                .padding(.vertical, 16)

            substitutionCards(vm: vm)
                .padding(.horizontal, 16)

            Spacer(minLength: 16)

            actionRow(vm: vm)
                .padding(.horizontal, 16)
                .padding(.bottom, 12)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.bhSurface.ignoresSafeArea())
    }

    // MARK: Top band

    @ViewBuilder
    private func topContextBand(vm: LiveMatchViewModel) -> some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 1) {
                Text(match.opponentName.uppercased())
                    .font(.system(size: 10, weight: .semibold))
                    .tracking(0.6)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                Text("\(match.venue ?? "") · \(match.kickoffTime ?? "")")
                    .font(.system(size: 14, weight: .semibold))
                    .lineLimit(1)
            }
            Spacer()
            elapsedPill(vm: vm)
        }
    }

    private func elapsedPill(vm: LiveMatchViewModel) -> some View {
        let mm = vm.elapsedSec / 60
        let ss = vm.elapsedSec % 60
        return Text(String(format: "%02d:%02d spilt", mm, ss))
            .font(BHFonts.tabular(size: 12))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color.gray.opacity(0.15), in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }

    // MARK: Period meter

    @ViewBuilder
    private func periodMeter(vm: LiveMatchViewModel) -> some View {
        let half = vm.currentHalf
        let count = half?.periods.count ?? 0
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Periode \(vm.periodIndex + 1) av \(count)")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.secondary)
                Spacer()
                if let cur = vm.currentPeriod {
                    Text("\(vm.halfIndex == 0 ? "1." : "2.") omgang · \(cur.startMinute)’–\(cur.endMinute)’")
                        .font(BHFonts.tabular(size: 12, weight: .medium))
                        .foregroundStyle(.tertiary)
                }
            }
            HStack(spacing: 4) {
                ForEach(0 ..< max(1, count), id: \.self) { i in
                    GeometryReader { proxy in
                        ZStack(alignment: .leading) {
                            Capsule().fill(Color.gray.opacity(0.18))
                            if i < vm.periodIndex {
                                Capsule().fill(Color.bhPrimary)
                            } else if i == vm.periodIndex {
                                Capsule()
                                    .fill(Color.bhPrimary)
                                    .frame(width: progressWidth(vm: vm, in: proxy.size.width))
                            }
                        }
                    }
                    .frame(height: 4)
                }
            }
            .frame(height: 4)
        }
    }

    private func progressWidth(vm: LiveMatchViewModel, in total: CGFloat) -> CGFloat {
        guard let cur = vm.currentPeriod else { return 0 }
        let start = Double(cur.startMinute * 60)
        let end = Double(cur.endMinute * 60)
        let now = Double(vm.elapsedSec)
        let frac = max(0, min(1, (now - start) / max(1, end - start)))
        return total * CGFloat(frac)
    }

    // MARK: Hero countdown

    @ViewBuilder
    private func heroCountdown(vm: LiveMatchViewModel) -> some View {
        VStack(spacing: 4) {
            Text(heroLabel(vm: vm).uppercased())
                .font(BHFonts.eyebrow())
                .tracking(1.2)
                .foregroundStyle(vm.isImminent ? Color.orange : .secondary)
            Text(heroDigits(vm: vm))
                .font(BHFonts.displayCountdown())
                .tracking(-3)
                .foregroundStyle(vm.isRunning || vm.elapsedSec == 0 ? Color.primary : Color.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, 12)
        .overlay(alignment: .center) {
            if vm.isImminent {
                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .stroke(Color.orange, lineWidth: 2)
                    .opacity(0.4)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)
                    .allowsHitTesting(false)
            }
        }
    }

    private func heroLabel(vm: LiveMatchViewModel) -> String {
        if vm.nextPeriod == nil {
            return vm.isHalfDone ? "Omgang ferdig" : "Ingen flere bytter"
        }
        if vm.isImminent { return "Bytte nå" }
        if !vm.isRunning && vm.elapsedSec > 0 { return "Pauset · neste bytte" }
        return "Til neste bytte"
    }

    private func heroDigits(vm: LiveMatchViewModel) -> String {
        if let s = vm.secondsToNextSub {
            return String(format: "%02d:%02d", s / 60, s % 60)
        }
        let remaining = max(0, vm.halfDurationSec - vm.elapsedSec)
        return String(format: "%02d:%02d", remaining / 60, remaining % 60)
    }

    // MARK: Substitution cards

    @ViewBuilder
    private func substitutionCards(vm: LiveMatchViewModel) -> some View {
        if vm.upcomingChanges.isEmpty {
            VStack {
                Text(vm.nextPeriod == nil ? "Ingen flere bytter denne omgangen" : "Ingen byttebevegelser ved neste periode")
                    .font(.system(size: 13))
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 18)
            .background(Color.white, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(Color.gray.opacity(0.2))
            )
        } else {
            VStack(spacing: 10) {
                ForEach(vm.upcomingChanges) { change in
                    HStack(spacing: 10) {
                        SubCardView(
                            kind: .out,
                            number: vm.jerseyNumber(change.outgoingID),
                            name: vm.playerName(change.outgoingID),
                            position: change.position
                        )
                        Image(systemName: "arrow.right")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Color.gray.opacity(0.4))
                        SubCardView(
                            kind: .in,
                            number: vm.jerseyNumber(change.incomingID),
                            name: vm.playerName(change.incomingID),
                            position: change.position
                        )
                    }
                }
            }
        }
    }

    // MARK: Actions

    @ViewBuilder
    private func actionRow(vm: LiveMatchViewModel) -> some View {
        VStack(spacing: 10) {
            Button {
                handlePrimary(vm: vm)
            } label: {
                HStack(spacing: 10) {
                    Image(systemName: "checkmark")
                        .font(.system(size: 17, weight: .bold))
                    Text(primaryLabel(vm: vm))
                        .font(.system(size: 18, weight: .bold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, minHeight: 56)
                .background(primaryBG(vm: vm), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                .shadow(color: vm.isImminent ? Color.orange.opacity(0.35) : Color.bhPrimary.opacity(0.32), radius: 14, x: 0, y: 4)
            }
            .disabled(primaryDisabled(vm: vm))

            HStack(spacing: 10) {
                Button {
                    if vm.isRunning { vm.pause() } else { vm.start() }
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: vm.isRunning ? "pause.fill" : "play.fill")
                            .font(.system(size: 13, weight: .bold))
                        Text(vm.isRunning ? "Pause" : (vm.elapsedSec == 0 ? "Start" : "Fortsett"))
                            .font(.system(size: 15, weight: .semibold))
                    }
                    .foregroundStyle(.primary)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(Color.gray.opacity(0.15), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
            }
        }
    }

    private func handlePrimary(vm: LiveMatchViewModel) {
        if vm.nextPeriod == nil {
            vm.advanceHalf()
        } else {
            vm.confirmSubstitution()
        }
    }

    private func primaryLabel(vm: LiveMatchViewModel) -> String {
        if vm.nextPeriod == nil {
            return vm.halfIndex == 0 ? "Til 2. omgang" : "Avslutt kamp"
        }
        return vm.isImminent ? "Bekreft bytte nå" : "Bekreft bytte"
    }

    private func primaryBG(vm: LiveMatchViewModel) -> Color {
        if vm.nextPeriod == nil {
            return vm.halfIndex == 0 ? .bhPrimary : .red
        }
        return vm.isImminent ? .orange : .bhPrimary
    }

    private func primaryDisabled(vm: LiveMatchViewModel) -> Bool {
        vm.nextPeriod == nil && !vm.isHalfDone && vm.halfIndex == 0
    }
}
