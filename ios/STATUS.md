# Byttehjelpen iOS — status

**Sist oppdatert:** 2026-04-27

## TL;DR

- **Fremgang mot TestFlight:** ~25 % (bootstrap fullført)
- **Bygger:** Ja — XcodeGen genererer prosjekt, app + widget bygger på iOS Simulator
- **Tester:** 12/12 grønne i `ByttehjelpenKit`
- **Demo-flyt:** Live Match-skjermen kjører med seedet Lyn G09 vs Skeid G09

## 1. Ferdig

### Pakke A — Bootstrap (uke 1)
- [x] `project.yml` (XcodeGen)
- [x] `ByttehjelpenKit` Swift Package, Swift 6, defaultLocalization "nb"
- [x] Folder-struktur som speiler KronerKamp/Mynt
- [x] App + Widget Info.plist + entitlements (App Group + iCloud + LiveActivities)

### Pakke B — Theme + modeller
- [x] `BHColors`: full palett portert fra `tokens.jsx`
- [x] `BHFonts`: SF Pro-stack med tabular numerals
- [x] `@Model`-entiteter: `Team`, `Player`, `Formation`, `Match`
- [x] Codable structs: `Period`, `Half`, `Draft`
- [x] Sendable Snapshots: `TeamSnapshot`, `PlayerSnapshot`, `FormationSnapshot`
- [x] Enums: `PlayFormat`, `PlayerRole`, `MatchStatus`

### Pakke C — Plan-logikk (port fra TypeScript)
- [x] `DefaultFormations` (5v5/2-2, 7v7/2-3-1, 9v9/3-3-2)
- [x] `Pitch.layoutPositions` (100×110-koordinater per formasjon)
- [x] `PlanBuilder.buildHalf` / `computeBench` / `recomputeAllBenches` / `copyForward`
- [x] `PlanBuilder.calculatePlayingTime` / `substitutionDiff` / `autoRotate`
- [x] 12 tester i Swift Testing-framework — alle grønne

### Pakke D — Persistens
- [x] `ByttehjelpenStore.container()` med App Group + fallback (KronerKamp-pattern)
- [x] CloudKit-config klar men deaktivert (`cloudKitDatabase: .none`)
- [x] `SeedData.seedIfEmpty()` — idempotent demo-data ved første oppstart

### Pakke E — Widget skjelett
- [x] `WidgetSnapshot` Codable struct
- [x] `WidgetStore` (UserDefaults + fil-fallback via App Group)
- [x] `LiveCountdownWidget` (Small + Medium) som leser fra `WidgetStore`

### Pakke F — Live Activity skjelett
- [x] `ByttehjelpenActivityAttributes` med ContentState (next sub, period, players)

### Pakke G — App-skjerm: Live Match
- [x] `LiveMatchViewModel` (@Observable @MainActor) — driver tick, period-state, "neste bytte"
- [x] `LiveMatchView` (SwiftUI) — speiler webdesignet pixel-nært
  - Top context band, periode-meter, hero-countdown, bytte-kort, action-row
- [x] `SubCardView` — UT/INN-kort med riktige tokens
- [x] `RootView` med Empty State

## 2. Gjenstående mot TestFlight

### Pakke H — Polish + manglende skjermer (uke 3–4)
- [ ] Onboarding (3 steg: velkomst, lag, spillere)
- [ ] Matches-liste (live-banner, FAB, tab bar)
- [ ] Planner-mobil (bane fullskjerm, periode-velger, spilletid-rail)
- [ ] Etterkamp (resultat, spilletid-fasit, del kampplan)
- [ ] Innstillinger (varsler, eksport, om)
- [ ] Ad-hoc modaler (skadet, swap, formasjon)

### Pakke I — On-field ekstrene (uke 5–7)
- [ ] Live Activity implementert i Widget-target (Compact, Expanded, Lock Screen)
- [ ] Push-varsler 5 og 0 min før bytte
- [ ] Wake lock under live (forhindre at iPhone slumrer)
- [ ] Haptisk feedback på bekreft-bytte
- [ ] WidgetSnapshot oppdateres automatisk ved bytte

### Pakke J — Apple Watch (uke 8)
- [ ] Watch-target i `project.yml`
- [ ] Bytte-kort SwiftUI for Watch
- [ ] Modular small + modular large komplikasjoner
- [ ] WatchConnectivity-sync ved kampstart

### Pakke K — Eksport (uke 9)
- [ ] PDF-eksport (PDFKit) — port av webens MatchPdfDocument
- [ ] Apple share sheet

### Pakke L — Release-polish (uke 10–11)
- [ ] App-ikon (variant av "B"-merket)
- [ ] Launch screen
- [ ] Localizable.xcstrings utfylt for nb (og senere en)
- [ ] Reduce Motion-håndtering
- [ ] VoiceOver-tilpasninger (annonser bytte-kort)
- [ ] Dynamic Type opp til AccessibilityXL
- [ ] Personvern + support sider på `byttehjelp.no/personvern` og `/support`

### Pakke M — App Store Submission (uke 12–13)
- [ ] Reserver `no.bjarne.byttehjelpen` på developer.apple.com
- [ ] Opprett iCloud Container `iCloud.no.bjarne.byttehjelpen`
- [ ] Opprett App Group `group.no.bjarne.byttehjelpen`
- [ ] App Store Connect-record
- [ ] 6 screenshots × 3 device-størrelser
- [ ] App preview-video (30s)
- [ ] App Privacy nutrition labels
- [ ] TestFlight intern + ekstern beta
- [ ] Submit til review

## 3. Bjarnes manuelle steg (i Apple Developer Portal)

1. Reserver bundle-ID `no.bjarne.byttehjelpen` (Identifiers → +)
2. Reserver bundle-ID `no.bjarne.byttehjelpen.widget`
3. Opprett iCloud Container `iCloud.no.bjarne.byttehjelpen`
4. Opprett App Group `group.no.bjarne.byttehjelpen`
5. Knytt iCloud Container og App Group til begge bundle-IDer
6. App Store Connect: opprett app-record
