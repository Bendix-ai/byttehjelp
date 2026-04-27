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
  benchBg: '#fafbfc',
  benchInk: '#94a3b8',
  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate900: '#0f172a',
} as const;

function formatDate(iso: string): { long: string; short: string; weekday: string } {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { long: iso, short: iso, weekday: '' };
  const long = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  const short = new Intl.DateTimeFormat('nb-NO', { day: '2-digit', month: '2-digit', year: '2-digit' }).format(d);
  const weekday = new Intl.DateTimeFormat('nb-NO', { weekday: 'long' }).format(d);
  return { long, short, weekday: weekday.charAt(0).toUpperCase() + weekday.slice(1) };
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

function isKeeperPosition(positionName: string): boolean {
  return positionName.toLowerCase().startsWith('keeper');
}

function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return parts[0];
}

function flatPeriods(draft: Draft): Array<{ halfIdx: number; periodIdx: number; period: Draft['halves'][0]['periods'][0] }> {
  const out: Array<{ halfIdx: number; periodIdx: number; period: Draft['halves'][0]['periods'][0] }> = [];
  draft.halves.forEach((h, hi) => h.periods.forEach((p, pi) => out.push({ halfIdx: hi, periodIdx: pi, period: p })));
  return out;
}

type CellState = 'empty' | 'stable' | 'in' | 'out' | 'keeper';

