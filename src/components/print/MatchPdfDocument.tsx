import { Document, Page, View, Text, StyleSheet, Svg, Rect, Circle, Line, G, Defs, LinearGradient, Stop } from '@react-pdf/renderer';
import type { Draft, Formation, Match, Team } from '../../types';
import { layoutPositions } from '../../utils/pitch';

interface Props {
  team: Team;
  match: Match;
  draft: Draft;
  formation: Formation;
  playerMap: Map<string, string>;
  generatedAt?: Date;
}

const COLOR = {
  primary: '#1e40af',
  primaryLight: '#3b82f6',
  primarySoft: '#e8edff',
  keeper: '#fde68a',
  keeperInk: '#92400e',
  subIn: '#d9ead3',
  subInInk: '#1f6b32',
  subOut: '#f4cccc',
  subOutInk: '#8a1f1f',
  surface: '#f7f8fa',
  ink: '#0f172a',
  ink2: '#334155',
  ink3: '#64748b',
  line: '#e2e8f0',
  lineSoft: '#eef2f7',
  pitchTop: '#16a34a',
  pitchBottom: '#15803d',
  white: '#ffffff',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate900: '#0f172a',
} as const;

const POSITION_ABBREV: Record<string, string> = {
  'Keeper': 'KP',
  'V. forsvar': 'VF',
  'H. forsvar': 'HF',
  'V. back': 'VB',
  'Midtstopper': 'MS',
  'H. back': 'HB',
  'V. midtbane': 'VM',
  'S. midtbane': 'SM',
  'Midtbane': 'MB',
  'H. midtbane': 'HM',
  'V. angrep': 'VA',
  'H. angrep': 'HA',
  'Spiss': 'SP',
};

function abbreviatePosition(name: string): string {
  if (POSITION_ABBREV[name]) return POSITION_ABBREV[name];
  const cleaned = name.replace(/\./g, ' ').trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return parts.map(p => p[0]).join('').slice(0, 3).toUpperCase();
}

function formatDate(iso: string): { long: string; weekday: string } {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { long: iso, weekday: '' };
  const long = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  const weekday = new Intl.DateTimeFormat('nb-NO', { weekday: 'long' }).format(d);
  return { long, weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1) };
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

function minutesFor(draft: Draft, pid: string): number {
  let total = 0;
  for (const half of draft.halves) {
    for (const period of half.periods) {
      if (Object.values(period.positions).includes(pid)) {
        total += period.endMinute - period.startMinute;
      }
    }
  }
  return total;
}

function totalMatchMinutes(draft: Draft): number {
  return draft.halves.reduce((sum, h) => sum + h.durationMinutes, 0);
}

function jerseyNumber(team: Team, playerId: string): string {
  const idx = team.players.findIndex(p => p.id === playerId);
  return idx >= 0 ? String(idx + 1) : '?';
}

function roleLabel(roles: string[] | undefined): string {
  if (!roles || roles.length === 0) return 'Utespiller';
  const map: Record<string, string> = {
    keeper: 'Keeper',
    forsvar: 'Forsvar',
    midtbane: 'Midtbane',
    angrep: 'Angrep',
  };
  return roles.map(r => map[r] ?? r).join('/');
}

function isKeeperPosition(positionName: string): boolean {
  return positionName.toLowerCase().startsWith('keeper');
}

