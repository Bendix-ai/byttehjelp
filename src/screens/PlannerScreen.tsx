import { useCallback, useEffect, useState } from 'react';
import { DndContext, type DragEndEvent, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useAppState } from '../store/AppContext';
import type { Draft, Formation, Team } from '../types';
import { generateId } from '../utils/id';
import { DEFAULT_FORMATIONS, getDefaultFormation, getFormationsForFormat } from '../constants/formations';
import { buildHalf, copyForward, recomputeAllBenches } from '../utils/plan';
import { PlayerPicker } from '../components/PlayerPicker';
import { MatchPlayerSelector } from '../components/MatchPlayerSelector';
import { FieldPitch } from '../components/FieldPitch';
import { PlayingTimeRail } from '../components/PlayingTimeRail';
import { PeriodTable } from '../components/PeriodTable';
import { MatchPrintView, generateTextSummary } from '../components/MatchPrintView';

function BenchChip({ pid, name, interactive }: { pid: string; name: string; interactive: boolean }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `bench:${pid}`,
    data: { playerId: pid, fromBench: true },
    disabled: !interactive,
  });
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      className={`text-sm py-1 px-2 rounded ${interactive ? 'cursor-grab active:cursor-grabbing hover:bg-gray-50' : ''} ${isDragging ? 'opacity-40' : ''}`}
      style={{ touchAction: 'none' }}>
      {name}
    </div>
  );
}

function BenchDropZone({ children, interactive }: { children: React.ReactNode; interactive: boolean }) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'bench-zone',
    disabled: !interactive,
  });
  return (
    <div ref={setNodeRef}
      className={`bg-white rounded-xl p-4 border shadow-sm transition-colors ${
        isOver ? 'border-[var(--color-primary)] bg-[var(--color-primary-soft)]' : 'border-gray-200'
      }`}>
      {children}
    </div>
  );
}

interface Props {
  matchId: string | null;
  onStartMatch: () => void;
  onGoToMatches: () => void;
}

function getFormation(team: Team): Formation {
  if (team.defaultFormationId) {
    const f = [...DEFAULT_FORMATIONS, ...team.savedFormations].find(f => f.id === team.defaultFormationId);
    if (f) return f;
  }
  return getDefaultFormation(team.format);
}

