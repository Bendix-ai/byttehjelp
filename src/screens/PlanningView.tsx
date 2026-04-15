import { useState, useCallback } from 'react';
import { useAppState } from '../store/AppContext';
import type { Formation, Half, Match, Period, Team } from '../types';
import { generateId } from '../utils/id';
import { DEFAULT_FORMATIONS, getDefaultFormation, getFormationsForFormat } from '../constants/formations';
import { PlayerPicker } from '../components/PlayerPicker';

interface Props {
  onStartMatch: (matchId: string) => void;
}

function getFormation(team: Team): Formation {
  if (team.defaultFormationId) {
    const f = [...DEFAULT_FORMATIONS, ...team.savedFormations].find(f => f.id === team.defaultFormationId);
    if (f) return f;
  }
  return getDefaultFormation(team.format);
}

function buildHalf(duration: number, interval: number, positions: string[]): Half {
  const periodCount = Math.max(1, Math.round(duration / interval));
  const periods: Period[] = [];
  for (let i = 0; i < periodCount; i++) {
    periods.push({
      startMinute: +(i * interval).toFixed(1),
      endMinute: i === periodCount - 1 ? duration : +((i + 1) * interval).toFixed(1),
      positions: Object.fromEntries(positions.map(p => [p, ''])),
      bench: [],
    });
  }
  return { durationMinutes: duration, periods };
}

