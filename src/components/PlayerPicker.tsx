import { useState } from 'react';
import type { Period, Player } from '../types';

interface Props {
  players: Player[];
  currentPlayerId: string;
  period: Period;
  prevPeriod?: Period | null;
  position: string;
  onSelect: (playerId: string) => void;
  onClose: () => void;
}

export function PlayerPicker({ players, currentPlayerId, period, prevPeriod, position, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('');
  const onField = new Set(Object.values(period.positions).filter(Boolean));
  const onBench = period.bench;

  // Players who were on the field in the previous period but are on the bench now are "going out" —
  // they shouldn't be presented as bench-available candidates (would re-enter immediately).
  const goingOut = new Set<string>();
  if (prevPeriod) {
    const wasOnField = new Set(Object.values(prevPeriod.positions).filter(Boolean));
    for (const pid of onBench) {
      if (wasOnField.has(pid)) goingOut.add(pid);
    }
  }

  const q = query.trim().toLowerCase();
  const matches = (p: Player) => !q || p.name.toLowerCase().includes(q);

  // Group players: bench first (available, excluding just-subbed-out), then on field (swap), then current
  const benchPlayers = players.filter(p => onBench.includes(p.id) && !goingOut.has(p.id) && matches(p));
  const fieldPlayers = players.filter(p => onField.has(p.id) && p.id !== currentPlayerId && matches(p));
  const unassignedPlayers = players.filter(p => !onField.has(p.id) && !onBench.includes(p.id) && matches(p));
  const currentPlayer = players.find(p => p.id === currentPlayerId);
  const currentVisible = currentPlayer && matches(currentPlayer);
  const noResults = q && !currentVisible && benchPlayers.length === 0 && fieldPlayers.length === 0 && unassignedPlayers.length === 0;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm max-h-[70vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">{position}</h3>
            <button onClick={onClose} className="text-gray-400 text-2xl leading-none px-2">&times;</button>
          </div>
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Søk etter spiller" autoFocus
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div className="overflow-y-auto max-h-[55vh]">
          {/* Current player */}
          {currentPlayer && currentVisible && (
            <div className="px-4 py-1">
              <div className="text-xs text-gray-400 font-medium mt-2 mb-1">Navaerende</div>
              <button onClick={() => { onSelect(currentPlayer.id); }}
                className="w-full text-left py-3 px-3 rounded-lg bg-blue-50 text-blue-700 font-medium text-sm">
                {currentPlayer.name} ✓
              </button>
            </div>
          )}

          {/* Bench players */}
          {benchPlayers.length > 0 && (
            <div className="px-4 py-1">
              <div className="text-xs text-gray-400 font-medium mt-2 mb-1">Benk (tilgjengelig)</div>
              {benchPlayers.map(p => (
                <button key={p.id} onClick={() => onSelect(p.id)}
                  className="w-full text-left py-3 px-3 rounded-lg hover:bg-green-50 active:bg-green-100 text-sm font-medium text-gray-800 border-b border-gray-50 transition-colors">
                  <span className="inline-block w-3 h-3 rounded-full bg-[#D9EAD3] mr-2 border border-green-300" />
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Field players (swap) */}
          {fieldPlayers.length > 0 && (
            <div className="px-4 py-1">
              <div className="text-xs text-gray-400 font-medium mt-2 mb-1">Pa banen (bytt posisjon)</div>
              {fieldPlayers.map(p => {
                const theirPos = Object.entries(period.positions).find(([, id]) => id === p.id)?.[0] ?? '';
                return (
                  <button key={p.id} onClick={() => onSelect(p.id)}
                    className="w-full text-left py-3 px-3 rounded-lg hover:bg-blue-50 active:bg-blue-100 text-sm text-gray-600 border-b border-gray-50 transition-colors">
                    {p.name} <span className="text-gray-400 text-xs">({theirPos})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Unassigned players */}
          {unassignedPlayers.length > 0 && (
            <div className="px-4 py-1">
              <div className="text-xs text-gray-400 font-medium mt-2 mb-1">Ikke tildelt</div>
              {unassignedPlayers.map(p => (
                <button key={p.id} onClick={() => onSelect(p.id)}
                  className="w-full text-left py-3 px-3 rounded-lg hover:bg-gray-50 active:bg-gray-100 text-sm text-gray-600 border-b border-gray-50 transition-colors">
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {noResults && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Ingen spillere matcher «{query}»
            </div>
          )}
        </div>

        {/* Clear button */}
        <div className="px-4 py-3 border-t border-gray-200">
          <button onClick={() => { onSelect(''); onClose(); }}
            className="w-full py-2 text-sm text-red-500 font-medium rounded-lg hover:bg-red-50">
            Fjern spiller fra denne cellen
          </button>
        </div>
      </div>
    </div>
  );
}