function periodAssignment(draft: Draft, pid: string, halfIdx: number, periodIdx: number, formation: Formation): string | null {
  const period = draft.halves[halfIdx]?.periods[periodIdx];
  if (!period) return null;
  for (const pos of formation.positions) {
    if (period.positions[pos] === pid) return pos;
  }
  return null;
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLOR.white,
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: COLOR.ink,
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.line,
  },
  brandLeft: { flexDirection: 'row', alignItems: 'center' },
  brandLogo: {
    width: 18,
    height: 18,
    backgroundColor: COLOR.primary,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  brandLogoText: {
    color: COLOR.white,
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  brandWord: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 10,
    color: COLOR.slate900,
  },
  brandSep: { color: '#cbd5e1', marginHorizontal: 5, fontSize: 9 },
  brandSection: { color: COLOR.slate500, fontSize: 9, fontFamily: 'Helvetica' },
  brandRight: { color: COLOR.slate400, fontSize: 8 },

  eyebrow: {
    color: COLOR.primary,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 28,
    color: COLOR.slate900,
    lineHeight: 1.05,
    marginTop: 6,
  },
  titleSep: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 20,
    color: COLOR.slate400,
    marginVertical: 1,
  },

  metaBand: {
    flexDirection: 'row',
    marginTop: 18,
    borderWidth: 1,
    borderColor: COLOR.line,
    borderRadius: 8,
    backgroundColor: COLOR.surface,
    overflow: 'hidden',
  },
  metaCell: { flex: 1, padding: 10, borderRightWidth: 1, borderRightColor: COLOR.line },
  metaCellLast: { flex: 1, padding: 10 },
  metaLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: COLOR.slate500,
  },
  metaValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: COLOR.slate900,
    marginTop: 3,
  },
  metaSub: { fontSize: 8, color: COLOR.slate500, marginTop: 1 },

  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 18,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: COLOR.slate700,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  sectionHint: { fontSize: 8, color: COLOR.slate500 },

  squadGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -2 },
  squadCard: {
    width: '25%',
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  squadCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLOR.line,
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 6,
    backgroundColor: COLOR.white,
    minHeight: 28,
  },
  jerseyDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  jerseyDotKeeper: { backgroundColor: COLOR.keeper },
  jerseyDotField: { backgroundColor: COLOR.primarySoft },
  jerseyText: { fontFamily: 'Helvetica-Bold', fontSize: 8 },
  jerseyTextKeeper: { color: COLOR.keeperInk },
  jerseyTextField: { color: COLOR.primary },
  squadName: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: COLOR.slate900 },
  squadRole: { fontSize: 7, color: COLOR.slate500, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },

  // Period cards (banekart grid)
  periodGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  periodCard: { width: '50%', paddingHorizontal: 3, marginBottom: 6 },
  periodCardInner: {
    borderWidth: 1,
    borderColor: COLOR.line,
    borderRadius: 8,
    overflow: 'hidden',
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: COLOR.white,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.line,
  },
  periodLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: COLOR.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  periodTime: { fontSize: 7, color: COLOR.slate500, marginTop: 1 },
  periodChip: {
    backgroundColor: COLOR.slate100,
    color: COLOR.slate700,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    borderRadius: 3,
  },
  pitchWrap: { backgroundColor: COLOR.surface, padding: 6 },
  benchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 5,
    gap: 4,
  },
  benchLabel: {
    backgroundColor: COLOR.subOut,
    color: COLOR.subOutInk,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  benchText: { fontSize: 8, color: COLOR.slate700, flex: 1 },

  pageFooter: {
    marginTop: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLOR.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: COLOR.slate400,
  },

  // Page 2
  page2Title: { fontFamily: 'Helvetica-Bold', fontSize: 22, color: COLOR.slate900, marginTop: 4 },

  // Position grid table
  table: {
    borderWidth: 1,
    borderColor: COLOR.line,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
  },
  thead: {
    flexDirection: 'row',
    backgroundColor: COLOR.slate50,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.line,
  },
  th: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: COLOR.slate600,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  thPlayer: { textAlign: 'left', paddingLeft: 10 },
  thMin: { textAlign: 'right', paddingRight: 10 },
  thSub: { fontSize: 6.5, color: COLOR.slate400, fontFamily: 'Helvetica', textTransform: 'lowercase', letterSpacing: 0, marginTop: 1, textAlign: 'center' },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR.lineSoft,
  },
  td: {
    paddingVertical: 4,
    paddingHorizontal: 3,
    fontSize: 9,
    color: COLOR.ink,
    justifyContent: 'center',
  },
  tdPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
  },
  tdJersey: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  tdJerseyText: { fontFamily: 'Helvetica-Bold', fontSize: 7 },
  tdName: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: COLOR.slate900 },
  tdMin: { textAlign: 'right', paddingRight: 10, fontFamily: 'Helvetica-Bold', fontSize: 9 },
  tdCellWrap: { padding: 2, alignItems: 'stretch' },
  tdCell: {
    paddingVertical: 4,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tdCellPos: { backgroundColor: COLOR.slate50 },
  tdCellPosText: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: COLOR.ink2, letterSpacing: 0.5 },
  tdCellKeeper: { backgroundColor: COLOR.keeper },
  tdCellKeeperText: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: COLOR.keeperInk, letterSpacing: 0.5 },
  tdCellSubIn: { backgroundColor: COLOR.subIn },
  tdCellSubInText: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: COLOR.subInInk, letterSpacing: 0.5 },
  tdCellSubOut: { backgroundColor: COLOR.subOut },
  tdCellSubOutText: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: COLOR.subOutInk, letterSpacing: 0.5 },
  tdCellBench: { backgroundColor: COLOR.white, borderWidth: 0.5, borderColor: COLOR.line },
  tdCellBenchText: { fontSize: 9, color: '#cbd5e1' },
  tfoot: {
    flexDirection: 'row',
    backgroundColor: COLOR.slate50,
    borderTopWidth: 1,
    borderTopColor: COLOR.line,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tfootLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: COLOR.slate500,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginRight: 10,
  },
  tfootText: { fontSize: 8, color: COLOR.slate600, flex: 1 },

  // Playing time bars
  ptList: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  ptItem: { width: '50%', flexDirection: 'row', alignItems: 'center', paddingRight: 12, marginBottom: 5 },
  ptDot: {
    width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 6,
  },
  ptName: { width: 86, fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLOR.slate900 },
  ptBarTrack: { flex: 1, height: 5, backgroundColor: COLOR.lineSoft, borderRadius: 3, overflow: 'hidden', marginHorizontal: 6 },
  ptBarFill: { height: 5, backgroundColor: COLOR.primary, borderRadius: 3 },
  ptBarFillKeeper: { height: 5, backgroundColor: '#d97706', borderRadius: 3 },
  ptMin: { width: 38, textAlign: 'right', fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLOR.slate900 },
  ptPct: { width: 28, textAlign: 'right', fontSize: 7, color: COLOR.slate500 },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    marginTop: 14,
    borderWidth: 1,
    borderColor: COLOR.line,
    borderRadius: 8,
    backgroundColor: COLOR.surface,
    overflow: 'hidden',
  },
  statsCell: { flex: 1, padding: 10, borderRightWidth: 1, borderRightColor: COLOR.line },
  statsCellLast: { flex: 1, padding: 10 },
  statsLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: COLOR.slate500,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  statsValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    color: COLOR.slate900,
    marginTop: 3,
  },
  statsUnit: { fontSize: 9, fontFamily: 'Helvetica', color: COLOR.slate500 },

  // Coach card row
  coachRow: { flexDirection: 'row', marginTop: 18, gap: 8 },
  coachCard: {
    flex: 2,
    borderWidth: 1,
    borderColor: COLOR.line,
    borderRadius: 8,
    backgroundColor: COLOR.white,
    padding: 10,
  },
  shareCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLOR.line,
    borderRadius: 8,
    backgroundColor: COLOR.primarySoft,
    padding: 10,
  },
  coachName: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: COLOR.slate900, marginTop: 2 },
  coachRole: { fontSize: 8, color: COLOR.slate500 },
  coachMessage: { fontSize: 9, color: COLOR.slate700, lineHeight: 1.4, marginTop: 6 },
  shareTitle: { fontFamily: 'Helvetica-Bold', fontSize: 7, color: COLOR.primary, letterSpacing: 1, textTransform: 'uppercase' },
  shareText: { fontSize: 8, color: COLOR.slate700, marginTop: 4, lineHeight: 1.5 },
  shareUrl: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: COLOR.primary, marginTop: 6 },
});

