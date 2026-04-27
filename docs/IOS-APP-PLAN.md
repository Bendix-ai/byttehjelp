# Byttehjelpen iOS — App Store-plan

**Mål:** Native iPhone-app i App Store med Live Activity, widgets, Apple Watch.
**Verdiløfte:** "Ingen barn glemt på benken. Glanseable nedtelling til neste bytte — på sidelinjen, i regn, med kalde fingre."

Webappen (byttehjelp.no) forblir flaggskipet for **planlegging** og PDF-eksport. iOS-appen er for **gjennomføring** på sidelinjen.

> **KronerKamp/Mynt-arv:** Bjarne har en moden iOS-stack i `~/Claude/Utviklingsprosjekter/KronerKamp` som er ~98 % klar for TestFlight. Vi gjenbruker patterns og infrastruktur derfra: XcodeGen-oppsett, `KeychainStore`, `WidgetStore` (App Group + UserDefaults + fil-fallback), `SeedData`, `@MainActor @Observable` DI-container, lokaliserings-pipeline, Apple Team-ID `2LDD6W7DC5`.

---

## 1. Strategi

### Hvorfor native, ikke PWA?
- **Live Activity / Dynamic Island:** umulig i nettleseren. Dette er hovedverdien.
- **Lock Screen-widgets, Home Screen-widgets, StandBy:** krever WidgetKit.
- **Apple Watch-komplikasjoner:** krever WatchKit/SwiftUI.
- **Push-varsler** med haptics og kritiske lyder fungerer mye bedre native.
- **App Store-tilstedeværelse** = oppdagbarhet for trenere som ikke kjenner webappen.

### Tech-stack (samme som KronerKamp/Mynt)
- **Xcode 26+, Swift 6.0**, iOS 17.0 minimum
- **XcodeGen** (`brew install xcodegen`) → genererer `.xcodeproj` fra `project.yml`. `.xcodeproj` er gitignored
- **SwiftUI** + **SwiftData** (modeller som `@Model`)
- **CloudKit** via `NSPersistentCloudKitContainer` + `iCloud.no.bjarne.byttehjelpen`
- **App Group**: `group.no.bjarne.byttehjelpen` (delt mellom app + widget extension)
- **ActivityKit** for Live Activity (`NSSupportsLiveActivities: true` i Info.plist)
- **WidgetKit** for Home/Lock Screen
- **WatchKit + SwiftUI** for Apple Watch (legges til i v1.1)
- **Swift Testing-framework** (`swift test` → forventer alle grønne)
- **Lokalisering** via `Localizable.xcstrings`, `defaultLocalization: "nb"`

### Datamodell-paritet med web
Webappens `Team`/`Match`/`Draft`/`Period`-modell porteres til SwiftData `@Model`-entiteter med Sendable Snapshot-typer for å krysse aktørgrenser (samme pattern som KronerKamp). Repositories som `@ModelActor`. v1 = lokal SwiftData; v1.2 aktiverer CloudKit-synk via Apple-ID.

---

## 2. Arkitektur (speiler KronerKamp)