function getCellState(draft: Draft, position: string, flatIdx: number): { type: CellState; pid: string } {
  const all = flatPeriods(draft);
  const cur = all[flatIdx]?.period;
  if (!cur) return { type: 'empty', pid: '' };
  const pid = cur.positions[position] ?? '';
  if (!pid) return { type: 'empty', pid: '' };
  if (isKeeperPosition(position)) return { type: 'keeper', pid };
  const prevPid = flatIdx > 0 ? all[flatIdx - 1]?.period.positions[position] : undefined;
  const nextPid = flatIdx < all.length - 1 ? all[flatIdx + 1]?.period.positions[position] : undefined;
  if (nextPid && nextPid !== pid) return { type: 'out', pid };
  if (prevPid && prevPid !== pid) return { type: 'in', pid };
  return { type: 'stable', pid };
}

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
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.line,
  },
  brandLeft: { flexDirection: 'row', alignItems: 'center' },
  brandLogo: {
    width: 16,
    height: 16,
    backgroundColor: COLOR.primary,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  brandLogoText: { color: COLOR.white, fontFamily: 'Helvetica-Bold', fontSize: 8 },
  brandWord: { fontFamily: 'Helvetica-Bold', fontSize: 9.5, color: COLOR.slate900 },
  brandSep: { color: '#cbd5e1', marginHorizontal: 5, fontSize: 9 },
  brandSection: { color: COLOR.slate500, fontSize: 9, fontFamily: 'Helvetica' },
  brandRight: { color: COLOR.slate400, fontSize: 7.5 },

  // Title + meta row
  titleMetaRow: { flexDirection: 'row', marginTop: 12, alignItems: 'flex-end' },
  titleCol: { flex: 7, paddingRight: 14 },
  metaCol: { flex: 5 },
  eyebrow: {
    color: COLOR.primary,
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    color: COLOR.slate900,
    lineHeight: 1.1,
    marginTop: 4,
  },
  titleSep: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    color: COLOR.slate400,
  },
  metaBand: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: COLOR.line,
    borderRadius: 6,
    backgroundColor: COLOR.surface,
    overflow: 'hidden',
  },
  metaCell: { flex: 1, paddingHorizontal: 6, paddingVertical: 5, borderRightWidth: 1, borderRightColor: COLOR.line },
  metaCellLast: { flex: 1, paddingHorizontal: 6, paddingVertical: 5 },
  metaLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 6,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: COLOR.slate500,
  },
  metaValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    color: COLOR.slate900,
    marginTop: 2,
  },

  // Pitch row
  pitchRow: { flexDirection: 'row', marginTop: 14, gap: 6 },
  pitchCard: { flex: 1, borderWidth: 1, borderColor: COLOR.line, borderRadius: 6, overflow: 'hidden' },
  pitchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: COLOR.white,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.line,
  },
  pitchLabel: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: COLOR.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pitchTime: { fontSize: 7, color: COLOR.slate500 },
  pitchWrap: { backgroundColor: COLOR.surface, padding: 4 },

  // Section heads
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16, marginBottom: 6 },
  sectionTitle: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9.5,
    color: COLOR.slate700,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  legend: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 8, height: 8, borderRadius: 1.5, marginRight: 4 },
  legendText: { fontSize: 8, color: COLOR.slate600 },

  // Position table
  table: {
    borderWidth: 1,
    borderColor: COLOR.line,
    borderRadius: 8,
    overflow: 'hidden',
  },
  thead: {
    flexDirection: 'row',
    backgroundColor: COLOR.slate50,
    borderBottomWidth: 1,
    borderBottomColor: COLOR.line,
  },
  thCol: { paddingVertical: 5, paddingHorizontal: 4, alignItems: 'center', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: COLOR.lineSoft },
  thColFirst: { paddingVertical: 5, paddingLeft: 10, paddingRight: 4, alignItems: 'flex-start', justifyContent: 'center' },
  thText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: COLOR.slate700,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  thSub: { fontSize: 7, color: COLOR.slate400, fontFamily: 'Helvetica', marginTop: 1 },
  tr: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR.lineSoft,
  },
  thRow: { paddingLeft: 10, paddingRight: 4, paddingVertical: 5, justifyContent: 'center' },
  thRowText: { fontFamily: 'Helvetica-Bold', fontSize: 9.5, color: COLOR.slate900 },
  thRowBench: { fontFamily: 'Helvetica', fontSize: 8.5, color: COLOR.slate500 },
  cellWrap: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 0.5,
    borderLeftColor: COLOR.lineSoft,
  },
  cellName: { fontFamily: 'Helvetica-Bold', fontSize: 9.5 },
  cellNameStable: { fontFamily: 'Helvetica', fontSize: 9.5, color: COLOR.ink },
  cellNum: { fontFamily: 'Helvetica', fontSize: 7, marginRight: 3 },
  cellInner: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center' },

  // Bench sub-header
  benchSep: {
    backgroundColor: COLOR.slate50,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: COLOR.line,
  },
  benchSepText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7.5,
    color: COLOR.slate500,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  pageFooter: {
    marginTop: 14,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: COLOR.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pageFooterText: { fontSize: 7, color: COLOR.slate400 },

  // Page 2 — playing time bars
  page2Title: { fontFamily: 'Helvetica-Bold', fontSize: 20, color: COLOR.slate900, marginTop: 4 },
  ptList: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  ptItem: { width: '50%', flexDirection: 'row', alignItems: 'center', paddingRight: 16, marginBottom: 6 },
  ptDot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  ptDotKeeper: { backgroundColor: COLOR.keeper },
  ptDotField: { backgroundColor: COLOR.primarySoft },
  ptDotText: { fontFamily: 'Helvetica-Bold', fontSize: 7 },
  ptDotTextKeeper: { color: COLOR.keeperInk },
  ptDotTextField: { color: COLOR.primary },
  ptName: { width: 90, fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: COLOR.slate900 },
  ptBarTrack: { flex: 1, height: 5, backgroundColor: COLOR.lineSoft, borderRadius: 3, overflow: 'hidden', marginHorizontal: 6 },
  ptBarFill: { height: 5, backgroundColor: COLOR.primary, borderRadius: 3 },
  ptBarFillKeeper: { height: 5, backgroundColor: '#d97706', borderRadius: 3 },
  ptMin: { width: 42, textAlign: 'right', fontSize: 8, fontFamily: 'Helvetica-Bold', color: COLOR.slate900 },
  ptPct: { width: 26, textAlign: 'right', fontSize: 7, color: COLOR.slate500 },

  // Stats
  statsRow: { flexDirection: 'row', marginTop: 14, gap: 6 },
  statsCell: { flex: 1, padding: 10, borderRadius: 6, borderWidth: 1, borderColor: COLOR.line, backgroundColor: COLOR.surface },
  statsLabel: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: COLOR.slate500, letterSpacing: 0.6, textTransform: 'uppercase' },
  statsValue: { fontFamily: 'Helvetica-Bold', fontSize: 18, color: COLOR.slate900, marginTop: 3 },
  statsUnit: { fontSize: 9, fontFamily: 'Helvetica', color: COLOR.slate500 },

  // Coach + share row
  coachRow: { flexDirection: 'row', marginTop: 16, gap: 6 },
  coachCard: { flex: 2, borderWidth: 1, borderColor: COLOR.line, borderRadius: 6, backgroundColor: COLOR.white, padding: 10 },
  shareCard: { flex: 1, borderWidth: 1, borderColor: COLOR.line, borderRadius: 6, backgroundColor: COLOR.primarySoft, padding: 10 },
  coachName: { fontFamily: 'Helvetica-Bold', fontSize: 12, color: COLOR.slate900, marginTop: 2 },
  coachRole: { fontSize: 8, color: COLOR.slate500 },
  coachMessage: { fontSize: 9, color: COLOR.slate700, lineHeight: 1.4, marginTop: 6 },
  shareTitle: { fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: COLOR.primary, letterSpacing: 0.8, textTransform: 'uppercase' },
  shareText: { fontSize: 8, color: COLOR.slate700, marginTop: 4, lineHeight: 1.5 },
  shareUrl: { fontFamily: 'Helvetica-Bold', fontSize: 8, color: COLOR.primary, marginTop: 6 },
});