export function PlannerScreen({ matchId, onStartMatch, onGoToMatches }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );
  const { state, dispatch } = useAppState();
  const team = state.teams[0] ?? null;
  const match = matchId ? state.matches.find(m => m.id === matchId) ?? null : null;
  const isFrozen = !!match && match.status !== 'planning';
  const activeDraft: Draft | null = match
    ? (match.drafts.find(d => d.id === match.activeDraftId) ?? match.drafts[0] ?? null)
    : null;
  const displayPlan: Draft | null = isFrozen ? (match?.livePlan ?? activeDraft) : activeDraft;

  const [activeHalf, setActiveHalf] = useState<0 | 1>(0);
  const [activePeriodIdx, setActivePeriodIdx] = useState(0);
  const [view, setView] = useState<'pitch' | 'table'>('table');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [intervalMin, setIntervalMin] = useState(displayPlan?.intervalMinutes ?? 7.5);
  const [halfDuration, setHalfDuration] = useState(displayPlan?.halfDurationMinutes ?? 30);
  const [keeperLocked, setKeeperLocked] = useState(displayPlan?.keeperLocked ?? true);
  const [opponentName, setOpponentName] = useState(match?.opponentName ?? '');
  const [pickerCell, setPickerCell] = useState<{ halfIdx: number; periodIdx: number; position: string } | null>(null);
  const [showDraftPlayerEditor, setShowDraftPlayerEditor] = useState(false);
  const [draftDialog, setDraftDialog] = useState<{ mode: 'create' | 'rename'; value: string } | null>(null);
  const [pendingDraftDelete, setPendingDraftDelete] = useState<string | null>(null);

  // Sync locals when match/draft changes
  useEffect(() => {
    if (!displayPlan || !match) return;
    setIntervalMin(displayPlan.intervalMinutes);
    setHalfDuration(displayPlan.halfDurationMinutes);
    setKeeperLocked(displayPlan.keeperLocked);
    setOpponentName(match.opponentName);
    setActiveHalf(0);
    setActivePeriodIdx(0);
    setPickerCell(null);
  }, [matchId, match?.activeDraftId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset active period if half changes and current idx is out of range
  useEffect(() => {
    if (!displayPlan) return;
    const count = displayPlan.halves[activeHalf]?.periods.length ?? 0;
    if (activePeriodIdx >= count) setActivePeriodIdx(0);
  }, [activeHalf, displayPlan, activePeriodIdx]);

  // Debounced opponent sync to match
  useEffect(() => {
    if (!match) return;
    if (opponentName === match.opponentName) return;
    const trimmed = opponentName.trim();
    if (!trimmed) return;
    const handle = setTimeout(() => {
      dispatch({ type: 'UPDATE_MATCH', match: { ...match, opponentName: trimmed } });
    }, 400);
    return () => clearTimeout(handle);
  }, [opponentName, match, dispatch]);

  const formation = team ? getFormation(team) : null;
  const playerMap = new Map<string, string>(team?.players.map(p => [p.id, p.name]) ?? []);

  function writeActiveDraft(newDraft: Draft) {
    if (!match) return;
    const drafts = match.drafts.map(d => d.id === newDraft.id ? { ...newDraft, updatedAt: Date.now() } : d);
    dispatch({ type: 'UPDATE_MATCH', match: { ...match, drafts } });
  }

  function handleRegeneratePeriods() {
    if (!activeDraft || !formation || isFrozen) return;
    const d = structuredClone(activeDraft);
    d.intervalMinutes = intervalMin;
    d.halfDurationMinutes = halfDuration;
    d.keeperLocked = keeperLocked;
    for (let h = 0; h < 2; h++) {
      const old = d.halves[h as 0 | 1];
      const nw = buildHalf(halfDuration, intervalMin, formation.positions);
      if (old.periods.length > 0 && nw.periods.length > 0) {
        for (const pos of formation.positions) {
          if (old.periods[0].positions[pos]) nw.periods[0].positions[pos] = old.periods[0].positions[pos];
        }
      }
      copyForward(nw);
      recomputeAllBenches(nw, d.availablePlayerIds);
      d.halves[h as 0 | 1] = nw;
    }
    writeActiveDraft(d);
  }

  const handleAssignPlayer = useCallback((halfIdx: number, periodIdx: number, position: string, playerId: string) => {
    if (!activeDraft || !formation || isFrozen) return;
    const d = structuredClone(activeDraft);
    const half = d.halves[halfIdx as 0 | 1];
    const period = half.periods[periodIdx];
    const keeperPos = formation.positions[0];

    const changes: Array<{ pos: string; from: string; to: string }> = [];

    if (!playerId) {
      const prevHolder = period.positions[position];
      period.positions[position] = '';
      changes.push({ pos: position, from: prevHolder, to: '' });
    } else {
      const prevHolder = period.positions[position];
      const sourceEntry = Object.entries(period.positions).find(([p, id]) => id === playerId && p !== position);

      if (sourceEntry) {
        period.positions[sourceEntry[0]] = prevHolder;
        period.positions[position] = playerId;
        changes.push({ pos: position, from: prevHolder, to: playerId });
        changes.push({ pos: sourceEntry[0], from: playerId, to: prevHolder });
      } else {
        period.positions[position] = playerId;
        changes.push({ pos: position, from: prevHolder, to: playerId });
      }
    }

    if (playerId && keeperLocked && position === keeperPos) {
      for (const p of half.periods) {
        for (const pos of Object.keys(p.positions)) {
          if (p.positions[pos] === playerId && pos !== keeperPos) {
            p.positions[pos] = '';
          }
        }
        p.positions[keeperPos] = playerId;
      }
      copyForward(half);
    } else {
      for (let k = periodIdx + 1; k < half.periods.length; k++) {
        const future = half.periods[k];
        for (const change of changes) {
          if (future.positions[change.pos] === change.from) {
            future.positions[change.pos] = change.to;
          }
        }
      }
    }

    recomputeAllBenches(half, d.availablePlayerIds);
    writeActiveDraft(d);
    setPickerCell(null);
  }, [activeDraft, match, dispatch, keeperLocked, formation, isFrozen]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCopyForward() {
    if (!activeDraft || isFrozen) return;
    const d = structuredClone(activeDraft);
    const half = d.halves[activeHalf];
    if (half.periods.length < 2) return;
    const src = half.periods[0].positions;
    for (let i = 1; i < half.periods.length; i++) {
      half.periods[i].positions = { ...src };
    }
    recomputeAllBenches(half, d.availablePlayerIds);
    writeActiveDraft(d);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || !activeDraft || isFrozen) return;

    const activeData = active.data.current as { playerId?: string; fromPosition?: string; fromBench?: boolean } | undefined;
    const overData = over.data.current as { position?: string } | undefined;
    const playerId = activeData?.playerId;
    if (!playerId) return;

    // Dropped on bench zone → remove from position
    if (over.id === 'bench-zone') {
      if (activeData?.fromPosition) {
        handleAssignPlayer(activeHalf, activePeriodIdx, activeData.fromPosition, '');
      }
      return;
    }

    // Dropped on a position slot → assign (handleAssignPlayer handles swap)
    if (overData?.position) {
      handleAssignPlayer(activeHalf, activePeriodIdx, overData.position, playerId);
    }
  }

  function handleSelectDraft(draftId: string) {
    if (!match || isFrozen) return;
    dispatch({ type: 'UPDATE_MATCH', match: { ...match, activeDraftId: draftId } });
  }

  function openCreateDraftDialog() {
    if (!match || !activeDraft || isFrozen) return;
    setDraftDialog({ mode: 'create', value: `Variant ${match.drafts.length + 1}` });
  }

  function openRenameDraftDialog() {
    if (!match || !activeDraft || isFrozen) return;
    setDraftDialog({ mode: 'rename', value: activeDraft.name });
  }

  function confirmDraftDialog() {
    if (!match || !activeDraft || !draftDialog) return;
    const trimmed = draftDialog.value.trim();
    if (!trimmed) return;
    const now = Date.now();
    if (draftDialog.mode === 'create') {
      const copy: Draft = { ...structuredClone(activeDraft), id: generateId(), name: trimmed, createdAt: now, updatedAt: now };
      dispatch({ type: 'UPDATE_MATCH', match: { ...match, drafts: [...match.drafts, copy], activeDraftId: copy.id } });
    } else {
      if (trimmed !== activeDraft.name) {
        const drafts = match.drafts.map(d => d.id === activeDraft.id ? { ...d, name: trimmed, updatedAt: now } : d);
        dispatch({ type: 'UPDATE_MATCH', match: { ...match, drafts } });
      }
    }
    setDraftDialog(null);
  }

  function handleRequestDeleteDraft() {
    if (!match || !activeDraft || isFrozen) return;
    if (match.drafts.length <= 1) return;
    setPendingDraftDelete(activeDraft.id);
  }

  function confirmDeleteDraft() {
    if (!match || !pendingDraftDelete) return;
    const drafts = match.drafts.filter(d => d.id !== pendingDraftDelete);
    if (drafts.length === 0) { setPendingDraftDelete(null); return; }
    dispatch({ type: 'UPDATE_MATCH', match: { ...match, drafts, activeDraftId: drafts[0].id } });
    setPendingDraftDelete(null);
  }

  function handlePrint() {
    setShowShareMenu(false);
    window.print();
  }

  function handleCopyText() {
    if (!team || !match || !displayPlan || !formation) return;
    const text = generateTextSummary(team, match, displayPlan, formation, playerMap);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
    setShowShareMenu(false);
  }

  function handleResetMatch() {
    if (!match || !isFrozen) return;
    const reset: typeof match = {
      ...match,
      status: 'planning',
      livePlan: undefined,
      result: undefined,
    };
    dispatch({ type: 'UPDATE_MATCH', match: reset });
    setShowResetConfirm(false);
  }

  function handleUpdateDraftPlayers(newIds: string[]) {
    if (!match || !activeDraft || isFrozen) return;
    const d = structuredClone(activeDraft);
    d.availablePlayerIds = newIds;
    const allowed = new Set(newIds);
    for (const half of d.halves) {
      for (const period of half.periods) {
        for (const [pos, pid] of Object.entries(period.positions)) {
          if (pid && !allowed.has(pid)) period.positions[pos] = '';
        }
      }
      recomputeAllBenches(half, newIds);
    }
    writeActiveDraft(d);
    setShowDraftPlayerEditor(false);
  }

  if (!team) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Opprett et lag først.</p>
      </div>
    );
  }

  if (!match || !activeDraft || !displayPlan || !formation) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl p-10 text-center border border-gray-200">
          <p className="text-gray-500 mb-4">Ingen kamp valgt. Gå til Kamper for å opprette eller velge en.</p>
          <button onClick={onGoToMatches}
            className="bg-[var(--color-primary)] text-white px-5 py-2 rounded-xl font-semibold">
            Gå til Kamper
          </button>
        </div>
      </div>
    );
  }

  const allFormations = [...getFormationsForFormat(team.format), ...team.savedFormations.filter(f => f.format === team.format)];
  const half = displayPlan.halves[activeHalf];
  const period1HasPlayers = Object.values(half.periods[0]?.positions ?? {}).some(Boolean);

  return (
    <>
    {/* Print-only view */}
    {displayPlan && formation && (
      <MatchPrintView team={team} match={match} draft={displayPlan} formation={formation} playerMap={playerMap} />
    )}

    <div className="max-w-6xl mx-auto p-8 print-hide">
      {/* Header + breadcrumb */}
      <div className="mb-4">
        <div className="text-xs text-gray-500">
          <button onClick={onGoToMatches} className="hover:text-[var(--color-primary)]">Kamper</button>
          <span className="mx-1.5">›</span>
          <span>vs {match.opponentName}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {team.name} <span className="text-gray-400 font-normal">vs</span> {match.opponentName}
            </h1>
            <div className="text-sm text-gray-500 mt-0.5">
              {match.format} · {match.date}
              {isFrozen && (
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full font-medium ${
                  match.status === 'live' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {match.status === 'live' ? 'Live' : 'Ferdigspilt'}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 relative">
            <div className="relative">
              <button onClick={() => setShowShareMenu(!showShareMenu)}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-3 rounded-xl font-semibold hover:bg-gray-50">
                {copied ? '✓ Kopiert!' : 'Del / Eksporter'}
              </button>
              {showShareMenu && (
                <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-lg z-10">
                  <button onClick={handlePrint}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-t-xl border-b border-gray-100">
                    Skriv ut / Lagre som PDF
                  </button>
                  <button onClick={handleCopyText}
                    className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-b-xl">
                    Kopier tekstoppsummering
                  </button>
                </div>
              )}
            </div>
            <button onClick={onStartMatch}
              className="bg-green-600 text-white px-5 py-3 rounded-xl font-semibold text-lg">
              {match.status === 'planning' ? '▶ Start kamp' : 'Åpne kamp ⏱'}
            </button>
          </div>
        </div>
      </div>

      {/* Drafts tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-4 overflow-x-auto">
        {match.drafts.map(d => (
          <button key={d.id} onClick={() => handleSelectDraft(d.id)}
            disabled={isFrozen}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
              d.id === match.activeDraftId
                ? 'text-[var(--color-primary)] border-[var(--color-primary)]'
                : 'text-gray-500 border-transparent hover:text-gray-700 disabled:opacity-50'
            }`}>
            {d.name}
          </button>
        ))}
        {!isFrozen && (
          <button onClick={openCreateDraftDialog}
            className="px-3 py-2 text-sm font-medium text-gray-500 hover:text-[var(--color-primary)] whitespace-nowrap">
            + Ny draft
          </button>
        )}
        <div className="ml-auto flex gap-1">
          {!isFrozen && (
            <>
              <button onClick={() => setShowDraftPlayerEditor(true)}
                className="text-xs text-[var(--color-primary)] px-2 py-1">
                Spillere ({activeDraft.availablePlayerIds.length})
              </button>
              <button onClick={openRenameDraftDialog}
                className="text-xs text-gray-500 hover:text-[var(--color-primary)] px-2 py-1">Gi nytt navn</button>
              {match.drafts.length > 1 && (
                <button onClick={handleRequestDeleteDraft}
                  className="text-xs text-gray-400 hover:text-red-500 px-2 py-1">Slett draft</button>
              )}
            </>
          )}
          {isFrozen && (
            <button onClick={() => setShowResetConfirm(true)}
              className="text-xs text-gray-500 hover:text-[var(--color-primary)] px-2 py-1 italic">
              Kampen er {match.status === 'live' ? 'live' : 'ferdigspilt'} — Tilbakestill til planlegger
            </button>
          )}
        </div>
      </div>

      {showResetConfirm && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-yellow-900 flex-1 min-w-0">
            Tilbakestille kampen til planleggingsmodus? Den frosne planen (livePlan) slettes, men draftene beholdes.
            {match.result && <span className="block mt-1 text-xs">Resultat {match.result.home}–{match.result.away} blir også fjernet.</span>}
          </span>
          <button onClick={handleResetMatch}
            className="bg-yellow-500 hover:bg-yellow-600 text-white py-1.5 px-4 rounded-lg text-sm font-semibold">
            Ja, tilbakestill
          </button>
          <button onClick={() => setShowResetConfirm(false)}
            className="bg-gray-100 text-gray-700 py-1.5 px-4 rounded-lg text-sm font-semibold">Avbryt</button>
        </div>
      )}

      {/* Draft dialog / delete */}
      {draftDialog && (
        <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-200 mb-4">
          <form onSubmit={e => { e.preventDefault(); confirmDraftDialog(); }} className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-semibold whitespace-nowrap">
              {draftDialog.mode === 'create' ? 'Navn på ny draft:' : 'Nytt navn:'}
            </label>
            <input type="text" value={draftDialog.value}
              onChange={e => setDraftDialog({ ...draftDialog, value: e.target.value })}
              autoFocus
              className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]" />
            <button type="submit" disabled={!draftDialog.value.trim()}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[var(--color-primary)] text-white disabled:opacity-40">
              {draftDialog.mode === 'create' ? 'Opprett' : 'Lagre'}
            </button>
            <button type="button" onClick={() => setDraftDialog(null)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700">Avbryt</button>
          </form>
        </div>
      )}
      {pendingDraftDelete && (
        <div className="bg-red-50 rounded-xl p-3 mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-red-900">
            Slette draft «{match.drafts.find(d => d.id === pendingDraftDelete)?.name}»?
          </span>
          <button onClick={confirmDeleteDraft}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-600 text-white">Slett</button>
          <button onClick={() => setPendingDraftDelete(null)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gray-100 text-gray-700">Avbryt</button>
        </div>
      )}

      {/* Settings row */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-semibold">Motstander</label>
            <input type="text" value={opponentName} onChange={e => setOpponentName(e.target.value)} placeholder="Motstander"
              disabled={isFrozen}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50 disabled:text-gray-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-semibold">Bytteintervall (min)</label>
            <input type="number" value={intervalMin} onChange={e => setIntervalMin(Number(e.target.value) || 1)} min={1} max={45} step={0.5}
              disabled={isFrozen}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50 disabled:text-gray-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1 font-semibold">Omgangslengde (min)</label>
            <input type="number" value={halfDuration} onChange={e => setHalfDuration(Number(e.target.value) || 1)} min={1} max={45}
              disabled={isFrozen}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:bg-gray-50 disabled:text-gray-500" />
          </div>
          <div>
            <button onClick={handleRegeneratePeriods} disabled={isFrozen}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold text-sm disabled:opacity-40">
              Oppdater perioder
            </button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={keeperLocked} onChange={e => setKeeperLocked(e.target.checked)} disabled={isFrozen}
              className="w-5 h-5 rounded border-gray-300 text-[var(--color-primary)]" />
            <span className="text-sm text-gray-700">Keeper spiller hele omgangen</span>
          </label>
          <div className="flex gap-1 ml-auto">
            {allFormations.map(f => (
              <button key={f.id} onClick={() => {
                if (team && !isFrozen) dispatch({ type: 'UPDATE_TEAM', team: { ...team, defaultFormationId: f.id } });
              }}
                disabled={isFrozen}
                className={`px-2 py-1 rounded text-xs font-medium ${
                  (team.defaultFormationId ?? getDefaultFormation(team.format).id) === f.id
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-gray-100 text-gray-500'
                } disabled:opacity-50`}>{f.name}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Half tabs */}
      <div className="flex gap-2 mb-3">
        {([0, 1] as const).map(i => (
          <button key={i} onClick={() => setActiveHalf(i)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold ${
              activeHalf === i ? 'bg-[var(--color-primary)] text-white' : 'bg-gray-200 text-gray-600'
            }`}>
            {i === 0 ? '1. omgang' : '2. omgang'}
          </button>
        ))}
      </div>

      {/* Pitch view + rail */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div>
          {/* Period tabs + instruction */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <div className="flex gap-1 flex-wrap flex-1 min-w-0">
              {half.periods.map((p, pi) => (
                <button key={pi} onClick={() => setActivePeriodIdx(pi)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    pi === activePeriodIdx
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  P{pi + 1} · {p.startMinute}–{p.endMinute}′
                </button>
              ))}
            </div>
            {period1HasPlayers && half.periods.length > 1 && !isFrozen && (
              <button onClick={handleCopyForward}
                className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-lg hover:bg-gray-200 whitespace-nowrap">
                Kopier P1 → alle
              </button>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <p className="text-xs text-gray-400 flex-1 min-w-0">
              {!period1HasPlayers
                ? 'Klikk på posisjonene på banen for å sette opp startoppstillingen (periode 1).'
                : view === 'pitch'
                  ? 'Rødt = denne spilleren byttes ut. Grønt = kommet inn fra forrige.'
                  : 'Klikk en celle for å tildele. Grønn kolonne = endring i perioden.'}
            </p>
            <div className="flex bg-gray-100 rounded-lg p-0.5 shrink-0">
              <button onClick={() => setView('pitch')}
                className={`text-xs font-semibold px-3 py-1 rounded-md transition-colors ${
                  view === 'pitch' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500'
                }`}>Bane</button>
              <button onClick={() => setView('table')}
                className={`text-xs font-semibold px-3 py-1 rounded-md transition-colors ${
                  view === 'table' ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-500'
                }`}>Tabell</button>
            </div>
          </div>

          {view === 'pitch' ? (
            <FieldPitch
              formation={formation}
              period={half.periods[activePeriodIdx] ?? half.periods[0]}
              prevPeriod={activePeriodIdx > 0 ? half.periods[activePeriodIdx - 1] : null}
              nextPeriod={activePeriodIdx < half.periods.length - 1 ? half.periods[activePeriodIdx + 1] : null}
              playerMap={playerMap}
              keeperLockedFromPrev={keeperLocked && activePeriodIdx > 0}
              interactive={!isFrozen}
              onCellClick={(position) => setPickerCell({ halfIdx: activeHalf, periodIdx: activePeriodIdx, position })}
            />
          ) : (
            <PeriodTable
              formation={formation}
              half={half}
              playerMap={playerMap}
              activePeriodIdx={activePeriodIdx}
              keeperLocked={keeperLocked}
              interactive={!isFrozen}
              onCellClick={(periodIdx, position) => setPickerCell({ halfIdx: activeHalf, periodIdx, position })}
              onJumpToPeriod={setActivePeriodIdx}
            />
          )}
        </div>

        <aside className="space-y-4">
          {/* Current period bench — droppable zone */}
          {(() => {
            const active = half.periods[activePeriodIdx] ?? half.periods[0];
            return (
              <BenchDropZone interactive={!isFrozen}>
                <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
                  På benken (P{activePeriodIdx + 1})
                </div>
                {active.bench.length === 0 ? (
                  <p className="text-xs text-gray-400">Alle spillere er på banen. Dra hit for å fjerne.</p>
                ) : (
                  <ul className="space-y-1">
                    {active.bench.map((pid, bi) => {
                      const next = activePeriodIdx + 1 < half.periods.length
                        ? Object.entries(half.periods[activePeriodIdx + 1].positions).find(([, id]) => id === pid)
                        : null;
                      const comingIn = !!next;
                      return (
                        <li key={`${pid}-${bi}`} className={`flex items-center justify-between rounded ${comingIn ? 'bg-[var(--color-sub-in)]' : ''}`}>
                          <BenchChip pid={pid} name={playerMap.get(pid) ?? '?'} interactive={!isFrozen} />
                          {comingIn && next && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-sub-in-ink)] pr-2">
                              Inn → {next[0]}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </BenchDropZone>
            );
          })()}

          {/* Playing time rail */}
          <PlayingTimeRail plan={displayPlan} playerMap={playerMap} />
        </aside>
      </div>
      </DndContext>

      {/* Draft player editor */}
      {showDraftPlayerEditor && formation && (
        <MatchPlayerSelector
          players={team.players}
          minPlayers={formation.positions.length}
          initiallySelected={activeDraft.availablePlayerIds}
          title={`Spillere i «${activeDraft.name}»`}
          confirmLabel="Lagre"
          onConfirm={handleUpdateDraftPlayers}
          onClose={() => setShowDraftPlayerEditor(false)}
        />
      )}

      {/* Player picker */}
      {pickerCell && displayPlan && formation && (
        <PlayerPicker
          players={team.players}
          currentPlayerId={displayPlan.halves[pickerCell.halfIdx as 0 | 1].periods[pickerCell.periodIdx].positions[pickerCell.position]}
          period={displayPlan.halves[pickerCell.halfIdx as 0 | 1].periods[pickerCell.periodIdx]}
          prevPeriod={pickerCell.periodIdx > 0 ? displayPlan.halves[pickerCell.halfIdx as 0 | 1].periods[pickerCell.periodIdx - 1] : null}
          position={pickerCell.position}
          onSelect={(pid) => handleAssignPlayer(pickerCell.halfIdx, pickerCell.periodIdx, pickerCell.position, pid)}
          onClose={() => setPickerCell(null)}
        />
      )}
    </div>
    </>
  );
}