```
byttehjelp/                             # eksisterende web-prosjekt
├── src/                                # web-app (uendret)
├── docs/                               # IOS-APP-PLAN.md, SWOT.md
├── landing/                            # statisk side: index, personvern, support
└── ios/                                # ↓ NY iOS-mappe
    ├── project.yml                     # XcodeGen-konfig (kilde)
    ├── ByttehjelpenKit/                # Swift Package (delt kode)
    │   ├── Package.swift               # iOS 17, macOS 14, Swift 6, defaultLocalization "nb"
    │   ├── Sources/ByttehjelpenKit/
    │   │   ├── Models/                 # Team, Player, Match, Draft, Period, Formation (@Model)
    │   │   ├── Repositories/           # TeamRepository, MatchRepository (@ModelActor)
    │   │   ├── Services/               # TimerService, PlanLogic, NotificationService
    │   │   ├── Theme/                  # BHColors, BHFonts, Tokens (mirror tokens.jsx)
    │   │   ├── Persistence/            # ByttehjelpenStore (ModelContainer + App Group)
    │   │   ├── Widget/                 # WidgetSnapshot, WidgetStore (UserDefaults+fil-fallback)
    │   │   ├── LiveActivity/           # ByttehjelpenActivityAttributes
    │   │   ├── Sync/                   # CloudKit-config (klar v1.2)
    │   │   └── Seed/                   # SeedData (Lyn G09 demo-lag)
    │   └── Tests/ByttehjelpenKitTests/
    ├── App/                            # iPhone-app target
    │   ├── ByttehjelpenApp.swift       # @main
    │   ├── Info.plist
    │   ├── Byttehjelpen.entitlements   # iCloud + App Group
    │   ├── Resources/
    │   │   ├── Assets.xcassets         # AppIcon, farger, banekart-SVG
    │   │   └── Localizable.xcstrings   # nb (en kommer i v1.1)
    │   ├── Session/                    # KeychainStore (kopier fra KronerKamp)
    │   ├── Features/
    │   │   ├── Onboarding/             # 3 skjermer
    │   │   ├── Matches/                # liste + opprett
    │   │   ├── Planner/                # mobil-planlegger
    │   │   ├── LiveMatch/              # KRITISK
    │   │   ├── PostMatch/              # spilletid-fasit
    │   │   └── Settings/
    │   └── Preview Content/
    └── Widget/                         # widget-extension target
        ├── ByttehjelpenWidget.swift    # @main
        ├── Info.plist
        ├── Byttehjelpen.entitlements   # samme App Group
        ├── Live/LiveMatchActivity.swift     # Dynamic Island + Lock Screen
        ├── Home/{Small,Medium,Large}.swift  # 3 home-widgets
        └── Lock/{Inline,Circle,Rect}.swift  # 3 lock-komplikasjoner
```

**Bundle-IDs (forhold til KronerKamp):**
- App: `no.bjarne.byttehjelpen`
- Widget: `no.bjarne.byttehjelpen.widget`
- iCloud container: `iCloud.no.bjarne.byttehjelpen`
- App Group: `group.no.bjarne.byttehjelpen`
- Watch (v1.1): `no.bjarne.byttehjelpen.watch`

**Apple Team:** `2LDD6W7DC5` (samme som KronerKamp)

---

## 3. Funksjonalitet — milepæler

### MVP (App Store v1.0)
- [ ] Onboarding 3 steg
- [ ] Lag-CRUD (1 lag per bruker for v1)
- [ ] Spillere (legg til, slett, redigér rolle og draktnummer)
- [ ] Kamper (liste + opprett + slett)
- [ ] Planlegger mobil (bane-view + tabell-view, drag&drop posisjoner)
- [ ] Live Match med countdown + bytte-kort + bekreft
- [ ] **Live Activity** (compact + expanded + lock screen)
- [ ] Push-varsel 5 min og 0 min før bytte
- [ ] Etterkamp med spilletid-fasit
- [ ] PDF-eksport (Apple share sheet)

### v1.1 — On-the-field magi
- [ ] Apple Watch-app + 2 komplikasjoner
- [ ] Hjemskjerm-widgets (S/M/L)
- [ ] Lock Screen-komplikasjoner (rect/circle/inline)
- [ ] Ad-hoc endringer i kamp (skadet, swap, formasjon)
- [ ] StandBy-modus
- [ ] Haptics under bytter

### v1.2 — Synk og samarbeid
- [ ] CloudKit-synk på tvers av enheter
- [ ] Del laget med assistenttrener (kun lese)
- [ ] iCloud Backup
- [ ] iPad-layout (split view)

### v2.0 — Multilag og premium
- [ ] Flere lag per bruker
- [ ] Sesongstatistikk (totale minutter per spiller over alle kamper)
- [ ] Klubblogo og lagfarger
- [ ] Eksport til Excel
- [ ] Apple Watch-only quick start
- [ ] Premium ($2.99/mnd eller $19.99/år) — vurderes etter v1