// Pitch SVG with positions for given period
function PitchSvg({
  formation,
  period,
  team,
}: {
  formation: Formation;
  period: { positions: Record<string, string> };
  team: Team;
}) {
  const layout = layoutPositions(formation);
  const VB_W = 200;
  const VB_H = 260;
  const PAD = 10;

  // Map logical (0-100, 0-110) to viewBox (PAD..VB_W-PAD, PAD..VB_H-PAD)
  const mapX = (x: number) => PAD + (x / 100) * (VB_W - 2 * PAD);
  const mapY = (y: number) => PAD + (y / 110) * (VB_H - 2 * PAD);

  return (
    <Svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: '100%', height: 130 }}>
      <Defs>
        <LinearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={COLOR.pitchTop} />
          <Stop offset="100%" stopColor={COLOR.pitchBottom} />
        </LinearGradient>
      </Defs>
      {/* Pitch background */}
      <Rect x={2} y={2} width={VB_W - 4} height={VB_H - 4} rx={5} ry={5} fill="url(#pitchGrad)" />
      {/* Pitch markings */}
      <G stroke={COLOR.white} strokeOpacity={0.55} strokeWidth={1.2} fill="none">
        <Rect x={PAD} y={PAD} width={VB_W - 2 * PAD} height={VB_H - 2 * PAD} />
        <Line x1={PAD} y1={VB_H / 2} x2={VB_W - PAD} y2={VB_H / 2} />
        <Circle cx={VB_W / 2} cy={VB_H / 2} r={20} />
        {/* Top penalty box */}
        <Rect x={50} y={PAD} width={100} height={26} />
        <Rect x={74} y={PAD} width={52} height={9} />
        {/* Bottom penalty box */}
        <Rect x={50} y={VB_H - PAD - 26} width={100} height={26} />
        <Rect x={74} y={VB_H - PAD - 9} width={52} height={9} />
      </G>
      <Circle cx={VB_W / 2} cy={VB_H / 2} r={1.3} fill={COLOR.white} />

      {/* Players */}
      {formation.positions.map(pos => {
        const pid = period.positions[pos];
        const coord = layout[pos];
        if (!coord) return null;
        const cx = mapX(coord.x);
        const cy = mapY(coord.y);
        const isKeeper = isKeeperPosition(pos);
        const num = pid ? jerseyNumber(team, pid) : '';
        const fill = COLOR.white;
        const stroke = isKeeper ? COLOR.keeperInk : COLOR.primary;
        const textFill = isKeeper ? COLOR.keeperInk : COLOR.primary;
        const bg = isKeeper ? COLOR.keeper : COLOR.white;
        return (
          <G key={pos}>
            <Circle cx={cx} cy={cy} r={9.5} fill={isKeeper ? bg : fill} stroke={stroke} strokeWidth={1.4} />
            {num && (
              <Text
                x={cx}
                y={cy + 3}
                textAnchor="middle"
                fill={textFill}
                style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold' }}
              >
                {num}
              </Text>
            )}
          </G>
        );
      })}
    </Svg>
  );
}

