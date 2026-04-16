import { useState } from 'react';
import type { Player } from '../types';

interface Props {
  players: Player[];
  minPlayers: number;
  initiallySelected?: string[];
  title?: string;
  confirmLabel?: string;
  onConfirm: (selectedIds: string[]) => void;
  onClose: () => void;
}

export function MatchPlayerSelector({ players, minPlayers, initiallySelected, title, confirmLabel, onConfirm, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initiallySelected ?? players.map(p => p.id))
  );

  function toggle(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(players.map(p => p.id)));
  }

  function clearAll() {
    setSelected(new Set());
  }

  const count = selected.size;
  const enough = count >= minPlayers;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-xl font-semibold">{title ?? 'Hvem spiller denne kampen?'}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Valgt: {count} {count === 1 ? 'spiller' : 'spillere'} (minst {minPlayers} kreves)
          </p>
          <div className="flex gap-2 mt-3">
            <button onClick={selectAll} className="text-xs px-3 py-1.5 bg-gray-100 rounded-lg text-gray-700 font-medium">Velg alle</button>
            <button onClick={clearAll} className="text-xs px-3 py-1.5 bg-gray-100 rounded-lg text-gray-700 font-medium">Fjern alle</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {players.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Ingen spillere på laget enda.</p>
          ) : (
            <div className="space-y-1">
              {players.map(p => {
                const isSelected = selected.has(p.id);
                return (
                  <label key={p.id}
                    className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer ${isSelected ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    <input type="checkbox" checked={isSelected} onChange={() => toggle(p.id)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                    <span className={`flex-1 ${isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{p.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl font-semibold bg-gray-100 text-gray-700">Avbryt</button>
          <button onClick={() => onConfirm(Array.from(selected))} disabled={!enough}
            className="flex-1 py-3 rounded-xl font-semibold bg-blue-600 text-white disabled:opacity-40">
            {confirmLabel ?? 'Opprett kamp'}
          </button>
        </div>
      </div>
    </div>
  );
}
