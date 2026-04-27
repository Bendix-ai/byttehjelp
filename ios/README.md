# Byttehjelpen iOS

Native iPhone-app for sidelinje-execution. Web-appen (`byttehjelp.no`) eier planlegging og PDF-eksport. iOS-appen eier on-field gjennomføring med Live Activity, widgets og Apple Watch (kommer i v1.1).

Patterns og infrastruktur er gjenbrukt fra `~/Claude/Utviklingsprosjekter/KronerKamp/ios` (Mynt-appen).

## Forutsetninger

- macOS med Xcode 26+ (testet med 26.4.1)
- [XcodeGen](https://github.com/yonaskolb/XcodeGen) — `brew install xcodegen`
- Swift 6.0+ (følger med Xcode 26)
- Apple Developer-konto + Team-ID `2LDD6W7DC5`

## Første oppsett

```bash
cd ios

# Generer .xcodeproj fra project.yml (filen er gitignored)
xcodegen generate

# Kjør Swift Package-tester
cd ByttehjelpenKit
swift test  # forventer 12/12 grønne

# Bygg appen for simulator
cd ..
xcodebuild -project Byttehjelpen.xcodeproj \
  -scheme Byttehjelpen \
  -destination 'platform=iOS Simulator,name=iPhone 16e,OS=26.2' \
  -configuration Debug build

# Eller åpne i Xcode
open Byttehjelpen.xcodeproj
```

## Mappestruktur

```
ios/
├── project.yml              # XcodeGen-konfig (kilde — .xcodeproj genereres herfra)
├── ByttehjelpenKit/         # Swift Package, delt mellom App og Widget
│   ├── Package.swift
│   └── Sources/ByttehjelpenKit/
│       ├── ByttehjelpenKit.swift   # BHInfo: bundle/group/iCloud-IDer
│       ├── Theme/                  # BHColors, BHFonts (port fra tokens.jsx)
│       ├── Models/                 # @Model + Codable structs
│       ├── PlanLogic/              # Formations, Pitch, PlanBuilder (port fra TS)
│       ├── Persistence/            # ByttehjelpenStore (SwiftData container)
│       ├── Widget/                 # WidgetSnapshot + WidgetStore (App Group)
│       ├── LiveActivity/           # ByttehjelpenActivityAttributes
│       └── Seed/                   # SeedData (Lyn G09 demo)
├── App/                     # iPhone-app target
│   ├── ByttehjelpenApp.swift
│   ├── Info.plist
│   ├── Byttehjelpen.entitlements   # iCloud + App Group
│   ├── Resources/Assets.xcassets/
│   └── Features/
│       ├── Root/RootView.swift
│       └── LiveMatch/              # Hovedflyten — countdown + bytter
└── Widget/                  # widget-extension target
    ├── ByttehjelpenWidgetBundle.swift
    └── LiveCountdownWidget.swift
```

## Bundle-IDs og container-IDer

| Element | Identifier |
|---------|-----------|
| App | `no.bjarne.byttehjelpen` |
| Widget | `no.bjarne.byttehjelpen.widget` |
| App Group | `group.no.bjarne.byttehjelpen` |
| iCloud Container | `iCloud.no.bjarne.byttehjelpen` |
| Apple Team-ID | `2LDD6W7DC5` |

Disse må reserveres på developer.apple.com før første enhets-bygg.

## Designsystem

Farger og typografi speiler webappen og er definert i `BHColors.swift` og `BHFonts.swift`. Endringer her må reflekteres i `src/index.css` (web).
