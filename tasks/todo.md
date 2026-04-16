# Byttehjelp — Prioritert plan

Sist oppdatert: 2026-04-16

## Kort sikt (denne + neste okt)

### 1. Deploy til Vercel for brukertesting
- [ ] Push siste endringer til GitHub
- [ ] `npx vercel` — koble repo, deploy
- [ ] Verifiser PWA-install pa mobil via Vercel-URL
- [ ] Del URL med 2-3 trenere for feedback

### 2. Responsivt mobil-layout
- [ ] Sidebar kollapser til hamburger-meny under 768px
- [ ] PlannerScreen: perioder og tabell scroller horisontalt pa mobil
- [ ] MatchTimerScreen: allerede OK, verifiser med ekte telefon

### 3. Feilhandtering og dataintegritet
- [ ] Error boundary rundt AppProvider — vis "Noe gikk galt" ved krasj
- [ ] localStorage kvote-sjekk for lagring (warn ved >4MB)
- [ ] Eksport/import JSON-backup av all data (Innstillinger-side)
- [ ] Validering ved lasting: rydd opp korrupt data stille

### 4. UX-polish fra brukertesting
- [ ] Verifiser PDF-fargekoder (print-color-adjust) med faktisk utskrift
- [ ] Toast-varsler ved draft-kopiering, sletting, lagring
- [ ] Inline bekreftelsesdialoger (erstatt window.confirm)
- [ ] Keyboard Enter-support i alle tekstfelt

## Middels sikt (2-4 uker)

### 5. Backend-fundament (Supabase)
- [ ] Opprett Supabase-prosjekt med tabeller: teams, players, matches, drafts
- [ ] Row Level Security: hver trener ser kun egne data
- [ ] Auth: Magic link (e-post) — ingen passord
- [ ] Sync-strategi: localStorage = offline-cache, Supabase = master
  - Ved online: push lokale endringer, pull siste
  - Ved offline: jobb lokalt, sync nar tilbake
  - Konfliktlosning: siste endring vinner (per-felt)
- [ ] Migrer AppContext til dual-write (localStorage + Supabase)

### 6. Multi-lag-stotte
- [ ] Fjern `state.teams[0]` hardkoding i AppShell.tsx
- [ ] Lagbytte-dropdown i sidebar
- [ ] Kamper filtreres per valgt lag

### 7. Undo/redo i planlegger
- [ ] Undostack per draft (maks 20 steg)
- [ ] Cmd+Z / Ctrl+Z keyboard shortcut
- [ ] Angre-knapp i toolbar

### 8. fotball.no kalender-import
- [ ] .ics fil-upload → parse VEVENT → opprett kamper
- [ ] Senere: Vercel Edge Function proxy for direkte fetch

## Teknisk gjeld (gar parallelt)

### 9. Splitt store filer
- [ ] PlannerScreen.tsx (703 linjer) → PlannerToolbar, PlannerSettings, DraftManager
- [ ] MatchesScreen.tsx (436 linjer) → MatchList, MatchCreateDialog, MatchCard
- [ ] Maks ~200 linjer per komponent

### 10. CSS-konsolidering
- [ ] Erstatt alle inline hex (`bg-[#D9EAD3]`) med CSS-variabler (`bg-sub-in`)
- [ ] Sikre at alle farger bruker theme-tokens fra index.css

### 11. Testing
- [ ] Vitest + React Testing Library for utils (substitution, plan, pitch)
- [ ] Komponenttester for PlayerPicker, PeriodTable
- [ ] E2E: Playwright for kritisk flyt (opprett lag → planlegg → start kamp)

### 12. TypeScript-strenghet
- [ ] Fjern alle `as` type assertions der mulig
- [ ] Strikt null-sjekker i handleAssignPlayer

## Avhengighetsrekkefolge

```
1. Deploy (avblokkerer brukertesting)
   |
   v
2. Responsivt layout (avblokkerer mobiltesting)
   |
   v
3. Feilhandtering + 4. UX-polish (feedback-drevet)
   |
   v
5. Supabase backend (avblokkerer multi-enhet + deling)
   |
   v
6. Multi-lag + 7. Undo (avhenger av backend for sync)
```

Teknisk gjeld (9-12) kjores parallelt uavhengig av feature-arbeid.