---

## 4. Veikart — uker

**Uke 1: Bootstrap**
- Kopier KronerKamp-`project.yml` som mal, tilpass navn/bundle-IDs
- Scaffold `ios/ByttehjelpenKit/` (Package.swift + folder-struktur)
- Kopier inn `KeychainStore`, `WidgetStore`, `SeedData`-mønsteret
- Port `tokens.jsx` → `BHColors.swift` + `BHFonts.swift`
- Port web-modellene (`Team`, `Player`, `Match`, `Draft`, `Period`, `Formation`) til `@Model`
- `swift test` gir minst en grønn test (sanity check)
- `xcodegen generate` → bygger på første forsøk i Xcode 26+

**Uke 2: Pitch + tokens**
- `BHPitch.swift` (SwiftUI Canvas) — port `pitch.jsx`-koordinater (5v5/7v7/9v9-formasjoner)
- Plan-logikk: port `buildHalf`, `computeBench`, `calculatePlayingTime` fra TS til Swift
- 5–10 nye tester på plan-logikken

**Uke 3–4: Core flows**
- Onboarding (3 skjermer)
- Matches-liste (live-banner, FAB, tab bar)
- Planner-mobil (bane fullskjerm, periode-velger, spilletid-rail)

**Uke 5–6: Live Match — kjerneverdien**
- LiveMatchScreen med TimerService (presis countdown, pause/resume)
- Bytte-kort UI med UT/INN-fargekoding
- Bekreft-bytte-flow med haptisk feedback
- Push-varsler 5/2/0 min før bytte

**Uke 7: Live Activity**
- ActivityKit setup
- Compact, expanded, lock screen layouts
- Update events fra hoved-appen til Live Activity
- Test på fysisk enhet (Dynamic Island krever iPhone 14 Pro+)

**Uke 8: Widgets**
- Home Screen S/M/L
- Lock Screen-komplikasjoner
- StandBy-mode
- Tap-targets som åpner Live Match-skjermen

**Uke 9: Apple Watch**
- WatchKit-app med samme bytte-kort
- Modular small + modular large komplikasjon
- Haptisk på håndleddet 5 min og 0 min før bytte
- Sync via WatchConnectivity

**Uke 10: Etterkamp + eksport**
- PostMatchScreen med spilletid-fasit
- PDF-eksport (gjenbruk av layout fra web-PDF; reimplementér i PDFKit)
- Apple share sheet

**Uke 11: Polish**
- Dynamic Type-støtte til AccessibilityXL
- VoiceOver: alle bytte-kort må annonseres
- Reduce Motion-håndtering
- Light + dark mode pixel-perfect
- App-ikon design (variant av "B"-merket)
- Launch screen

**Uke 12: TestFlight beta**
- 5–10 trenere fra Lillestrøm/Lyn/Skeid-miljøet
- Innsamling av feedback over to ukers spilte kamper
- Crash-rapporter via TestFlight

**Uke 13: App Store Submission**
- App Store Connect-oppsett: privacy nutrition labels, kategori "Sports", aldersgrense 4+
- 6 screenshots per device-type (iPhone 6.7", 6.1", iPad Pro)
- App preview-video (30 sek demo av Live Match-flyten)
- Beskrivelse på norsk og engelsk
- Review notes med innloggingsinfo og demo-flyt
- Submit. Forvent 1–3 dagers review.

**Uke 14+: Vedlikehold**
- Marketing: byttehjelp.no får App Store-badge på forsiden
- Sosiale medier: video av Live Activity i bruk
- App Store Optimization (ASO): "fotball, bytte, trener, barnefotball"

Total: ~13 uker (3 mnd) til App Store-submit.

---

## 5. App Store Connect-sjekkliste

### Konto og avtaler
- [x] Apple Developer Program (Bjarne har personlig konto)
- [x] Apple Team-ID: `2LDD6W7DC5` (samme som KronerKamp)
- [ ] Banking-info for evt. betalt-app eller IAP (gratis-app trenger ikke)
- [ ] Tax-info utfylt
- [ ] Personvernerklæring publisert på byttehjelp.no/personvern (kopier mal fra KronerKamp/`landing/personvern.html`)
- [ ] Support-side på byttehjelp.no/support

