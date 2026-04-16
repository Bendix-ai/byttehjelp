# SWOT-analyse — Byttehjelp

Gjennomført: 2026-04-16

## Styrker

- **Domenemodell tilpasset barnefotball**: Perioder, bytteintervall, keeperlås, tre formater (5v5/7v7/9v9) med NFF-standarder. Egendefinerte formasjoner med frie posisjonsnavn.
- **Sanntids kampmodus**: Wake-lock, vibrasjon/lyd/notifikasjonsalarmer ved byttegrenser. 250ms polling gir presis nedtelling. Demo-fart (1×/10×/60×) for testing.
- **Draft-system**: Navngitte varianter av kampplan. Kopier, rediger, sammenlign. Frysing ved kamp-start bevarer planen mens drafts forblir redigerbare for fremtidige kamper.
- **Drag & drop**: @dnd-kit med PointerSensor-terskel (8px) skiller klikk fra dra. Benk ↔ bane, swap mellom posisjoner. Visuell feedback (ring, skygge, opacity).
- **Null avhengigheter for eksport**: `window.print()` + `navigator.clipboard`. Ingen serverside.
- **Migrasjonsstrategi**: v1→v2 localStorage-migrasjon bevarer eksisterende data ved modellendringer.
- **Ren arkitektur**: Reducer-basert state, separate screens/components/utils. Ingen prematur abstraksjon.
- **Forward-propagation**: Tilordning i periode N fyller automatisk periode N+1..siste (med override-bevaring). Intuitiv UX for trenere.

## Svakheter

- **Ingen feilhåndtering**: `AppContext.tsx` svelger exceptions stille. localStorage-feil → stille datatap. Ingen error boundary i React-treet.
- **Kun ett lag**: `state.teams[0]` hardkodet i `AppShell.tsx`. Ingen lagbytte for trenere med flere team.
- **localStorage-skaleringsgrense**: ~5MB. En sesong med 52 kamper × 4 perioder × 7 posisjoner × 2 omganger kan nå grensen. Ingen kvote-varsling eller arkivering.
- **Tilgjengelighet (a11y)**: Mangler ARIA-labels, keyboard-navigasjon, fargeblind-indikatorer. Rød/grønn fargekoding uten tilleggssymboler.
- **Store enkeltfiler**: PlannerScreen.tsx (700+ linjer), MatchesScreen.tsx (430+ linjer). Bør splittes for vedlikeholdbarhet.
- **Ingen undo/redo**: Feilaktige endringer i draft kan ikke angres. Ingen versjonshistorikk per draft.
- **Mobil-layout**: Sidebar 224px fast bredde. Ikke responsivt under 640px. Grid-basert planlegger bryter på smale skjermer.
- **CSS-inkonsistens**: Blanding av inline hex (`bg-[#D9EAD3]`) og CSS-variabler (`var(--color-sub-in)`). Ikke fullt konsolidert.

## Muligheter

- **Cloud-sync (Supabase/Firebase)**: Backup, multi-enhet, multi-trener. Offline-first med CRDT-sync.
- **Foreldre-portal**: QR-kode → read-only kampvisning. Se barnets spilletid live. Push-notifikasjoner ved bytter.
- **Sesong-analyse**: Spilletids-rettferdighet over tid. «Denne spilleren har aldri startet i 1. omgang». Heatmaps per spiller.
- **fotball.no iCal-import**: Endepunkt fungerer (`/footballapi/Calendar/GetCalendar?tournamentId={fiksId}`). Kan automatisere terminliste.
- **Native iOS-app**: Swift med Live Activities / Dynamic Island. Widgeten viser «Neste bytte om 2:34 — Alice ut, Bob inn». Planlegger forblir web.
- **Multi-kamp-simulering**: «Hva om 3 bytter/periode i stedet for 4?» Preview spilletids-fordeling før commit.
- **Stemme-input**: «Bytt ut Alice på høyre back» under live kamp. Nyttig for trenere med hendene fulle.
- **Export-integrasjoner**: Google Sheets, Apple Calendar, WhatsApp-maler for lagoppstilling.
- **Formasjons-marketplace**: Del egendefinerte formasjoner med andre trenere. Tags: aldersgruppe, spillestil.

## Trusler

- **Datatap**: localStorage uten backup. Nettleser-opprydding, privat surfing (iOS Safari), eller kvoteoverskridelse → tapt sesong. Kritisk risiko.
- **GDPR/personvern**: Barns navn lagret ukryptert i nettleser. Hvis enhet stjeles/deles → eksponering. Barnefotball krever ekstra aktsomhet.
- **PWA-fragmentering**: Chrome PWA fungerer godt. Safari iOS: begrenset push, ingen bakgrunnssynk, wipe ved lav lagring. Android varierer per produsent.
- **Avhengighetsrisiko**: TypeScript 6.0, Vite 8, dnd-kit 0.x, Tailwind 4.2 — alle cutting-edge. Én breaking change kan stoppe deploy.
- **Timer-presisjon**: `toFixed(1)`-avrunding i periodegrenser (plan.ts:7) kan gi 0.1 min offset. Ved rask demo-fart (60×) kan grensen hoppes over mellom ticks.
- **UX-kompleksitet**: 4-stegs onboarding + mange samtidige beslutninger (intervall, lengde, keeperlås, formasjon, spillervalg, drafts). Risiko for «trener-burnout» ved førstegangsbruk.
- **Ingen tester**: Null enhetstester, integrasjonstester, eller E2E. Regresjoner fanges kun ved manuell testing.
