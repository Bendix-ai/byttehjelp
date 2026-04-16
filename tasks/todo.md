# Byttehjelp — Gjenstående TODO

Sist oppdatert: 2026-04-16

## Kort sikt (neste økt)

- [ ] **Fotball.no iCal-import** — iCal-endepunkt funnet (`/footballapi/Calendar/GetCalendar?tournamentId={fiksId}`). Implementer manuell .ics fil-upload → parser VEVENT → opprett Match-objekter. CORS blokkerer direkte fetch; manuell fil er MVP.
- [ ] **Verifiser PDF-fargekoder** — Fix pushet (print-color-adjust: exact), trenger brukertest.
- [ ] **Feilhåndtering** — localStorage kan feile stille. Legg til: kvote-varsling, error boundary rundt AppProvider, fallback-melding ved korrupt data.

## Middels sikt

- [ ] **Multi-lag-støtte** — Fjern `state.teams[0]`-hardkoding. Legg til lagbytte i sidebar.
- [ ] **Undo/redo i planlegger** — Ingen måte å angre feilaktige tilordninger i draft.
- [ ] **Responsivt mobil-layout** — Sidebar 224px fast. Kollapser til hamburger-meny under 640px.
- [ ] **Toast-varsler** — Bekreftelse ved draft-kopiering, sletting, navnendring.
- [ ] **Halvtids-overgangs-UI** — Visuell overgang mellom 1. og 2. omgang i kamp-timer.
- [ ] **Keyboard-tilgjengelighet** — dnd-kit KeyboardSensor, ARIA-labels, semantisk HTML.
- [ ] **fotball.no proxy** — Vercel Edge Function / Cloudflare Worker for direkte iCal-fetch uten manuell fil.

## Lang sikt (native app + backend)

- [ ] **Cloud-sync** — Supabase/Firebase for backup, multi-enhet, multi-trener.
- [ ] **iOS native app** — Swift, Live Activities / Dynamic Island for sanntids bytteinfo.
- [ ] **Sesong-analyse** — Spilletids-rettferdighet over hele sesongen. Heatmaps.
- [ ] **Foreldre-portal** — QR-kode → read-only kampvisning med barnets spilletid live.
- [ ] **Smart forslag** — Foreslå startoppstilling basert på historikk. Identifiser ujevn fordeling.
- [ ] **Spillerpar-analyse** — Hvem fungerer godt sammen i posisjon.

## Sikkerhet/compliance

- [ ] **Krypter spillerdata** i localStorage (barns navn).
- [ ] **GDPR-samtykke** — Informer om datalagringstype, gi mulighet for sletting.
- [ ] **Eksport/slett all data** — Bruker kan laste ned alt som JSON og slette lokalt.

## Design-polish (kan gjøres når som helst)

- [ ] Fjern PlanningView.tsx referanser fra MatchList.tsx (allerede slettet, verifiser import-rester)
- [ ] Konsolider fargekoding: noen steder bruker inline hex, andre CSS-variabler
- [ ] Splitt PlannerScreen.tsx (700+ linjer) i mindre moduler
- [ ] Splitt MatchesScreen.tsx (430+ linjer)

## Lessons learned

- `window.prompt` er blokkert i mange nettlesere — bruk alltid inline-dialog.
- Mobil Safari: `autoFocus` kan skjule knapper bak tastatur — bruk `enterKeyHint` + `<form>` submit.
- Forward-propagation (byttetilordning → neste perioder) gir intuitiv UX men krever "preserve manual override"-logikk.
- `print-color-adjust: exact` er nødvendig for at bakgrunnsfarger vises i PDF.
