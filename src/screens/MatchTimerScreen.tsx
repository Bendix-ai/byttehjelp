import { useState, useEffect, useCallback, useRef, useMemo, type MutableRefObject } from 'react';
import { useAppState } from '../store/AppContext';
import type { TimerState } from '../types';
import { getSubstitutionDiff, calculatePlayingTime } from '../utils/substitution';

interface Props {
  matchId: string | null;
  onBack: () => void;
}

function pad2(n: number): string {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

export function MatchTimerScreen({ matchId, onBack }: Props) {
  const { state, dispatch } = useAppState();
  const match = matchId ? state.matches.find(m => m.id === matchId) : null;
  const plan = match ? (match.livePlan ?? match.drafts.find(d => d.id === match.activeDraftId) ?? match.drafts[0]) : null;

  const [timer, setTimer] = useState<TimerState>({
    halfIndex: 0,
    periodIndex: 0,
    startedAt: null,
    elapsedBeforePause: 0,
    isRunning: false,
  });
  const [elapsedMs, setElapsedMs] = useState(0);
  const [alertShown, setAlertShown] = useState<Set<string>>(new Set());
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [showLineup, setShowLineup] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef(timer) as MutableRefObject<TimerState>;
  timerRef.current = timer;

  const team = match ? state.teams.find(t => t.id === match.teamId) : null;
  const playerMap = useMemo(
    () => new Map(team?.players.map(p => [p.id, p.name]) ?? []),
    [team]
  );
  const jerseyMap = useMemo(() => {
    const m = new Map<string, number>();
    team?.players.forEach((p, i) => m.set(p.id, i + 1));
    return m;
  }, [team]);

  // Notification permission + audio preload
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    audioRef.current = new Audio('/alert.mp3');
    audioRef.current.load();
  }, []);

  // Wake lock while running
  useEffect(() => {
    async function requestWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch { /* ignore */ }
      }
    }
    if (timer.isRunning) requestWakeLock();
    return () => {
      wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, [timer.isRunning]);

  // Timer tick
  useEffect(() => {
    if (!timer.isRunning || timer.startedAt === null) return;
    const id = setInterval(() => {
      const now = Date.now();
      setElapsedMs(timer.elapsedBeforePause + (now - timer.startedAt!) * speedMultiplier);
    }, 250);
    return () => clearInterval(id);
  }, [timer.isRunning, timer.startedAt, timer.elapsedBeforePause, speedMultiplier]);

  const triggerAlert = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
    audioRef.current?.play().catch(() => {});
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Byttehjelp', {
        body: 'Tid for bytte!',
        tag: 'sub-alert',
        requireInteraction: true,
      });
    }
  }, []);

  // Auto-advance period at boundary
  useEffect(() => {
    if (!match || !plan || !timer.isRunning) return;
    const half = plan.halves[timer.halfIndex];
    const elapsedMin = elapsedMs / 60000;
    for (let i = 1; i < half.periods.length; i++) {
      const boundary = half.periods[i].startMinute;
      const key = `${timer.halfIndex}-${boundary}`;
      if (elapsedMin >= boundary && !alertShown.has(key)) {
        triggerAlert();
        setAlertShown(prev => new Set([...prev, key]));
        setTimer(prev => ({ ...prev, periodIndex: i }));
      }
    }
  }, [elapsedMs, match, plan, timer.halfIndex, timer.isRunning, alertShown, triggerAlert]);

  // Visibility change re-syncs timer
  useEffect(() => {
    const handler = () => {
      const t = timerRef.current;
      if (document.visibilityState === 'visible' && t.isRunning && t.startedAt) {
        setElapsedMs(t.elapsedBeforePause + (Date.now() - t.startedAt) * speedMultiplier);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [speedMultiplier]);

  if (!match || !team || !plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[var(--color-surface)]">
        <p className="text-gray-500 mb-6">Ingen kamp valgt. Opprett en kamp først.</p>
        <button onClick={onBack} className="text-[var(--color-primary)] font-semibold">← Tilbake</button>
      </div>
    );
  }

  const half = plan.halves[timer.halfIndex];
  const currentPeriod = half.periods[timer.periodIndex];
  const halfDurationMs = half.durationMinutes * 60000;
  const elapsedSec = Math.floor(elapsedMs / 1000);

  // Next period & countdown to next sub
  const nextPeriodIdx = timer.periodIndex + 1;
  const nextPeriod = nextPeriodIdx < half.periods.length ? half.periods[nextPeriodIdx] : null;
  const nextSubBoundaryMs = nextPeriod ? nextPeriod.startMinute * 60000 : null;
  const timeToNextSub = nextSubBoundaryMs !== null ? Math.max(0, nextSubBoundaryMs - elapsedMs) : null;
  const nextSubMin = timeToNextSub !== null ? Math.floor(timeToNextSub / 60000) : 0;
  const nextSubSec = timeToNextSub !== null ? Math.floor((timeToNextSub % 60000) / 1000) : 0;
  const isImminent = timeToNextSub !== null && timeToNextSub <= 60000 && timeToNextSub > 0;
  const isHalfDone = elapsedMs >= halfDurationMs;

  // What's just changed → currentPeriod (compute "ut/inn" for previous boundary)
  const prevPeriod = timer.periodIndex > 0 ? half.periods[timer.periodIndex - 1] : null;
  const diff = prevPeriod ? getSubstitutionDiff(prevPeriod.positions, currentPeriod.positions) : null;

  // Upcoming changes from current → next (filter out fresh-in players)
  const upcomingChanges = nextPeriod
    ? Object.keys(currentPeriod.positions)
        .filter(pos => currentPeriod.positions[pos] !== nextPeriod.positions[pos])
        .filter(pos => {
          const outgoing = currentPeriod.positions[pos];
          if (!outgoing || !diff) return true;
          return !diff.comingIn.has(outgoing);
        })
        .map(pos => ({
          position: pos,
          outgoing: currentPeriod.positions[pos],
          incoming: nextPeriod.positions[pos],
        }))
    : [];

  // Period meter — current period's progress fraction within itself
  const periodStartMs = currentPeriod.startMinute * 60000;
  const periodEndMs = currentPeriod.endMinute * 60000;
  const periodFrac = Math.min(1, Math.max(0, (elapsedMs - periodStartMs) / Math.max(1, periodEndMs - periodStartMs)));

  function handleStart() {
    setTimer(prev => ({ ...prev, isRunning: true, startedAt: Date.now() }));
    if (match!.status === 'planning') {
      const activeDraft = match!.drafts.find(d => d.id === match!.activeDraftId) ?? match!.drafts[0];
      dispatch({ type: 'UPDATE_MATCH', match: { ...match!, status: 'live', livePlan: structuredClone(activeDraft) } });
    }
  }

  function handlePause() {
    setTimer(prev => {
      const additional = prev.startedAt ? (Date.now() - prev.startedAt) * speedMultiplier : 0;
      return { ...prev, isRunning: false, elapsedBeforePause: prev.elapsedBeforePause + additional, startedAt: null };
    });
  }

  function handleSpeedChange(newSpeed: number) {
    if (newSpeed === speedMultiplier) return;
    if (timer.isRunning && timer.startedAt !== null) {
      const now = Date.now();
      const snapshot = timer.elapsedBeforePause + (now - timer.startedAt) * speedMultiplier;
      setTimer(prev => ({ ...prev, elapsedBeforePause: snapshot, startedAt: now }));
    }
    setSpeedMultiplier(newSpeed);
  }

  function handleConfirmSub() {
    if (!nextPeriod) return;
    if ('vibrate' in navigator) navigator.vibrate(50);
    setTimer(prev => ({ ...prev, periodIndex: prev.periodIndex + 1 }));
    const key = `${timer.halfIndex}-${nextPeriod.startMinute}`;
    setAlertShown(prev => new Set([...prev, key]));
  }

  function handleNextHalf() {
    setTimer({ halfIndex: 1, periodIndex: 0, startedAt: null, elapsedBeforePause: 0, isRunning: false });
    setElapsedMs(0);
    setAlertShown(new Set());
  }

  function handleEndMatch() {
    handlePause();
    dispatch({ type: 'UPDATE_MATCH', match: { ...match!, status: 'completed' } });
  }

  // Action button copy + style
  const actionLabel = !nextPeriod
    ? (timer.halfIndex === 0 ? 'Til 2. omgang' : 'Avslutt kamp')
    : isImminent ? 'Bekreft bytte nå' : 'Bekreft bytte';
  const actionHandler = !nextPeriod
    ? (timer.halfIndex === 0 ? handleNextHalf : handleEndMatch)
    : handleConfirmSub;
  const actionDisabled = !nextPeriod && !isHalfDone && timer.halfIndex === 0;
  const actionAccent = !nextPeriod
    ? (timer.halfIndex === 0 ? 'bg-[var(--color-primary)]' : 'bg-red-600')
    : isImminent ? 'bg-orange-500' : 'bg-[var(--color-primary)]';

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface)] text-slate-900"
         style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif' }}>

      {/* Top context band */}
      <div className="px-5 pt-3 pb-1.5 flex items-center justify-between gap-3 safe-area-top">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button onClick={onBack}
            aria-label="Tilbake"
            className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0 active:scale-95 transition-transform">
            <svg viewBox="0 0 14 14" className="w-3 h-5" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 1L1 7l6 6"/>
            </svg>
          </button>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-500 truncate">
              {match.opponentName}
            </p>
            <p className="text-[14px] font-semibold text-slate-900 truncate">
              {match.venue ? `${match.venue} · ` : ''}{match.kickoffTime ?? ''}
            </p>
          </div>
        </div>
        <div className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-[12px] font-semibold text-slate-600 tabular-nums shrink-0">
          {pad2(Math.floor(elapsedSec / 60))}:{pad2(elapsedSec % 60)} spilt
        </div>
        <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5 shrink-0" title="Demo-fart">
          {[1, 10, 60].map(s => (
            <button key={s} onClick={() => handleSpeedChange(s)}
              className={`text-[10px] font-bold px-1.5 py-1 rounded-md transition-colors ${
                speedMultiplier === s ? 'bg-white text-[var(--color-primary)] shadow-sm' : 'text-gray-400'
              }`}>
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Periode meter */}
      <div className="px-5 pt-2">
        <div className="flex justify-between mb-1.5">
          <span className="text-[12px] font-semibold text-gray-600">
            Periode {timer.periodIndex + 1} av {half.periods.length}
          </span>
          <span className="text-[12px] font-medium text-gray-400 tabular-nums">
            {timer.halfIndex === 0 ? '1. omgang' : '2. omgang'} · {currentPeriod.startMinute}'–{currentPeriod.endMinute}'
          </span>
        </div>
        <div className="flex gap-1 h-1">
          {half.periods.map((_, i) => (
            <div key={i} className="flex-1 rounded-full overflow-hidden"
                 style={{
                   background: i < timer.periodIndex ? 'var(--color-primary)'
                     : i === timer.periodIndex ? 'rgba(120,120,128,0.18)'
                     : 'rgba(120,120,128,0.18)',
                 }}>
              {i === timer.periodIndex && (
                <div className="h-full rounded-full"
                     style={{ width: `${periodFrac * 100}%`, background: 'var(--color-primary)' }}/>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* HERO countdown */}
      <div className="px-5 pt-6 pb-3 text-center relative">
        {isImminent && (
          <div className="absolute pointer-events-none rounded-[28px] border-2 border-orange-500 bh-pulse"
               style={{ inset: '14px 12px 4px' }} aria-hidden="true"/>
        )}
        <p className={`text-[11px] font-bold tracking-[1.2px] uppercase mb-1 ${
          isImminent ? 'text-orange-500' : 'text-gray-500'
        }`}>
          {!nextPeriod ? (isHalfDone ? 'Omgang ferdig' : 'Ingen flere bytter') : isImminent ? 'Bytte nå' : !timer.isRunning && elapsedMs > 0 ? 'Pauset · neste bytte' : 'Til neste bytte'}
        </p>
        <div className={`font-bold tabular-nums leading-none ${!timer.isRunning && elapsedMs > 0 ? 'text-gray-300' : 'text-slate-900'}`}
             style={{ fontSize: 92, letterSpacing: -3 }}>
          {nextPeriod
            ? `${pad2(nextSubMin)}:${pad2(nextSubSec)}`
            : `${pad2(Math.floor((halfDurationMs - elapsedMs) / 60000))}:${pad2(Math.floor(((halfDurationMs - elapsedMs) % 60000) / 1000))}`
          }
        </div>
      </div>

      {/* Bytte-kort */}
      <div className="px-4 flex flex-col gap-2.5">
        {!nextPeriod ? (
          <div className="rounded-2xl bg-white border border-gray-200 px-4 py-5 text-center">
            <p className="text-[13px] text-gray-500">
              {isHalfDone
                ? (timer.halfIndex === 0 ? 'Klar for andre omgang' : 'Kampen er ferdig')
                : 'Ingen flere bytter denne omgangen'}
            </p>
          </div>
        ) : upcomingChanges.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-200 px-4 py-5 text-center">
            <p className="text-[13px] text-gray-500">Ingen byttebevegelser ved neste periode</p>
          </div>
        ) : (
          upcomingChanges.map((c, i) => {
            const outName = c.outgoing ? playerMap.get(c.outgoing) ?? '?' : null;
            const inName = c.incoming ? playerMap.get(c.incoming) ?? '?' : null;
            const outNum = c.outgoing ? jerseyMap.get(c.outgoing) : null;
            const inNum = c.incoming ? jerseyMap.get(c.incoming) : null;
            return (
              <div key={`${c.position}-${i}`} className="flex gap-2.5 items-stretch">
                <SubCard kind="out" num={outNum} name={outName} pos={c.position}/>
                <div className="flex items-center justify-center w-4">
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                    <path d="M2 7h10M9 4l3 3-3 3" stroke="rgba(60,60,67,0.3)" strokeWidth="1.6"
                          fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <SubCard kind="in" num={inNum} name={inName} pos={c.position}/>
              </div>
            );
          })
        )}
      </div>

      {/* Spacer pushes action row toward bottom on tall screens */}
      <div className="flex-1 min-h-4"/>

      {/* Action row */}
      <div className="px-4 pt-3 flex flex-col gap-2.5">
        <button
          onClick={actionHandler}
          disabled={actionDisabled}
          className={`w-full h-14 rounded-2xl text-white text-[18px] font-bold flex items-center justify-center gap-2.5 active:scale-[0.98] transition-transform disabled:opacity-40 ${actionAccent}`}
          style={{ boxShadow: actionDisabled ? 'none' : isImminent ? '0 4px 14px rgba(255,149,0,0.35)' : '0 4px 14px rgba(30,64,175,0.32)' }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M3 9l4 4 8-8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {actionLabel}
        </button>

        <div className="flex gap-2.5">
          {!timer.isRunning ? (
            <button onClick={handleStart}
              className="flex-1 h-11 rounded-2xl bg-gray-100 text-slate-900 font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <svg width="14" height="14" viewBox="0 0 16 16"><path d="M4 3l9 5-9 5V3z" fill="currentColor"/></svg>
              {elapsedMs === 0 ? 'Start' : 'Fortsett'}
            </button>
          ) : (
            <button onClick={handlePause}
              className="flex-1 h-11 rounded-2xl bg-gray-100 text-slate-900 font-semibold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <svg width="14" height="14" viewBox="0 0 16 16">
                <rect x="4" y="3" width="3" height="10" rx="1" fill="currentColor"/>
                <rect x="9" y="3" width="3" height="10" rx="1" fill="currentColor"/>
              </svg>
              Pause
            </button>
          )}
          <button onClick={() => setShowLineup(prev => !prev)}
            className="flex-1 h-11 rounded-2xl bg-transparent text-[var(--color-primary)] font-semibold text-[15px] flex items-center justify-center gap-1 active:scale-[0.98] transition-transform">
            {showLineup ? 'Skjul oppstilling' : 'Vis oppstilling'}
          </button>
        </div>
      </div>

      {/* Lineup drawer (toggleable) */}
      {showLineup && (
        <div className="px-4 pt-4 pb-2 space-y-3">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500">
              På banen nå
            </div>
            {Object.entries(currentPeriod.positions).map(([pos, pid]) => {
              const name = pid ? playerMap.get(pid) ?? '?' : '–';
              const num = pid ? jerseyMap.get(pid) : null;
              let bg = '';
              if (diff && pid) {
                if (diff.comingIn.has(pid)) bg = 'bg-[var(--color-sub-in)] text-[var(--color-sub-in-ink)]';
                if (diff.goingOut.has(pid)) bg = 'bg-[var(--color-sub-out)] text-[var(--color-sub-out-ink)]';
              }
              return (
                <div key={pos} className={`flex items-center justify-between px-4 py-2.5 border-t border-gray-100 ${bg}`}>
                  <span className="text-[11px] font-semibold uppercase tracking-wide w-28 opacity-70">{pos}</span>
                  <span className="text-[14px] font-semibold tabular-nums flex items-center gap-2">
                    {num !== null && num !== undefined && <span className="opacity-60 text-[11px]">#{num}</span>}
                    <span>{name}</span>
                  </span>
                </div>
              );
            })}
          </div>

          {currentPeriod.bench.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500">Benk</div>
              {currentPeriod.bench.map((pid, i) => (
                <div key={pid} className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100">
                  <span className="text-[11px] text-gray-400">Innbytter {i + 1}</span>
                  <span className="text-[14px] font-medium tabular-nums flex items-center gap-2">
                    <span className="opacity-50 text-[11px]">#{jerseyMap.get(pid) ?? '?'}</span>
                    <span className="text-slate-700">{playerMap.get(pid) ?? '?'}</span>
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-200 px-4 py-3">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-500 mb-2">Total spilletid</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {[...calculatePlayingTime(plan).entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([pid, mins]) => (
                  <div key={pid} className="flex justify-between text-[12px] py-0.5">
                    <span className="text-gray-700 truncate">{playerMap.get(pid) ?? '?'}</span>
                    <span className="text-gray-500 tabular-nums shrink-0 ml-2">{mins.toFixed(1)} min</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom safe-area spacer for iOS */}
      <div className="safe-area-bottom h-6"/>
    </div>
  );
}

interface SubCardProps {
  kind: 'in' | 'out';
  num: number | null | undefined;
  name: string | null;
  pos: string;
}

function SubCard({ kind, num, name, pos }: SubCardProps) {
  const isOut = kind === 'out';
  const bg = isOut ? 'bg-[var(--color-sub-out)]' : 'bg-[var(--color-sub-in)]';
  const ink = isOut ? 'text-[var(--color-sub-out-ink)]' : 'text-[var(--color-sub-in-ink)]';
  const arrow = isOut ? (
    <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M7 3v8M11 7l-4 4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M7 11V3M3 7l4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  );
  return (
    <div className={`flex-1 ${bg} ${ink} rounded-2xl px-3 py-2.5 min-w-0 flex flex-col gap-0.5`}>
      <div className="flex items-center gap-1.5">
        {arrow}
        <span className="text-[9.5px] font-extrabold tracking-[1.2px] uppercase opacity-85">
          {isOut ? 'Ut' : 'Inn'}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="text-[20px] font-bold tabular-nums leading-none">
          {num != null ? `#${num}` : '–'}
        </span>
        <span className="text-[14px] font-semibold truncate min-w-0">
          {name ?? '–'}
        </span>
      </div>
      <div className="text-[10.5px] font-medium opacity-70 truncate">{pos}</div>
    </div>
  );
}