function PitchSvg({ formation, period, team }: { formation: Formation; period: Draft['halves'][0]['periods'][0]; team: Team }) {
  const layout = layoutPositions(formation);
  const VB_W = 200;
  const VB_H = 260;
  const PAD = 10;
  const mapX = (x: number) => PAD + (x / 100) * (VB_W - 2 * PAD);
  const mapY = (y: number) => PAD + (y / 110) * (VB_H - 2 * PAD);
  return (
    <Svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: '100%', height: 96 }}>
      <Defs>
        <LinearGradient id="pitchGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={COLOR.pitchTop} />
          <Stop offset="100%" stopColor={COLOR.pitchBottom} />
        </LinearGradient>
      </Defs>
      <Rect x={2} y={2} width={VB_W - 4} height={VB_H - 4} rx={5} ry={5} fill="url(#pitchGrad)" />
      <G stroke={COLOR.white} strokeOpacity={0.55} strokeWidth={1.2} fill="none">
        <Rect x={PAD} y={PAD} width={VB_W - 2 * PAD} height={VB_H - 2 * PAD} />
        <Line x1={PAD} y1={VB_H / 2} x2={VB_W - PAD} y2={VB_H / 2} />
        <Circle cx={VB_W / 2} cy={VB_H / 2} r={20} />
        <Rect x={50} y={PAD} width={100} height={26} />
        <Rect x={50} y={VB_H - PAD - 26} width={100} height={26} />
      </G>
      {formation.positions.map(pos => {
        const pid = period.positions[pos];
        const coord = layout[pos];
        if (!coord) return null;
        const cx = mapX(coord.x);
        const cy = mapY(coord.y);
        const isKeeper = isKeeperPosition(pos);
        const num = pid ? jerseyNumber(team, pid) : '';
        const stroke = isKeeper ? COLOR.keeperInk : COLOR.primary;
        const fill = isKeeper ? COLOR.keeper : COLOR.white;
        const textFill = isKeeper ? COLOR.keeperInk : COLOR.primary;
        return (
          <G key={pos}>
            <Circle cx={cx} cy={cy} r={9.5} fill={fill} stroke={stroke} strokeWidth={1.4} />
            {num && (
              <Text x={cx} y={cy + 3} textAnchor="middle" fill={textFill} style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold' }}>
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
        <View style={styles.brandLogo}><Text style={styles.brandLogoText}>B</Text></View>
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
    <View style={styles.pageFooter}>
      <Text style={styles.pageFooterText}>byttehjelp.no</Text>
      <Text style={styles.pageFooterText}>{team.name} · {formatShortDate(match.date)} · Side {page}/{totalPages}</Text>
    </View>
  );
}

function cellBgColor(state: CellState): string {
  switch (state) {
    case 'keeper': return COLOR.keeper;
    case 'in':     return COLOR.subIn;
    case 'out':    return COLOR.subOut;
    case 'stable': return COLOR.white;
    default:       return COLOR.white;
  }
}
function cellTextColor(state: CellState): string {
  switch (state) {
    case 'keeper': return COLOR.keeperInk;
    case 'in':     return COLOR.subInInk;
    case 'out':    return COLOR.subOutInk;
    default:       return COLOR.ink;
  }
}
function cellNumColor(state: CellState): string {
  switch (state) {
    case 'keeper':
    case 'in':
    case 'out': return cellTextColor(state);
    default:    return COLOR.slate400;
  }
}

export function MatchPdfDocument({ team, match, draft, formation, playerMap, generatedAt }: Props) {
  const generated = formatShortDate((generatedAt ?? new Date()).toISOString().slice(0, 10));
  const dateInfo = formatDate(match.date);
  const totalMin = totalMatchMinutes(draft);
  const allPeriods = flatPeriods(draft);

  const draftPlayers = team.players.filter(p => draft.availablePlayerIds.includes(p.id));

  // Stats
  const playingMins = draftPlayers.map(p => ({ player: p, mins: minutesFor(draft, p.id) }));
  const fieldOnly = playingMins.filter(x => !isAlwaysKeeper(x.player.id, draft, formation));
  const fieldMinutes = fieldOnly.map(x => x.mins).filter(m => m > 0);
  const avgField = fieldMinutes.length > 0 ? Math.round(fieldMinutes.reduce((a, b) => a + b, 0) / fieldMinutes.length) : 0;
  const spread = fieldMinutes.length > 0 ? Math.max(...fieldMinutes) - Math.min(...fieldMinutes) : 0;

  // Total subs across all transitions
  let totalSubs = 0;
  for (let i = 1; i < allPeriods.length; i++) {
    for (const pos of formation.positions) {
      const cur = allPeriods[i].period.positions[pos];
      const prev = allPeriods[i - 1].period.positions[pos];
      if (cur && prev && cur !== prev) totalSubs += 1;
    }
  }

  const maxBench = allPeriods.reduce((m, x) => Math.max(m, x.period.bench.length), 0);

  return (
    <Document title={`Kampplan ${team.name} vs ${match.opponentName}`} author="Byttehjelp">
      {/* ============== SIDE 1 ============== */}
      <Page size="A4" style={styles.page}>
        <BrandStrip section="Kampplan" page={1} totalPages={2} generated={generated} />

        {/* Title + meta side by side */}
        <View style={styles.titleMetaRow}>
          <View style={styles.titleCol}>
            <Text style={styles.eyebrow}>{match.format} · {dateInfo.weekday ? `${dateInfo.weekday} ${dateInfo.long}` : dateInfo.long}</Text>
            <Text style={styles.title}>
              {team.name} <Text style={styles.titleSep}>mot</Text> {match.opponentName}
            </Text>
          </View>
          <View style={styles.metaCol}>
            <View style={styles.metaBand}>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Dato</Text>
                <Text style={styles.metaValue}>{dateInfo.short}</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Avspark</Text>
                <Text style={styles.metaValue}>{match.kickoffTime ?? '–'}</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Format</Text>
                <Text style={styles.metaValue}>{match.format}</Text>
              </View>
              <View style={styles.metaCellLast}>
                <Text style={styles.metaLabel}>Bane</Text>
                <Text style={styles.metaValue} wrap={false}>{match.venue ?? '–'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 4 banekart in a single row */}
        <View style={styles.pitchRow}>
          {allPeriods.slice(0, 4).map(({ halfIdx, periodIdx, period }) => (
            <View key={`${halfIdx}-${periodIdx}`} style={styles.pitchCard}>
              <View style={styles.pitchHeader}>
                <Text style={styles.pitchLabel}>P{halfIdx * draft.halves[0].periods.length + periodIdx + 1}</Text>
                <Text style={styles.pitchTime}>{period.startMinute}–{period.endMinute}</Text>
              </View>
              <View style={styles.pitchWrap}>
                <PitchSvg formation={formation} period={period} team={team} />
              </View>
            </View>
          ))}
        </View>

        {/* Position table — main attraction */}
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Bytteoversikt</Text>
          <View style={styles.legend}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLOR.keeper }]} /><Text style={styles.legendText}>Keeper</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLOR.subIn }]} /><Text style={styles.legendText}>Inn</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLOR.subOut }]} /><Text style={styles.legendText}>Ut neste</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLOR.benchBg, borderWidth: 0.5, borderColor: COLOR.line }]} /><Text style={styles.legendText}>Benk</Text></View>
          </View>
        </View>
        <View style={styles.table}>
          {/* Header row */}
          <View style={styles.thead}>
            <View style={[styles.thColFirst, { width: '22%' }]}>
              <Text style={styles.thText}>Posisjon</Text>
            </View>
            {allPeriods.map((p, i) => (
              <View key={i} style={[styles.thCol, { flex: 1 }]}>
                <Text style={styles.thText}>P{i + 1}</Text>
                <Text style={styles.thSub}>{p.period.startMinute}–{p.period.endMinute}</Text>
              </View>
            ))}
          </View>
          {/* Position rows */}
          {formation.positions.map(pos => (
            <View key={pos} style={styles.tr}>
              <View style={[styles.thRow, { width: '22%' }]}>
                <Text style={styles.thRowText} wrap={false}>{pos}</Text>
              </View>
              {allPeriods.map((_, flatIdx) => {
                const { type, pid } = getCellState(draft, pos, flatIdx);
                const bg = cellBgColor(type);
                const numFill = cellNumColor(type);
                const txtFill = cellTextColor(type);
                const isStable = type === 'stable';
                return (
                  <View key={flatIdx} style={[styles.cellWrap, { flex: 1, backgroundColor: bg }]}>
                    {type === 'empty' ? (
                      <Text style={{ color: COLOR.slate400, fontSize: 10 }}>·</Text>
                    ) : (
                      <View style={styles.cellInner}>
                        <Text style={[styles.cellNum, { color: numFill }]}>#{jerseyNumber(team, pid)}</Text>
                        <Text style={[isStable ? styles.cellNameStable : styles.cellName, { color: txtFill }]} wrap={false}>
                          {shortName(playerMap.get(pid) ?? '?')}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
          {/* Bench separator */}
          {maxBench > 0 && (
            <>
              <View style={styles.benchSep}>
                <Text style={styles.benchSepText}>Benk</Text>
              </View>
              {Array.from({ length: maxBench }, (_, bi) => (
                <View key={`b${bi}`} style={styles.tr}>
                  <View style={[styles.thRow, { width: '22%' }]}>
                    <Text style={styles.thRowBench}>Innb. {bi + 1}</Text>
                  </View>
                  {allPeriods.map(({ period }, pi) => {
                    const bid = period.bench[bi];
                    return (
                      <View key={pi} style={[styles.cellWrap, { flex: 1, backgroundColor: COLOR.benchBg }]}>
                        {bid ? (
                          <View style={styles.cellInner}>
                            <Text style={[styles.cellNum, { color: COLOR.benchInk }]}>#{jerseyNumber(team, bid)}</Text>
                            <Text style={[styles.cellNameStable, { color: COLOR.benchInk }]} wrap={false}>
                              {shortName(playerMap.get(bid) ?? '?')}
                            </Text>
                          </View>
                        ) : (
                          <Text style={{ color: '#cbd5e1', fontSize: 9 }}> </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </>
          )}
        </View>

        <PageFooter team={team} match={match} page={1} totalPages={2} />
      </Page>

      {/* ============== SIDE 2 ============== */}
      <Page size="A4" style={styles.page}>
        <BrandStrip section="Spilletid" page={2} totalPages={2} generated={generated} />

        <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <View>
            <Text style={styles.eyebrow}>{team.name} · mot {match.opponentName}</Text>
            <Text style={styles.page2Title}>Spilletid og kampstatistikk</Text>
          </View>
          <Text style={{ fontSize: 8, color: COLOR.slate500 }}>
            {formatShortDate(match.date)}
            {match.kickoffTime ? ` · ${match.kickoffTime}` : ''}
            {match.venue ? ` · ${match.venue}` : ''}
          </Text>
        </View>

        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>Spilletid per spiller</Text>
          <Text style={{ fontSize: 8, color: COLOR.slate500 }}>Av {totalMin} min</Text>
        </View>
        <View style={styles.ptList}>
          {draftPlayers.map(p => {
            const num = jerseyNumber(team, p.id);
            const mins = minutesFor(draft, p.id);
            const pct = totalMin > 0 ? Math.round((mins / totalMin) * 100) : 0;
            const isAlwaysGk = isAlwaysKeeper(p.id, draft, formation);
            return (
              <View key={p.id} style={styles.ptItem}>
                <View style={[styles.ptDot, isAlwaysGk ? styles.ptDotKeeper : styles.ptDotField]}>
                  <Text style={[styles.ptDotText, isAlwaysGk ? styles.ptDotTextKeeper : styles.ptDotTextField]}>{num}</Text>
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

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statsCell}>
            <Text style={styles.statsLabel}>Snitt utespiller</Text>
            <Text style={styles.statsValue}>{avgField}<Text style={styles.statsUnit}> min</Text></Text>
          </View>
          <View style={styles.statsCell}>
            <Text style={styles.statsLabel}>Spread mest/minst</Text>
            <Text style={styles.statsValue}>{spread}<Text style={styles.statsUnit}> min</Text></Text>
          </View>
          <View style={styles.statsCell}>
            <Text style={styles.statsLabel}>Bytter totalt</Text>
            <Text style={styles.statsValue}>{totalSubs}</Text>
          </View>
        </View>

        {/* Coach + share */}
        <View style={styles.coachRow}>
          <View style={styles.coachCard}>
            <Text style={styles.statsLabel}>Trener</Text>
            <Text style={styles.coachName}>{team.name}</Text>
            <Text style={styles.coachRole}>Hovedtrener</Text>
            <Text style={styles.coachMessage}>
              <Text style={{ fontFamily: 'Helvetica-Bold', color: COLOR.slate900 }}>Beskjed:</Text>{' '}
              Møt opp {match.kickoffTime ? `kl. ${subtractMinutes(match.kickoffTime, 30)} ` : 'i god tid '}
              for oppvarming. Vannflaske og leggskinn må med. {allPeriods.length} perioder à {Math.round(totalMin / Math.max(allPeriods.length, 1))} min — alle får jevn spilletid.
            </Text>
          </View>
          <View style={styles.shareCard}>
            <Text style={styles.shareTitle}>Del kampplanen</Text>
            <Text style={styles.shareText}>PDF-en kan deles med foreldre og hjelpetrenere. Endringer gjøres i appen — eksporter på nytt om noe endres.</Text>
            <Text style={styles.shareUrl}>byttehjelp.no</Text>
          </View>
        </View>

        <PageFooter team={team} match={match} page={2} totalPages={2} />
      </Page>
    </Document>
  );
}
