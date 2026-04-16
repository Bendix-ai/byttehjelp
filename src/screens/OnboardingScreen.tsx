import { useState } from 'react';
import { useAppState } from '../store/AppContext';
import type { Player, PlayerRole } from '../types';
import { generateId } from '../utils/id';
import { getDefaultFormation, getFormationsForFormat } from '../constants/formations';
import { type AppSection } from '../components/Sidebar';

const ROLE_LABELS: Record<PlayerRole, string> = {
  keeper: 'Keeper',
  forsvar: 'Forsvar',
  midtbane: 'Midtbane',
  angrep: 'Angrep',
};

interface Props {
  step: 'team' | 'players';
  onContinue: () => void;
  onGoToSection: (s: AppSection) => void;
}

export function OnboardingScreen({ step, onContinue, onGoToSection }: Props) {
  const { state, dispatch } = useAppState();
  const team = state.teams[0] ?? null;

  const [teamName, setTeamName] = useState(team?.name ?? '');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingRolesId, setEditingRolesId] = useState<string | null>(null);
  const [customFormName, setCustomFormName] = useState('');
  const [customFormPositions, setCustomFormPositions] = useState<string[]>([]);
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);

  function handleSaveTeam() {
    if (!teamName.trim()) return;
    if (team) {
      dispatch({ type: 'UPDATE_TEAM', team: { ...team, name: teamName.trim() } });
    } else {
      dispatch({
        type: 'ADD_TEAM',
        team: {
          id: generateId(),
          name: teamName.trim(),
          format: '7v7',
          players: [],
          savedFormations: [],
          createdAt: Date.now(),
        },
      });
    }
    onContinue();
  }

  function handleFormatChange(format: '5v5' | '7v7' | '9v9') {
    if (!team) return;
    dispatch({ type: 'UPDATE_TEAM', team: { ...team, format, defaultFormationId: getDefaultFormation(format).id } });
  }

  function handleFormationChange(fid: string) {
    if (!team) return;
    dispatch({ type: 'UPDATE_TEAM', team: { ...team, defaultFormationId: fid } });
  }

  function beginCustomFormation() {
    if (!team) return;
    const playerCount = team.format === '5v5' ? 5 : team.format === '7v7' ? 7 : 9;
    setCustomFormName(`Egendefinert ${team.savedFormations.length + 1}`);
    setCustomFormPositions([
      'Keeper',
      ...Array.from({ length: playerCount - 1 }, (_, i) => `Spiller ${i + 2}`),
    ]);
    setIsCreatingCustom(true);
  }

  function updateCustomPosition(idx: number, value: string) {
    setCustomFormPositions(prev => prev.map((p, i) => (i === idx ? value : p)));
  }

  function saveCustomFormation() {
    if (!team) return;
    const trimmedName = customFormName.trim();
    const positions = customFormPositions.map(p => p.trim()).filter(Boolean);
    const needed = team.format === '5v5' ? 5 : team.format === '7v7' ? 7 : 9;
    if (!trimmedName || positions.length !== needed) return;
    const id = `custom-${generateId()}`;
    const newFormation = {
      id,
      name: trimmedName,
      format: team.format,
      positions,
      isCustom: true,
    };
    dispatch({
      type: 'UPDATE_TEAM',
      team: {
        ...team,
        savedFormations: [...team.savedFormations, newFormation],
        defaultFormationId: id,
      },
    });
    setIsCreatingCustom(false);
  }

  function handleAddPlayer() {
    if (!team || !newPlayerName.trim()) return;
    const newPlayer: Player = { id: generateId(), name: newPlayerName.trim(), roles: [] };
    dispatch({ type: 'UPDATE_TEAM', team: { ...team, players: [...team.players, newPlayer] } });
    setNewPlayerName('');
  }

  function handleRemovePlayer(pid: string) {
    if (!team) return;
    dispatch({ type: 'UPDATE_TEAM', team: { ...team, players: team.players.filter(p => p.id !== pid) } });
  }

  function handleToggleRole(pid: string, role: PlayerRole) {
    if (!team) return;
    const updated = team.players.map(p => {
      if (p.id !== pid) return p;
      const roles = p.roles ?? [];
      const next = roles.includes(role) ? roles.filter(r => r !== role) : [...roles, role];
      return { ...p, roles: next };
    });
    dispatch({ type: 'UPDATE_TEAM', team: { ...team, players: updated } });
  }

  const formation = team ? (
    team.defaultFormationId
      ? getFormationsForFormat(team.format).find(f => f.id === team.defaultFormationId) ?? getDefaultFormation(team.format)
      : getDefaultFormation(team.format)
  ) : null;

  if (step === 'team') {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <div className="mb-6">
          <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
            Steg 1 av 4
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mt-1">Hva heter laget ditt?</h1>
          <p className="text-gray-500 text-sm mt-1">
            Gi laget et navn — for eksempel årskull og kjønn. Du kan endre dette senere.
          </p>
        </div>

        <form onSubmit={e => { e.preventDefault(); handleSaveTeam(); }}
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Lagnavn</label>
          <input
            type="text"
            value={teamName}
            onChange={e => setTeamName(e.target.value)}
            placeholder="Våganes J2015"
            enterKeyHint="next"
            autoFocus={!team}
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-lg mb-6 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />

          {team && (
            <>
              <label className="block text-xs font-semibold text-gray-500 mb-2">Kampstruktur</label>
              <div className="grid grid-cols-3 gap-2 mb-6">
                {(['5v5', '7v7', '9v9'] as const).map(f => (
                  <button
                    type="button"
                    key={f}
                    onClick={() => handleFormatChange(f)}
                    className={`py-3 rounded-xl font-bold text-lg transition-colors ${
                      team.format === f
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {f}
                    <div className="text-[10px] font-normal opacity-80 mt-0.5">
                      {f === '5v5' ? '6–9 år' : f === '7v7' ? '10–12 år' : '13 år'}
                    </div>
                  </button>
                ))}
              </div>

              <label className="block text-xs font-semibold text-gray-500 mb-2">Foretrukket formasjon</label>
              <div className="flex gap-2 flex-wrap mb-3">
                {[...getFormationsForFormat(team.format), ...team.savedFormations.filter(f => f.format === team.format)].map(f => (
                  <button
                    type="button"
                    key={f.id}
                    onClick={() => handleFormationChange(f.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      (team.defaultFormationId ?? getDefaultFormation(team.format).id) === f.id
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {f.name}{f.isCustom && <span className="opacity-60 text-[10px] ml-1">egendef.</span>}
                  </button>
                ))}
                {!isCreatingCustom && (
                  <button
                    type="button"
                    onClick={beginCustomFormation}
                    className="px-4 py-2 rounded-lg text-sm font-semibold bg-white text-[var(--color-primary)] border border-dashed border-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]">
                    + Egendefinert
                  </button>
                )}
              </div>
              {isCreatingCustom && (
                <div className="mb-6 bg-[var(--color-primary-soft)] border border-[var(--color-primary)] rounded-xl p-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Navn på formasjon</label>
                  <input
                    type="text"
                    value={customFormName}
                    onChange={e => setCustomFormName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Posisjoner ({customFormPositions.length} / {team.format === '5v5' ? 5 : team.format === '7v7' ? 7 : 9})
                  </label>
                  <p className="text-[11px] text-gray-500 mb-2">
                    Første posisjon må være keeper. De andre kan hete hva du vil (f.eks. «Libero», «Sjetteback»).
                  </p>
                  <div className="space-y-1.5 mb-3">
                    {customFormPositions.map((pos, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-mono w-6 text-right">{idx + 1}.</span>
                        <input
                          type="text"
                          value={pos}
                          onChange={e => updateCustomPosition(idx, e.target.value)}
                          disabled={idx === 0}
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={saveCustomFormation}
                      disabled={!customFormName.trim() || customFormPositions.some(p => !p.trim())}
                      className="bg-[var(--color-primary)] text-white py-2 px-4 rounded-lg text-sm font-semibold disabled:opacity-40">
                      Lagre formasjon
                    </button>
                    <button type="button" onClick={() => setIsCreatingCustom(false)}
                      className="bg-white border border-gray-300 text-gray-700 py-2 px-4 rounded-lg text-sm font-semibold">
                      Avbryt
                    </button>
                  </div>
                </div>
              )}

              {formation && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="text-xs text-gray-500 mb-2 font-semibold">
                    Forhåndsvisning: {formation.name}
                  </div>
                  <div className="flex items-center justify-center text-xs text-gray-500">
                    {formation.positions.length} spillere: {formation.positions.join(' · ')}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={!teamName.trim()}
              className="flex-1 bg-[var(--color-primary)] text-white py-3 rounded-xl text-lg font-semibold disabled:opacity-40">
              Neste — legg til spillere
            </button>
          </div>
        </form>
      </div>
    );
  }

  // step === 'players'
  if (!team || !formation) {
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-8">
        <p className="text-gray-500">Opprett laget først.</p>
        <button onClick={() => onGoToSection('opprett')} className="text-[var(--color-primary)] text-sm mt-2">
          ← Til Opprett lag
        </button>
      </div>
    );
  }

  const minPlayers = formation.positions.length;
  const keeperCount = team.players.filter(p => p.roles?.includes('keeper')).length;
  const fieldCount = team.players.filter(p => !p.roles?.includes('keeper') || p.roles.length > 1).length;
  const sorted = [...team.players].sort((a, b) => a.name.localeCompare(b.name, 'nb'));

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          Steg 2 av 4 — {team.name} · {team.format}
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mt-1">Legg til spillerne</h1>
        <p className="text-gray-500 text-sm mt-1">
          Minst {minPlayers} spillere trengs for å starte en {team.format}-kamp. Roller er valgfritt — tom = alle roller.
        </p>
      </div>

      <div className="grid grid-cols-[1fr_260px] gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
          <form onSubmit={e => { e.preventDefault(); handleAddPlayer(); }} className="flex gap-2 mb-4">
            <input
              type="text"
              value={newPlayerName}
              onChange={e => setNewPlayerName(e.target.value)}
              placeholder="Spillernavn"
              autoFocus
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
            <button
              type="submit"
              disabled={!newPlayerName.trim()}
              className="bg-[var(--color-primary)] text-white px-5 py-3 rounded-xl font-semibold disabled:opacity-40">
              + Legg til
            </button>
          </form>

          <div className="text-xs text-gray-500 mb-2">
            {team.players.length} {team.players.length === 1 ? 'spiller' : 'spillere'}
          </div>

          {sorted.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Ingen spillere lagt til ennå.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sorted.map(p => {
                const initials = p.name.split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();
                const isEditingRoles = editingRolesId === p.id;
                const roles = p.roles ?? [];
                return (
                  <li key={p.id} className="py-3">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                        {initials || '?'}
                      </span>
                      <span className="flex-1 font-medium text-gray-900">{p.name}</span>
                      <div className="flex gap-1">
                        {roles.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">alle roller</span>
                        ) : (
                          roles.map(r => (
                            <span key={r} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                              r === 'keeper' ? 'bg-[var(--color-keeper)] text-[var(--color-keeper-ink)]' : 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]'
                            }`}>{ROLE_LABELS[r]}</span>
                          ))
                        )}
                      </div>
                      <button onClick={() => setEditingRolesId(isEditingRoles ? null : p.id)}
                        className="text-xs text-[var(--color-primary)] hover:underline px-2 py-1">
                        {isEditingRoles ? 'Lukk' : roles.length === 0 ? '+ Legg til rolle' : 'Endre roller'}
                      </button>
                      <button onClick={() => handleRemovePlayer(p.id)}
                        className="text-xs text-gray-400 hover:text-red-500 px-2 py-1">Fjern</button>
                    </div>
                    {isEditingRoles && (
                      <div className="mt-2 ml-11 flex gap-2 flex-wrap">
                        {(Object.keys(ROLE_LABELS) as PlayerRole[]).map(r => (
                          <label key={r} className="inline-flex items-center gap-1.5 text-sm cursor-pointer">
                            <input type="checkbox" checked={roles.includes(r)} onChange={() => handleToggleRole(p.id, r)}
                              className="w-4 h-4 rounded border-gray-300 text-[var(--color-primary)]" />
                            {ROLE_LABELS[r]}
                          </label>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex gap-2 mt-6">
            <button onClick={() => onGoToSection('opprett')}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold">← Tilbake</button>
            <button
              onClick={onContinue}
              disabled={team.players.length < minPlayers}
              className="flex-1 bg-[var(--color-primary)] text-white py-3 rounded-xl font-semibold disabled:opacity-40">
              {team.players.length < minPlayers ? `Trenger ${minPlayers - team.players.length} til` : 'Til kamper →'}
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Status</div>
            <div className="text-3xl font-bold text-gray-900">
              {team.players.length}
              <span className="text-lg text-gray-400 font-normal"> / {minPlayers} minimum</span>
            </div>
            <div className={`text-xs mt-1 font-semibold ${team.players.length >= minPlayers ? 'text-green-600' : 'text-gray-400'}`}>
              {team.players.length >= minPlayers ? '✓ Klar for kamp' : 'Legg til flere spillere'}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Roller</div>
            <div className="flex items-center justify-between text-sm py-1">
              <span className="text-gray-700">Keepere</span>
              <span className="font-semibold text-gray-900">{keeperCount}</span>
            </div>
            <div className="flex items-center justify-between text-sm py-1">
              <span className="text-gray-700">Utespillere</span>
              <span className="font-semibold text-gray-900">{fieldCount}</span>
            </div>
            <p className="text-xs text-gray-400 mt-2 leading-snug">
              Merk spillere som keeper for å få dem satt til keeper-posisjonen som standard i planleggeren.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