### App-opprettelse
- [ ] Bundle ID `no.bjarne.byttehjelpen` reservert på developer.apple.com (Identifiers → +)
- [ ] iCloud Container `iCloud.no.bjarne.byttehjelpen` opprettet
- [ ] App Group `group.no.bjarne.byttehjelpen` opprettet
- [ ] App Store Connect-record opprettet
- [ ] Kategori: **Sports** (primary), **Productivity** (secondary)
- [ ] Aldersgrense: 4+ (ingen problematisk innhold)
- [ ] Pris: **Gratis** (vurder Premium IAP i v2)

### Metadata
- [ ] Norsk og engelsk app-navn, undertittel, beskrivelse
- [ ] Søkeord (max 100 tegn): `fotball,bytte,trener,barnefotball,kampplan,nff`
- [ ] Promotional text (170 tegn): "Glanseable bytteoversikt for trenere på sidelinjen"
- [ ] Support-URL: byttehjelp.no/hjelp
- [ ] Marketing-URL: byttehjelp.no
- [ ] Copyright: "© 2026 Bjarne Bendixen"

### Screenshots (6 per device-størrelse)
1. Live Kamp (default) — hovedverdien
2. Live Activity i Dynamic Island — differensiator
3. Hjemskjerm-widget Medium — synes uten å åpne app
4. Apple Watch-skjerm — håndledds-fokuset
5. Planlegger med banekart — "også mulig å planlegge"
6. Etterkamp med spilletid-fasit — closing-the-loop

### App Privacy
- [ ] **Data Linked to You:** Ingen (alt lagres lokalt + CloudKit i brukerens iCloud)
- [ ] **Data Used to Track You:** Ingen
- [ ] **Tracking:** Nei
- [ ] Privacy nutrition label utfylt

### Review-notater
```
Test-konto: ikke nødvendig — appen krever ingen innlogging i v1.
Demo-flyt:
1. Åpne app, gå gjennom 3-stegs onboarding
2. Du får en demo-kamp "Lyn G09 Blå vs Skeid G09" forhåndsutfylt
3. Trykk på "LIVE NÅ"-banneret for å se Live Match-skjermen
4. Live Activity starter automatisk når kampen er aktiv
5. Trykk "Bekreft bytte" for å se bytte-flyten

Kontakt: bendixbjarne@gmail.com
```

### TestFlight-betatest
- [ ] Internal testers (5): Bjarne + nære venner
- [ ] External testers (50): trenerlag fra G09-/G07-/J11-årgangene
- [ ] Build-cycles: ny TestFlight-build hver uke i 4 uker
- [ ] Feedback-skjema (Google Form) for strukturert innsamling

---

## 6. Tekniske avgjørelser

### Persistens (samme som KronerKamp)
**v1:** SwiftData `@Model` + `ModelContainer` via App Group `group.no.bjarne.byttehjelpen`. CloudKit-config klar men deaktivert (eksakt KronerKamp-pattern).
**v1.2:** Aktiver CloudKit `.private(iCloud.no.bjarne.byttehjelpen)` når modellen er stabil. Sendable Snapshots holder allerede aktørgrenser rene.

### Timer-presisjon
`Timer.publish` i Combine kan drive med ~10ms over lange perioder. Bruk `mach_absolute_time` eller `Date.timeIntervalSince` for presisjon, og oppdater UI hver 200ms (5 ganger per sekund er nok for en MM:SS-display).

### Live Activity-oppdateringer
- Maks 4 KB payload per Activity-update
- Maks ~0.7 oppdateringer/sek på batteri
- Strategi: oppdater Live Activity hver 15. sekund, eller når en bytte bekreftes
- Bruk `ActivityUpdateContent.Builder` med `staleDate` for å la systemet auto-oppdatere