function BrandStrip({ section, page, totalPages, generated }: { section: string; page: number; totalPages: number; generated: string }) {
  return (
    <View style={styles.brandRow}>
      <View style={styles.brandLeft}>
        <View style={styles.brandLogo}>
          <Text style={styles.brandLogoText}>B</Text>
        </View>
        <Text style={styles.brandWord}>Byttehjelp</Text>
        <Text style={styles.brandSep}>·</Text>
        <Text style={styles.brandSection}>{section}</Text>
      </View>
      <Text style={styles.brandRight}>Side {page} av {totalPages} · Generert {generated}</Text>
    </View>
  );
}

function PageFooter({ team, match, page, totalPages }: { team: Team; match: Match; page: number; totalPages: number }) {
  return (
    <View style={styles.pageFooter} fixed>
      <Text>byttehjelp.no · Trygg bytteplan for barnefotball</Text>
      <Text>{team.name} · {formatShortDate(match.date)} · Side {page}/{totalPages}</Text>
    </View>
  );
}

export function MatchPdfDocument({ team, match, draft, formation, playerMap, generatedAt }: Props) {
  const generated = formatShortDate((generatedAt ?? new Date()).toISOString().slice(0, 10));
  const dateInfo = formatDate(match.date);
  const totalMin = totalMatchMinutes(draft);
  const allPeriods: Array<{ halfIdx: number; periodIdx: number; period: typeof draft.halves[0]['periods'][0] }> = [];
  draft.halves.forEach((h, hi) => h.periods.forEach((p, pi) => allPeriods.push({ halfIdx: hi, periodIdx: pi, period: p })));

  // Compute substitution counts (for chip on each period header)
  function substitutionsCount(halfIdx: number, periodIdx: number): number {
    if (halfIdx === 0 && periodIdx === 0) return 0;
    const period = draft.halves[halfIdx].periods[periodIdx];
    let prevPeriod;
    if (periodIdx > 0) {
      prevPeriod = draft.halves[halfIdx].periods[periodIdx - 1];
    } else {
      const prevHalf = draft.halves[halfIdx - 1];
      prevPeriod = prevHalf?.periods[prevHalf.periods.length - 1];
    }
    if (!prevPeriod) return 0;
    let subs = 0;
    for (const pos of formation.positions) {
      const cur = period.positions[pos];
      const prev = prevPeriod.positions[pos];
      if (cur && prev && cur !== prev) subs += 1;
    }
    return subs;
  }

  // Players sorted for tables (by jersey number = order in team.players)
  const draftPlayers = team.players.filter(p => draft.availablePlayerIds.includes(p.id));

  // Playing time stats
  const playingMins = draftPlayers.map(p => ({ player: p, mins: minutesFor(draft, p.id) }));
  const fieldOnly = playingMins.filter(x => !x.player.roles?.includes('keeper') || !isAlwaysKeeper(x.player.id, draft, formation));
  const fieldMinutes = fieldOnly.map(x => x.mins).filter(m => m > 0);
  const avgField = fieldMinutes.length > 0 ? Math.round(fieldMinutes.reduce((a, b) => a + b, 0) / fieldMinutes.length) : 0;
  const spread = fieldMinutes.length > 0 ? Math.max(...fieldMinutes) - Math.min(...fieldMinutes) : 0;
  const totalSubs = allPeriods.reduce((sum, p) => sum + substitutionsCount(p.halfIdx, p.periodIdx), 0);

  return (
    <Document title={`Kampplan ${team.name} vs ${match.opponentName}`} author="Byttehjelp">
      {/* ============== SIDE 1 ============== */}
      <Page size="A4" style={styles.page} wrap>
        <BrandStrip section="Kampplan" page={1} totalPages={2} generated={generated} />

        {/* Title */}
        <View style={{ marginTop: 16 }}>
          <Text style={styles.eyebrow}>
            {match.format} · {dateInfo.weekday ? `${dateInfo.weekday} ${dateInfo.long}` : dateInfo.long}
          </Text>
          <Text style={styles.title}>{team.name}</Text>
          <Text style={styles.titleSep}>mot</Text>
          <Text style={styles.title}>{match.opponentName}</Text>
        </View>

        {/* Meta band */}
        <View style={styles.metaBand}>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Dato</Text>
            <Text style={styles.metaValue}>{dateInfo.long}</Text>
            {dateInfo.weekday && <Text style={styles.metaSub}>{dateInfo.weekday}</Text>}
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Avspark</Text>
            <Text style={styles.metaValue}>{match.kickoffTime ?? '–'}</Text>
            <Text style={styles.metaSub}>Oppmøte {match.kickoffTime ? subtractMinutes(match.kickoffTime, 30) : '–'}</Text>
          </View>
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>Format</Text>
            <Text style={styles.metaValue}>{match.format} · {formation.name}</Text>
            <Text style={styles.metaSub}>2 × {draft.halfDurationMinutes} min · {allPeriods.length} perioder</Text>
          </View>
          <View style={styles.metaCellLast}>
            <Text style={styles.metaLabel}>Arena</Text>
            <Text style={styles.metaValue}>{match.venue ?? '–'}</Text>
            <Text style={styles.metaSub}>Draft: {draft.name}</Text>
          </View>
        </View>

        {/* Squad */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Tropp · {draftPlayers.length} spillere</Text>
          <Text style={styles.sectionHint}>Jersey-nummer = rekkefølgen i lagets spillerliste</Text>
        </View>
        <View style={styles.squadGrid}>
          {draftPlayers.map(p => {
            const isKeeper = p.roles?.includes('keeper') ?? false;
            const num = jerseyNumber(team, p.id);
            return (
              <View key={p.id} style={styles.squadCard}>
                <View style={styles.squadCardInner}>
                  <View style={[styles.jerseyDot, isKeeper ? styles.jerseyDotKeeper : styles.jerseyDotField]}>
                    <Text style={[styles.jerseyText, isKeeper ? styles.jerseyTextKeeper : styles.jerseyTextField]}>{num}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.squadName} wrap={false}>{p.name}</Text>
                    <Text style={styles.squadRole}>{roleLabel(p.roles)}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Periods grid */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Formasjon per periode</Text>
          <Text style={styles.sectionHint}>{formation.name} · {formation.positions.length} på banen + benk</Text>
        </View>
        <View style={styles.periodGrid}>
          {allPeriods.map(({ halfIdx, periodIdx, period }, idx) => {
            const subs = substitutionsCount(halfIdx, periodIdx);
            const onField = formation.positions.length;
            const benchNames = period.bench.map(pid => `#${jerseyNumber(team, pid)} ${playerMap.get(pid) ?? '?'}`).join(' · ');
            return (
              <View key={`${halfIdx}-${periodIdx}`} style={styles.periodCard}>
                <View style={styles.periodCardInner}>
                  <View style={styles.periodHeader}>
                    <View>
                      <Text style={styles.periodLabel}>{halfIdx === 0 ? '1. omgang' : '2. omgang'} · Periode {idx + 1}</Text>
                      <Text style={styles.periodTime}>{period.startMinute}:00 – {period.endMinute}:00</Text>
                    </View>
                    <Text style={styles.periodChip}>{idx === 0 ? `${onField} på banen` : `${subs} bytte${subs === 1 ? '' : 'r'}`}</Text>
                  </View>
                  <View style={styles.pitchWrap}>
                    <PitchSvg formation={formation} period={period} team={team} />
                    <View style={styles.benchRow}>
                      <Text style={styles.benchLabel}>Benk</Text>
                      <Text style={styles.benchText}>{benchNames || '–'}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        <PageFooter team={team} match={match} page={1} totalPages={2} />
      </Page>

      {/* ============== SIDE 2 ============== */}
      <Page size="A4" style={styles.page} wrap>
        <BrandStrip section="Bytteoversikt" page={2} totalPages={2} generated={generated} />

        <View style={{ marginTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={styles.eyebrow}>{team.name} · mot {match.opponentName}</Text>
            <Text style={styles.page2Title}>Bytteoversikt og spilletid</Text>
          </View>
          <Text style={{ fontSize: 8, color: COLOR.slate500 }}>
            {formatShortDate(match.date)}
            {match.kickoffTime ? ` · ${match.kickoffTime}` : ''}
            {match.venue ? ` · ${match.venue}` : ''}
          </Text>
        </View>

        {/* Position grid table */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Posisjon per spiller × periode</Text>
          <Text style={styles.sectionHint}>Forkortelser forklart nederst</Text>
        </View>
        <View style={styles.table}>
          {/* Head */}
          <View style={styles.thead}>
            <View style={[styles.th, styles.thPlayer, { width: '32%' }]}>
              <Text style={[styles.th, styles.thPlayer, { padding: 0 }]}>Spiller</Text>
            </View>
            {allPeriods.map((p, i) => (
              <View key={i} style={[styles.th, { flex: 1 }]}>
                <Text style={[styles.th, { padding: 0 }]}>P{i + 1}</Text>
                <Text style={styles.thSub}>{p.period.startMinute}–{p.period.endMinute}</Text>
              </View>
            ))}
            <View style={[styles.th, styles.thMin, { width: '12%' }]}>
              <Text style={[styles.th, styles.thMin, { padding: 0 }]}>Min</Text>
            </View>
          </View>
          {/* Body */}
          {draftPlayers.map(p => {
            const num = jerseyNumber(team, p.id);
            const isAlwaysGk = isAlwaysKeeper(p.id, draft, formation);
            return (
              <View key={p.id} style={styles.tr}>
                <View style={[styles.tdPlayer, { width: '32%' }]}>
                  <View style={[styles.tdJersey, isAlwaysGk ? styles.jerseyDotKeeper : styles.jerseyDotField]}>
                    <Text style={[styles.tdJerseyText, isAlwaysGk ? styles.jerseyTextKeeper : styles.jerseyTextField]}>{num}</Text>
                  </View>
                  <Text style={styles.tdName} wrap={false}>{p.name}</Text>
                </View>
                {allPeriods.map(({ halfIdx, periodIdx }, i) => {
                  const pos = periodAssignment(draft, p.id, halfIdx, periodIdx, formation);
                  const isKeeper = pos ? isKeeperPosition(pos) : false;
                  return (
                    <View key={i} style={[styles.td, styles.tdCellWrap, { flex: 1 }]}>
                      <View style={[styles.tdCell, pos ? (isKeeper ? styles.tdCellKeeper : styles.tdCellPos) : styles.tdCellBench]}>
                        <Text style={pos ? (isKeeper ? styles.tdCellKeeperText : styles.tdCellPosText) : styles.tdCellBenchText}>
                          {pos ? abbreviatePosition(pos) : '·'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
                <Text style={[styles.td, styles.tdMin, { width: '12%' }]}>{minutesFor(draft, p.id)}</Text>
              </View>
            );
          })}
          {/* Footer with abbreviations */}
          <View style={styles.tfoot}>
            <Text style={styles.tfootLabel}>Forkortelser</Text>
            <Text style={styles.tfootText}>
              {formation.positions.map(pos => `${abbreviatePosition(pos)} ${pos}`).join(' · ')}
            </Text>
          </View>
        </View>

        {/* Playing time bars */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Spilletid</Text>
          <Text style={styles.sectionHint}>Av {totalMin} totale minutter</Text>
        </View>
        <View style={styles.ptList}>
          {draftPlayers.map(p => {
            const num = jerseyNumber(team, p.id);
            const mins = minutesFor(draft, p.id);
            const pct = totalMin > 0 ? Math.round((mins / totalMin) * 100) : 0;
            const isAlwaysGk = isAlwaysKeeper(p.id, draft, formation);
            return (
              <View key={p.id} style={styles.ptItem}>
                <View style={[styles.ptDot, isAlwaysGk ? styles.jerseyDotKeeper : styles.jerseyDotField]}>
                  <Text style={[styles.tdJerseyText, isAlwaysGk ? styles.jerseyTextKeeper : styles.jerseyTextField]}>{num}</Text>
                </View>
                <Text style={styles.ptName} wrap={false}>{p.name}</Text>
                <View style={styles.ptBarTrack}>
                  <View style={[isAlwaysGk ? styles.ptBarFillKeeper : styles.ptBarFill, { width: `${pct}%` }]} />
                </View>
                <Text style={styles.ptMin}>{mins} min</Text>
                <Text style={styles.ptPct}>{pct}%</Text>
              </View>
            );
          })}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statsCell}>
            <Text style={styles.statsLabel}>Snitt utespiller</Text>
            <Text style={styles.statsValue}>{avgField}<Text style={styles.statsUnit}> min</Text></Text>
          </View>
          <View style={styles.statsCell}>
            <Text style={styles.statsLabel}>Forskjell mest/minst</Text>
            <Text style={styles.statsValue}>{spread}<Text style={styles.statsUnit}> min</Text></Text>
          </View>
          <View style={styles.statsCellLast}>
            <Text style={styles.statsLabel}>Bytter totalt</Text>
            <Text style={styles.statsValue}>{totalSubs}</Text>
          </View>
        </View>

        {/* Coach + share row */}
        <View style={styles.coachRow}>
          <View style={styles.coachCard}>
            <Text style={styles.statsLabel}>Trener</Text>
            <Text style={styles.coachName}>{team.name}</Text>
            <Text style={styles.coachRole}>Hovedtrener</Text>
            <Text style={styles.coachMessage}>
              <Text style={{ fontFamily: 'Helvetica-Bold', color: COLOR.slate900 }}>Beskjed:</Text>{' '}
              Møt opp i tide. Vannflaske og leggskinn er obligatorisk.
              Vi spiller {match.format} i {allPeriods.length} perioder à {Math.round(totalMin / allPeriods.length)} minutter — alle får jevn spilletid.
            </Text>
          </View>
          <View style={styles.shareCard}>
            <Text style={styles.shareTitle}>Del kampplanen</Text>
            <Text style={styles.shareText}>
              Denne PDF-en kan deles med foreldre og hjelpetrenere. Endringer gjøres i appen — eksporter på nytt om noe endres.
            </Text>
            <Text style={styles.shareUrl}>byttehjelp.no</Text>
          </View>
        </View>

        <PageFooter team={team} match={match} page={2} totalPages={2} />
      </Page>
    </Document>
  );
}

// Helpers --------------------------------------------------

function isAlwaysKeeper(playerId: string, draft: Draft, formation: Formation): boolean {
  const keeperPos = formation.positions.find(isKeeperPosition);
  if (!keeperPos) return false;
  let appearances = 0;
  let asKeeper = 0;
  for (const half of draft.halves) {
    for (const period of half.periods) {
      for (const pos of formation.positions) {
        if (period.positions[pos] === playerId) {
          appearances += 1;
          if (pos === keeperPos) asKeeper += 1;
        }
      }
    }
  }
  return appearances > 0 && asKeeper === appearances;
}

function subtractMinutes(time: string, minutes: number): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return time;
  let h = parseInt(m[1], 10);
  let mm = parseInt(m[2], 10) - minutes;
  while (mm < 0) { mm += 60; h -= 1; }
  if (h < 0) h += 24;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