/** Recompute bench for ONE period based on who's on field */
function computeBench(period: Period, allPlayerIds: string[], prevBench: string[]): string[] {
  const onField = new Set(Object.values(period.positions).filter(Boolean));
  const shouldBeBenched = allPlayerIds.filter(id => !onField.has(id));
  // Preserve order: keep previous bench order, append new arrivals at bottom
  const ordered: string[] = [];
  for (const id of prevBench) {
    if (shouldBeBenched.includes(id)) ordered.push(id);
  }
  for (const id of shouldBeBenched) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

function recomputeAllBenches(half: Half, allPlayerIds: string[]) {
  for (let i = 0; i < half.periods.length; i++) {
    const prevBench = i > 0 ? half.periods[i - 1].bench : [];
    half.periods[i].bench = computeBench(half.periods[i], allPlayerIds, prevBench);
  }
}

/**
 * Copy-forward: For each period after the first,
 * if a position is empty but the previous period has a player there, copy it.
 * This makes periods 2+ auto-inherit from period 1.
 */
function copyForward(half: Half) {
  for (let i = 1; i < half.periods.length; i++) {
    for (const pos of Object.keys(half.periods[i].positions)) {
      if (!half.periods[i].positions[pos] && half.periods[i - 1].positions[pos]) {
        half.periods[i].positions[pos] = half.periods[i - 1].positions[pos];
      }
    }
  }
}

export function PlanningView({ onStartMatch }: Props) {
  const { state, dispatch } = useAppState();

  const [showTeamSetup, setShowTeamSetup] = useState(state.teams.length === 0);
  const [teamName, setTeamName] = useState(state.teams[0]?.name ?? '');
  const [newPlayerName, setNewPlayerName] = useState('');

  const team = state.teams[0] ?? null;
  const existingMatch = state.matches.length > 0 ? state.matches[state.matches.length - 1] : null;

  const [match, setMatch] = useState<Match | null>(existingMatch);
  const [activeHalf, setActiveHalf] = useState<0 | 1>(0);
  const [intervalMin, setIntervalMin] = useState(match?.intervalMinutes ?? 10);
  const [halfDuration, setHalfDuration] = useState(match?.halfDurationMinutes ?? 30);
  const [keeperLocked, setKeeperLocked] = useState(match?.keeperLocked ?? true);
  const [opponentName, setOpponentName] = useState(match?.opponentName ?? '');
  const [pickerCell, setPickerCell] = useState<{ halfIdx: number; periodIdx: number; position: string } | null>(null);

  const formation = team ? getFormation(team) : null;
  const playerMap = new Map<string, string>(team?.players.map(p => [p.id, p.name]) ?? []);

  // === Team management ===
  function handleSaveTeam() {
    if (!teamName.trim()) return;
    if (team) {
      dispatch({ type: 'UPDATE_TEAM', team: { ...team, name: teamName.trim() } });
    } else {
      dispatch({ type: 'ADD_TEAM', team: { id: generateId(), name: teamName.trim(), format: '7v7', players: [], savedFormations: [], createdAt: Date.now() } });
    }
    setShowTeamSetup(false);
  }

  function handleAddPlayer() {
    if (!team || !newPlayerName.trim()) return;
    dispatch({ type: 'UPDATE_TEAM', team: { ...team, players: [...team.players, { id: generateId(), name: newPlayerName.trim() }] } });
    setNewPlayerName('');
  }

  function handleRemovePlayer(pid: string) {
    if (!team) return;
    dispatch({ type: 'UPDATE_TEAM', team: { ...team, players: team.players.filter(p => p.id !== pid) } });
  }

  function handleFormatChange(format: '5v5' | '7v7' | '9v9') {
    if (!team) return;
    dispatch({ type: 'UPDATE_TEAM', team: { ...team, format, defaultFormationId: getDefaultFormation(format).id } });
  }

  function handleFormationChange(fid: string) {
    if (!team) return;
    dispatch({ type: 'UPDATE_TEAM', team: { ...team, defaultFormationId: fid } });
  }

  // === Match creation ===
  function handleCreateMatch() {
    if (!team || !formation) return;
    const newMatch: Match = {
      id: generateId(), teamId: team.id,
      opponentName: opponentName.trim() || 'Motstander',
      date: new Date().toISOString().split('T')[0],
      format: team.format, formationId: formation.id,
      availablePlayerIds: team.players.map(p => p.id),
      halves: [buildHalf(halfDuration, intervalMin, formation.positions), buildHalf(halfDuration, intervalMin, formation.positions)],
      status: 'planning', intervalMinutes: intervalMin, halfDurationMinutes: halfDuration,
      keeperLocked, createdAt: Date.now(),
    };
    dispatch({ type: 'ADD_MATCH', match: newMatch });
    setMatch(newMatch);
  }

  function handleRegeneratePeriods() {
    if (!match || !formation) return;
    const m = structuredClone(match);
    m.intervalMinutes = intervalMin;
    m.halfDurationMinutes = halfDuration;
    m.keeperLocked = keeperLocked;
    for (let h = 0; h < 2; h++) {
      const old = m.halves[h as 0 | 1];
      const nw = buildHalf(halfDuration, intervalMin, formation.positions);
      // preserve period 1 data
      if (old.periods.length > 0 && nw.periods.length > 0) {
        for (const pos of formation.positions) {
          if (old.periods[0].positions[pos]) nw.periods[0].positions[pos] = old.periods[0].positions[pos];
        }
      }
      copyForward(nw);
      recomputeAllBenches(nw, match.availablePlayerIds);
      m.halves[h as 0 | 1] = nw;
    }
    setMatch(m);
    dispatch({ type: 'UPDATE_MATCH', match: m });
  }

  // === Assign player to cell ===
  const handleAssignPlayer = useCallback((halfIdx: number, periodIdx: number, position: string, playerId: string) => {
    if (!match || !formation) return;
    const m = structuredClone(match);
    const half = m.halves[halfIdx as 0 | 1];
    const period = half.periods[periodIdx];
    const keeperPos = formation.positions[0];

    // Clear
    if (!playerId) {
      period.positions[position] = '';
      recomputeAllBenches(half, match.availablePlayerIds);
      setMatch(m); dispatch({ type: 'UPDATE_MATCH', match: m }); setPickerCell(null);
      return;
    }

    const prevHolder = period.positions[position];
    const sourceEntry = Object.entries(period.positions).find(([p, id]) => id === playerId && p !== position);

    if (sourceEntry) {
      // Swap two field players
      period.positions[sourceEntry[0]] = prevHolder;
      period.positions[position] = playerId;
    } else {
      // From bench/unassigned → field
      period.positions[position] = playerId;
    }

    // Keeper lock: if this is keeper position, propagate to ALL periods
    if (keeperLocked && position === keeperPos) {
      for (const p of half.periods) {
        // Remove this player from wherever they were in other periods
        for (const pos of Object.keys(p.positions)) {
          if (p.positions[pos] === playerId && pos !== keeperPos) {
            p.positions[pos] = '';
          }
        }
        p.positions[keeperPos] = playerId;
      }
      // Re-fill empty slots from copy-forward
      copyForward(half);
    }

    recomputeAllBenches(half, match.availablePlayerIds);
    setMatch(m); dispatch({ type: 'UPDATE_MATCH', match: m }); setPickerCell(null);
  }, [match, dispatch, keeperLocked, formation]);

  // === Copy period 1 to all subsequent periods ===
  function handleCopyForward() {
    if (!match) return;
    const m = structuredClone(match);
    const half = m.halves[activeHalf];
    if (half.periods.length < 2) return;
    const src = half.periods[0].positions;
    for (let i = 1; i < half.periods.length; i++) {
      half.periods[i].positions = { ...src };
    }
    recomputeAllBenches(half, match.availablePlayerIds);
    setMatch(m); dispatch({ type: 'UPDATE_MATCH', match: m });
  }

  // === Render: team setup ===
  if (!team || showTeamSetup) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Byttehjelp</h1>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">{team ? 'Rediger lag' : 'Opprett lag'}</h2>
          <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)}
            placeholder="Lagnavn (f.eks. Jorpeland J2016)"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
          {team && (
            <>
              <div className="flex gap-2 mb-4">
                {(['5v5', '7v7', '9v9'] as const).map(f => (
                  <button key={f} onClick={() => handleFormatChange(f)}
                    className={`flex-1 py-2 rounded-lg font-semibold ${team.format === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{f}</button>
                ))}
              </div>
              <div className="flex gap-2 flex-wrap mb-4">
                {[...getFormationsForFormat(team.format), ...team.savedFormations.filter(f => f.format === team.format)].map(f => (
                  <button key={f.id} onClick={() => handleFormationChange(f.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${(team.defaultFormationId ?? getDefaultFormation(team.format).id) === f.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{f.name}</button>
                ))}
              </div>
              <div className="flex gap-2 mb-3">
                <input type="text" value={newPlayerName} onChange={e => setNewPlayerName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddPlayer(); }}
                  placeholder="Legg til spiller" className="flex-1 border border-gray-300 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={handleAddPlayer} disabled={!newPlayerName.trim()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold disabled:opacity-40">+</button>
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {team.players.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                    <span>{p.name}</span>
                    <button onClick={() => handleRemovePlayer(p.id)} className="text-red-400 text-sm">Fjern</button>
                  </div>
                ))}
              </div>
            </>
          )}
          <button onClick={handleSaveTeam} disabled={!teamName.trim()}
            className="w-full mt-4 bg-blue-600 text-white py-3 rounded-xl text-lg font-semibold disabled:opacity-40">
            {team ? 'Lagre' : 'Opprett lag'}</button>
        </div>
      </div>
    );
  }

  // === Render: planning view ===
  const allFormations = [...getFormationsForFormat(team.format), ...team.savedFormations.filter(f => f.format === team.format)];
  const half = match?.halves[activeHalf];
  const period1HasPlayers = half ? Object.values(half.periods[0]?.positions ?? {}).some(Boolean) : false;

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Byttehjelp</h1>
          <button onClick={() => setShowTeamSetup(true)} className="text-sm text-blue-600">{team.name} ({team.format}) &mdash; Rediger</button>
        </div>
        {match && (
          <button onClick={() => onStartMatch(match.id)}
            className="bg-green-600 text-white px-5 py-2.5 rounded-xl font-semibold text-lg">Kamp ⏱</button>
        )}
      </div>

      {/* Settings */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Motstander</label>
            <input type="text" value={opponentName} onChange={e => setOpponentName(e.target.value)} placeholder="Motstander"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bytteintervall (min)</label>
            <input type="number" value={intervalMin} onChange={e => setIntervalMin(Number(e.target.value) || 1)} min={1} max={45}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Omgangslengde (min)</label>
            <input type="number" value={halfDuration} onChange={e => setHalfDuration(Number(e.target.value) || 1)} min={1} max={45}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            {!match ? (
              <button onClick={handleCreateMatch} disabled={team.players.length < (formation?.positions.length ?? 5)}
                className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold text-sm disabled:opacity-40">Ny kampplan</button>
            ) : (
              <button onClick={handleRegeneratePeriods}
                className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold text-sm">Oppdater perioder</button>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={keeperLocked} onChange={e => setKeeperLocked(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-blue-600" />
            <span className="text-sm text-gray-700">Keeper spiller hele omgangen</span>
          </label>
          <div className="flex gap-1 ml-auto">
            {allFormations.map(f => (
              <button key={f.id} onClick={() => handleFormationChange(f.id)}
                className={`px-2 py-1 rounded text-xs font-medium ${(team.defaultFormationId ?? getDefaultFormation(team.format).id) === f.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{f.name}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      {match && half && formation && (
        <>
          {/* Half tabs */}
          <div className="flex gap-2 mb-3">
            {([0, 1] as const).map(i => (
              <button key={i} onClick={() => setActiveHalf(i)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold ${activeHalf === i ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                {i === 0 ? '1. omgang' : '2. omgang'}</button>
            ))}
          </div>

          {/* Instruction + copy button */}
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs text-gray-400 flex-1">
              {!period1HasPlayers
                ? 'Trykk pa cellene for a sette opp startoppstillingen (periode 1)'
                : 'Trykk pa celler i neste periode for a gjore bytter. Kun endrede celler far farge.'}
            </p>
            {period1HasPlayers && half.periods.length > 1 && (
              <button onClick={handleCopyForward}
                className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-200 whitespace-nowrap">
                Kopier P1 → alle
              </button>
            )}
          </div>

          {/* The grid */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs sticky left-0 bg-gray-50 min-w-[120px] border-r border-gray-200">
                    Posisjon
                  </th>
                  {half.periods.map((period, pi) => (
                    <th key={pi} className="text-center py-2.5 px-2 font-medium text-gray-500 text-xs min-w-[100px] border-r border-gray-100 last:border-r-0">
                      {period.startMinute}&prime; &ndash; {period.endMinute}&prime;
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {formation.positions.map((pos, posIdx) => {
                  const isKeeper = posIdx === 0;
                  return (
                    <tr key={pos} className="border-t border-gray-200">
                      <td className="py-2 px-3 text-xs text-gray-600 font-semibold sticky left-0 bg-white border-r border-gray-200 whitespace-nowrap">
                        {pos} {isKeeper && keeperLocked && <span className="text-yellow-500">🔒</span>}
                      </td>
                      {half.periods.map((period, pi) => {
                        const pid = period.positions[pos];
                        const name = pid ? playerMap.get(pid) ?? '?' : '';
                        const isLockedKeeper = isKeeper && keeperLocked && pi > 0;

                        // Color: compare with PREVIOUS period
                        // Green = this cell has a DIFFERENT player than the same position in previous period (someone came IN)
                        // Red = this cell's player will be REPLACED in the next period (going OUT)
                        let bg = '';
                        if (pid && pi > 0) {
                          const prevPid = half.periods[pi - 1].positions[pos];
                          if (prevPid && prevPid !== pid) bg = 'bg-[#D9EAD3]'; // green: new player in this position
                        }
                        if (pid && pi < half.periods.length - 1) {
                          const nextPid = half.periods[pi + 1].positions[pos];
                          if (nextPid && nextPid !== pid) bg = 'bg-[#F4CCCC]'; // red: will be replaced
                        }
                        // Both in and out in same cell? Red takes priority (about to leave)
                        // Actually check both independently for the case where someone arrives AND leaves in one period
                        if (pid && pi > 0 && pi < half.periods.length - 1) {
                          const prevPid = half.periods[pi - 1].positions[pos];
                          const nextPid = half.periods[pi + 1].positions[pos];
                          if (prevPid && prevPid !== pid && nextPid && nextPid !== pid) {
                            bg = 'bg-[#F4CCCC]'; // red wins if both
                          }
                        }

                        return (
                          <td key={pi}
                            onClick={() => !isLockedKeeper && setPickerCell({ halfIdx: activeHalf, periodIdx: pi, position: pos })}
                            className={`py-1.5 px-1 text-center border-r border-gray-100 last:border-r-0 transition-colors ${bg} ${isLockedKeeper ? 'opacity-50 cursor-default' : 'cursor-pointer hover:bg-blue-50 active:bg-blue-100'}`}>
                            <div className="min-h-[40px] flex items-center justify-center">
                              {name ? (
                                <span className="text-sm font-medium text-gray-800">{name}</span>
                              ) : (
                                <span className="text-gray-300 text-xl">+</span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Bench */}
                {half.periods.some(p => p.bench.length > 0) && (
                  <>
                    <tr className="border-t-2 border-gray-400">
                      <td colSpan={1 + half.periods.length} className="py-1.5 px-3 text-xs text-gray-400 font-bold bg-gray-50">
                        BENK
                      </td>
                    </tr>
                    {Array.from({ length: Math.max(...half.periods.map(p => p.bench.length), 0) }, (_, bi) => (
                      <tr key={`b${bi}`} className="border-t border-gray-100">
                        <td className="py-1.5 px-3 text-xs text-gray-400 sticky left-0 bg-white border-r border-gray-200">
                          Innbytter {bi + 1}
                        </td>
                        {half.periods.map((period, pi) => {
                          const bid = period.bench[bi];
                          const bname = bid ? playerMap.get(bid) ?? '?' : '';
                          return (
                            <td key={pi} className="py-1.5 px-1 text-center text-xs text-gray-500 border-r border-gray-100 last:border-r-0">
                              {bname}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {/* Playing time */}
          <div className="mt-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="text-xs font-bold text-gray-500 mb-2">SPILLETID</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-1">
              {match.availablePlayerIds.map(pid => {
                const name = playerMap.get(pid) ?? '?';
                let mins1 = 0, mins2 = 0;
                for (const p of match.halves[0].periods) {
                  if (Object.values(p.positions).includes(pid)) mins1 += p.endMinute - p.startMinute;
                }
                for (const p of match.halves[1].periods) {
                  if (Object.values(p.positions).includes(pid)) mins2 += p.endMinute - p.startMinute;
                }
                return (
                  <div key={pid} className="flex justify-between text-sm py-0.5">
                    <span className="text-gray-700">{name}</span>
                    <span className="font-mono text-xs text-gray-400">{mins1 + mins2} min</span>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Player picker */}
      {pickerCell && match && formation && (
        <PlayerPicker
          players={team.players}
          currentPlayerId={match.halves[pickerCell.halfIdx as 0 | 1].periods[pickerCell.periodIdx].positions[pickerCell.position]}
          period={match.halves[pickerCell.halfIdx as 0 | 1].periods[pickerCell.periodIdx]}
          position={pickerCell.position}
          onSelect={(pid) => handleAssignPlayer(pickerCell.halfIdx, pickerCell.periodIdx, pickerCell.position, pid)}
          onClose={() => setPickerCell(null)}
        />
      )}
    </div>
  );
}
