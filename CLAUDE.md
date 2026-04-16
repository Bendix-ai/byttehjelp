# CLAUDE.md — Byttehjelp

## Hva er dette
Bytteplanlegger for norsk barnefotball (5v5, 7v7, 9v9). React + Vite + TypeScript + Tailwind 4. Webappen lar trenere planlegge bytter, kjøre live kamp-timer med varsler, og dele kampplan som PDF.

## Nåværende status (v3, april 2026)
Kjernefunksjonalitet ferdig: sidebar-nav, banekart med drag & drop, draft-system, kamp-timer med bytte-panel, eksport/del. Se `tasks/todo.md` for gjenstående arbeid og `docs/SWOT.md` for fullstendig analyse.

## Arkitektur

### Screens (src/screens/)
- `AppShell.tsx` — Wrapper med sidebar-nav og seksjon-routing
- `OnboardingScreen.tsx` — Opprett lag (steg 1) + Legg til spillere (steg 2)
- `MatchesScreen.tsx` — Kampoversikt (liste + kalender), CRUD
- `PlannerScreen.tsx` — Kampplanlegger: banekart, drafts, perioder, drag & drop
- `MatchTimerScreen.tsx` — Live kamp-timer med bytte-varsler

### Komponenter (src/components/)
- `FieldPitch.tsx` — SVG-bane med posisjonerte spillerkort (@dnd-kit draggable/droppable)
- `PeriodTable.tsx` — Periodetabell (alle perioder × posisjoner)
- `PlayingTimeRail.tsx` — Spilletids-estimat med bars og flagg
- `PlayerPicker.tsx` — Modal for å velge spiller til posisjon (med søk)
- `MatchPlayerSelector.tsx` — Multi-select for spillere i draft/kamp
- `MatchPrintView.tsx` — Print-optimert visning + tekstoppsummering-generator
- `Sidebar.tsx` — Venstre-nav med steg-indikatorer

### State (src/store/)
- `AppContext.tsx` — useReducer + localStorage med 100ms debounce. Versjonert migrasjon (v1→v2).

### Datamodell (src/types/index.ts)
- `Team` → `Player[]` (med valgfrie `roles`)
- `Match` → `Draft[]` (hver med `halves[Half, Half]` → `Period[]`)
- `Draft` = navngitt variant av kampplan (spillerutvalg, perioder, formasjon)
- `Match.livePlan` = frosset snapshot av aktiv draft ved kamp-start

### Utilities (src/utils/)
- `plan.ts` — buildHalf, computeBench, recomputeAllBenches, copyForward
- `pitch.ts` — layoutPositions (formasjon → SVG-koordinater)
- `substitution.ts` — getSubstitutionDiff, calculatePlayingTime

### Formasjoner (src/constants/formations.ts)
Én standard per format: 2-2 (5v5), 2-3-1 (7v7), 3-3-2 (9v9). Brukere kan lage egendefinerte.

## Viktige mønstre

### Forward-propagation
Når en spiller tildeles en posisjon i periode N, propagerer tilordningen til perioder N+1..siste (med mindre manuelt overstyrt). Samme logikk som keeper-lås, men for alle posisjoner.

### Draft-frysing
Ved kamp-start snapshotter MatchTimerScreen aktiv draft som `match.livePlan`. Planlegger blir read-only. Kan tilbakestilles via "Tilbakestill til planlegger"-knapp.

### Benk-filter i PlayerPicker
Spillere som var på banen i forrige periode men er på benken nå ("going out") filtreres bort fra benk-listen i velgeren — hindrer forvirrende flip-flop.

## Kommandoer
- `npm run dev -- --host` — Dev-server tilgjengelig på LAN (for mobiltesting)
- `npx tsc --noEmit` — Typecheck
- `npm run build` — Produksjonsbygg

## Langsiktig retning
Web = planlegger (flaggskip). Native iOS-app = kampgjennomføring med Live Activities/widgets. Se `docs/SWOT.md` for fullstendig analyse.
