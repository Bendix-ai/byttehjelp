import { useState } from 'react';
import { useAppState } from '../store/AppContext';
import type { Draft, Match } from '../types';
import { generateId } from '../utils/id';
import { buildHalf } from '../utils/plan';
import { DEFAULT_FORMATIONS, getDefaultFormation } from '../constants/formations';
import { MatchPlayerSelector } from '../components/MatchPlayerSelector';

interface Props {
  activeMatchId: string | null;
  onSelectMatch: (id: string) => void;
  onCreateMatch: (id: string) => void;
}

function formatDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function statusMeta(s: Match['status']) {
  if (s === 'planning') return { text: 'Planlegger', cls: 'bg-gray-100 text-gray-600' };
  if (s === 'live') return { text: 'Live', cls: 'bg-green-100 text-green-700' };
  return { text: 'Ferdigspilt', cls: 'bg-blue-100 text-blue-700' };
}

export function MatchesScreen({ activeMatchId, onSelectMatch, onCreateMatch }: Props) {
  const { state, dispatch } = useAppState();
  const team = state.teams[0] ?? null;

  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editKickoff, setEditKickoff] = useState('');
  const [editOpponent, setEditOpponent] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  if (!team) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Opprett et lag først.</p>
      </div>
    );
  }

  const teamMatches = state.matches.filter(m => m.teamId === team.id);
  const formation = team.defaultFormationId
    ? [...DEFAULT_FORMATIONS, ...team.savedFormations].find(f => f.id === team.defaultFormationId) ?? getDefaultFormation(team.format)
    : getDefaultFormation(team.format);
  const minPlayers = formation.positions.length;
  const canCreate = team.players.length >= minPlayers;

  const todayIso = new Date().toISOString().split('T')[0];
  const live = teamMatches.filter(m => m.status === 'live');
  const upcoming = teamMatches
    .filter(m => m.status === 'planning' && m.date >= todayIso)
    .sort((a, b) => (a.date + (a.kickoffTime ?? '')).localeCompare(b.date + (b.kickoffTime ?? '')));
  const past = teamMatches
    .filter(m => m.status === 'completed' || (m.status === 'planning' && m.date < todayIso))
    .sort((a, b) => (b.date + (b.kickoffTime ?? '')).localeCompare(a.date + (a.kickoffTime ?? '')));

  function handleCreate(selectedPlayerIds: string[]) {
    if (!team) return;
    const now = Date.now();
    const intervalMin = 7.5;
    const halfDuration = 30;
    const draftId = generateId();
    const firstDraft: Draft = {
      id: draftId,
      name: 'Hovedutkast',
      formationId: formation.id,
      availablePlayerIds: selectedPlayerIds,
      halves: [buildHalf(halfDuration, intervalMin, formation.positions), buildHalf(halfDuration, intervalMin, formation.positions)],
      intervalMinutes: intervalMin,
      halfDurationMinutes: halfDuration,
      keeperLocked: true,
      createdAt: now,
      updatedAt: now,
    };
    const newMatch: Match = {
      id: generateId(),
      teamId: team.id,
      opponentName: 'Motstander',
      date: todayIso,
      format: team.format,
      drafts: [firstDraft],
      activeDraftId: draftId,
      status: 'planning',
      createdAt: now,
    };
    dispatch({ type: 'ADD_MATCH', match: newMatch });
    setShowPlayerSelector(false);
    onCreateMatch(newMatch.id);
  }

  function beginEdit(m: Match) {
    setEditingId(m.id);
    setEditDate(m.date);
    setEditKickoff(m.kickoffTime ?? '');
    setEditOpponent(m.opponentName);
    setEditVenue(m.venue ?? '');
  }

  function saveEdit(m: Match) {
    dispatch({
      type: 'UPDATE_MATCH',
      match: {
        ...m,
        date: editDate,
        kickoffTime: editKickoff.trim() || undefined,
        opponentName: editOpponent.trim() || 'Motstander',
        venue: editVenue.trim() || undefined,
      },
    });
    setEditingId(null);
  }

  function seedMockHistory() {
    if (!team) return;
    const opponents = ['Madla 1', 'Brodd', 'Hana', 'Viking U12', 'Bryne', 'Sandnes Ulf', 'Klepp'];
    const venues = ['Jørpeland kunstgress', 'Madlakroken', 'SR-Bank Arena', 'Bryne stadion', 'Klepp stadion'];
    const kickoffs = ['12:00', '14:30', '16:00', '10:30', '18:00'];
    const now = Date.now();
    for (let i = 0; i < 5; i++) {
      const daysAgo = 7 + i * 12;
      const d = new Date(now - daysAgo * 86400000);
      const iso = d.toISOString().split('T')[0];
      const draftId = generateId();
      const intervalMin = 7.5;
      const halfDuration = 25;
      const firstDraft: Draft = {
        id: draftId,
        name: 'Hovedutkast',
        formationId: formation.id,
        availablePlayerIds: team.players.slice(0, minPlayers + 2).map(p => p.id),
        halves: [buildHalf(halfDuration, intervalMin, formation.positions), buildHalf(halfDuration, intervalMin, formation.positions)],
        intervalMinutes: intervalMin,
        halfDurationMinutes: halfDuration,
        keeperLocked: true,
        createdAt: now - daysAgo * 86400000,
        updatedAt: now - daysAgo * 86400000,
      };
      const homeScore = Math.floor(Math.random() * 5);
      const awayScore = Math.floor(Math.random() * 4);
      const match: Match = {
        id: generateId(),
        teamId: team.id,
        opponentName: opponents[i % opponents.length],
        date: iso,
        kickoffTime: kickoffs[i % kickoffs.length],
        venue: venues[i % venues.length],
        format: team.format,
        drafts: [firstDraft],
        activeDraftId: draftId,
        livePlan: structuredClone(firstDraft),
        status: 'completed',
        result: { home: homeScore, away: awayScore },
        createdAt: now - daysAgo * 86400000,
      };
      dispatch({ type: 'ADD_MATCH', match });
    }
  }

  function renderRow(m: Match) {
    const isActive = m.id === activeMatchId;
    const status = statusMeta(m.status);
    const isEditing = editingId === m.id;
    const isDeleting = pendingDelete === m.id;

    if (isEditing) {
      return (
        <div key={m.id} className="p-4 bg-[var(--color-primary-soft)] rounded-xl mb-2">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Dato</label>
              <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Kickoff</label>
              <input type="time" value={editKickoff} onChange={e => setEditKickoff(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Motstander</label>
              <input type="text" value={editOpponent} onChange={e => setEditOpponent(e.target.value)}
                placeholder="Motstander"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-500 uppercase mb-0.5">Bane (valgfritt)</label>
              <input type="text" value={editVenue} onChange={e => setEditVenue(e.target.value)}
                placeholder="f.eks. Jørpeland kunstgress"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => saveEdit(m)}
              className="bg-[var(--color-primary)] text-white py-1.5 px-4 rounded-lg text-sm font-semibold">Lagre</button>
            <button onClick={() => setEditingId(null)}
              className="bg-gray-100 text-gray-700 py-1.5 px-4 rounded-lg text-sm font-semibold">Avbryt</button>
          </div>
        </div>
      );
    }

    if (isDeleting) {
      return (
        <div key={m.id} className="p-4 bg-red-50 rounded-xl mb-2">
          <p className="text-sm text-red-900 mb-2">Slette kampen mot «{m.opponentName}»? Denne kan ikke angres.</p>
          <div className="flex gap-2">
            <button onClick={() => { dispatch({ type: 'DELETE_MATCH', matchId: m.id }); setPendingDelete(null); }}
              className="bg-red-600 text-white py-1.5 px-4 rounded-lg text-sm font-semibold">Slett</button>
            <button onClick={() => setPendingDelete(null)}
              className="bg-gray-100 text-gray-700 py-1.5 px-4 rounded-lg text-sm font-semibold">Avbryt</button>
          </div>
        </div>
      );
    }

    const resultBadge = m.result ? (() => {
      const win = m.result.home > m.result.away;
      const draw = m.result.home === m.result.away;
      const cls = win ? 'bg-green-100 text-green-700' : draw ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-700';
      const letter = win ? 'S' : draw ? 'U' : 'T';
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-semibold ${cls}`}>
          <span className="font-mono font-bold">{letter}</span>
          <span className="font-mono tabular-nums">{m.result.home}–{m.result.away}</span>
        </span>
      );
    })() : null;

    return (
      <button key={m.id} onClick={() => onSelectMatch(m.id)}
        className={`w-full text-left p-4 rounded-xl mb-2 transition-colors border ${
          isActive ? 'bg-[var(--color-primary-soft)] border-[var(--color-primary)]' : 'bg-white border-gray-200 hover:bg-gray-50'
        }`}>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900 truncate">vs {m.opponentName}</span>
              {resultBadge}
              {!resultBadge && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.cls}`}>{status.text}</span>
              )}
              {m.drafts.length > 1 && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{m.drafts.length} drafts</span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
              <span>{formatDate(m.date)}</span>
              {m.kickoffTime && <span>kl. {m.kickoffTime}</span>}
              <span>·</span>
              <span>{m.format}</span>
              {m.venue && <><span>·</span><span className="truncate">{m.venue}</span></>}
            </div>
          </div>
          <span onClick={(e) => { e.stopPropagation(); beginEdit(m); }}
            className="text-xs text-gray-500 hover:text-[var(--color-primary)] px-2 py-1 cursor-pointer">Rediger</span>
          <span onClick={(e) => { e.stopPropagation(); setPendingDelete(m.id); }}
            className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 cursor-pointer">Slett</span>
        </div>
      </button>
    );
  }

  // Calendar computation
  const monthStart = new Date(calendarMonth.year, calendarMonth.month, 1);
  const firstWeekday = (monthStart.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
  const matchesByDay = new Map<string, Match[]>();
  for (const m of teamMatches) {
    const list = matchesByDay.get(m.date) ?? [];
    list.push(m);
    matchesByDay.set(m.date, list);
  }
  const selectedDayMatches = selectedDay ? matchesByDay.get(selectedDay) ?? [] : [];

  function shiftMonth(delta: number) {
    setCalendarMonth(c => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
    setSelectedDay(null);
  }

  const MONTH_NAMES = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
            {team.name} · {team.format}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">Kamper</h1>
          <p className="text-gray-500 text-sm mt-1">Planlegg, følg opp og arkiver kampene dine.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500'
              }`}>Liste</button>
            <button onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                viewMode === 'calendar' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500'
              }`}>Kalender</button>
          </div>
          <button onClick={() => setShowPlayerSelector(true)} disabled={!canCreate}
            className="bg-[var(--color-primary)] text-white px-5 py-3 rounded-xl font-semibold disabled:opacity-40">
            + Ny kamp
          </button>
        </div>
      </div>

      {!canCreate && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm p-3 rounded-xl mb-6">
          Du trenger minst {minPlayers} spillere for å opprette en {team.format}-kamp.
        </div>
      )}

      {teamMatches.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-gray-200">
          <p className="text-gray-500 mb-4">Ingen kamper ennå.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => setShowPlayerSelector(true)} disabled={!canCreate}
              className="bg-[var(--color-primary)] text-white px-5 py-2 rounded-xl font-semibold disabled:opacity-40">
              Opprett din første kamp
            </button>
            <button onClick={seedMockHistory} disabled={!canCreate}
              className="bg-gray-100 text-gray-700 px-5 py-2 rounded-xl font-semibold disabled:opacity-40">
              Last inn eksempeldata
            </button>
          </div>
        </div>
      ) : viewMode === 'calendar' ? (
        <div className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => shiftMonth(-1)}
              className="text-sm font-semibold text-gray-500 hover:text-[var(--color-primary)] px-2">← Forrige</button>
            <h2 className="text-lg font-bold text-gray-900">
              {MONTH_NAMES[calendarMonth.month]} {calendarMonth.year}
            </h2>
            <button onClick={() => shiftMonth(1)}
              className="text-sm font-semibold text-gray-500 hover:text-[var(--color-primary)] px-2">Neste →</button>
          </div>
          <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-gray-400 uppercase mb-1">
            {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, i) => <div key={`pad-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const iso = `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayMatches = matchesByDay.get(iso) ?? [];
              const isToday = iso === todayIso;
              const isSelected = iso === selectedDay;
              return (
                <button key={day} onClick={() => setSelectedDay(isSelected ? null : iso)}
                  className={`aspect-square rounded-lg text-sm flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    isSelected ? 'bg-[var(--color-primary)] text-white'
                    : dayMatches.length > 0 ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)] hover:bg-blue-100'
                    : isToday ? 'border border-[var(--color-primary)] text-[var(--color-primary)]'
                    : 'hover:bg-gray-50 text-gray-600'
                  }`}>
                  <span className={isToday && !isSelected ? 'font-bold' : ''}>{day}</span>
                  {dayMatches.length > 0 && !isSelected && (
                    <span className="text-[9px] font-semibold">
                      {dayMatches.length === 1 ? '●' : `● ${dayMatches.length}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {selectedDay && (
            <div className="mt-5 pt-4 border-t border-gray-200">
              <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
                {formatDate(selectedDay)}
              </h3>
              {selectedDayMatches.length === 0 ? (
                <p className="text-sm text-gray-400">Ingen kamper denne dagen.</p>
              ) : (
                selectedDayMatches.map(renderRow)
              )}
            </div>
          )}
        </div>
      ) : (
        <>
          {live.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Pågår nå</h2>
              {live.map(renderRow)}
            </section>
          )}
          {upcoming.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Kommende</h2>
              {upcoming.map(renderRow)}
            </section>
          )}
          {past.length > 0 && (
            <section className="mb-6">
              <h2 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Historikk</h2>
              {past.map(renderRow)}
            </section>
          )}
          <div className="mt-6 text-center">
            <button onClick={seedMockHistory}
              className="text-xs text-gray-400 hover:text-[var(--color-primary)]">
              + Last inn eksempeldata (historikk)
            </button>
          </div>
        </>
      )}

      {showPlayerSelector && (
        <MatchPlayerSelector
          players={team.players}
          minPlayers={minPlayers}
          onConfirm={handleCreate}
          onClose={() => setShowPlayerSelector(false)}
        />
      )}
    </div>
  );
}