### Push for varsler
- Lokal `UNUserNotificationCenter` for 5/2/0-min varsler — krever ikke server
- Schedule alle varsler ved kamp-start, kanseller hvis bruker pause/avslutter
- Critical Alert-rettigheter? **Nei** — for hyppig avbrudd. Vanlig push med lyd er nok.

### Apple Watch
- Standalone Watch-app (kan kjøre uten iPhone på samme nett, så lenge timeren er satt)
- Synk gjennom WatchConnectivity ved kampstart
- Komplikasjoner via `ComplicationProvider` med timeline entries

### App-ikon
- "B"-merket fra brand på avrundet kvadrat-bakgrunn
- Hvit "B" på primary blå (#1e40af)
- Maskerer pent under "tinted" iOS 18-modus

---

## 7. Risiko og avbøtning

| Risiko | Sannsynlig | Avbøtning |
|--------|-----------|-----------|
| App Store-rejection pga manglende data deletion | Middels | Inkluder "Slett alle data" i Innstillinger fra v1 |
| Live Activity bruker for mye batteri | Lav | Begrens oppdateringer til 1 per 15s + ved hver bytte |
| iCloud-synk konflikt | Middels | Last-write-wins i v1, conflict UI i v2 |
| Trenere har ikke iPhone 14 Pro+ for Dynamic Island | Høy | App fungerer fullt på iPhone XS+; Dynamic Island er bare en "bonus" |
| iPad-trenere | Middels | Universal-app fra v1 (Universal target i Xcode), iPad-spesifikk layout i v1.2 |
| Localization-debt | Middels | Norsk bokmål first-class fra v1, engelsk som fallback. Strings i `Localizable.xcstrings` |
| Konkurrenter (Spond) lanserer lignende | Lav-Middels | Fokuser på rettferdig spilletid + Live Activity som vår USP |

---

## 8. Definisjon av ferdig

**v1.0 sendes til App Store når:**
- All MVP-funksjonalitet bygger og passerer manuelle tester på iPhone 13/14/15
- Live Activity testet på iPhone 14 Pro (Dynamic Island) og iPhone 13 (kun lock screen)
- Apple Watch-komplikasjon fungerer på fysisk Watch
- TestFlight-beta i to uker uten kritiske bugs
- App Privacy-skjema utfylt
- 6 screenshots × 3 device-størrelser produsert
- App preview-video lagret (30s)
- Privacy Policy og Terms publisert på byttehjelp.no
- Pre-submission App Store-validering passerer

---

## 9. Kostnader

| Element | Kostnad |
|---------|---------|
| Apple Developer Program | 990 kr/år |
| Tid (egen) | 13 uker, ~25 t/uke = ~325 timer |
| TestFlight | gratis |
| App Store hosting | gratis (apper er gratis å distribuere) |
| App-ikon-grafiker (valgfri) | 0–10 000 kr |
| Marketing-video (valgfri) | 0–15 000 kr (eller selvprodusert) |

Premium-modell etter v1 (ikke i scope nå): $2.99/mnd × 100 trenere = ~$300/mnd ≈ 3 200 kr/mnd. Apple tar 15% (Small Business Program første år, 30% deretter).

---

## 10. Hva Bjarne må gjøre nå

1. **Reserver bundle-ID** `no.bjarne.byttehjelpen` på developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → + (5 min jobb). Ikke via Vercel — Vercel håndterer kun web.
2. **Opprett iCloud Container** `iCloud.no.bjarne.byttehjelpen` samme sted (forberedelse for v1.2-synk).
3. **Opprett App Group** `group.no.bjarne.byttehjelpen` (kreves av widget-target fra dag én).
4. **Sett opp App Store Connect-record** — nytt App-record med bundle-ID over.
5. **Bootstrap `ios/`-folderen** — Claude kan scaffolde den med XcodeGen-mal, modeller, tokens og en kjørbar Live Match-skjerm. Ber jeg om dette når du er klar.
6. **TestFlight-pilotgruppe**: 5–10 trenere fra G09/G07/J11-årgangene du kjenner.
