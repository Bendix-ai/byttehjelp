import { useState, useEffect, useCallback, useRef, type MutableRefObject } from 'react';
import { useAppState } from '../store/AppContext';
import type { TimerState } from '../types';
import { getSubstitutionDiff, calculatePlayingTime } from '../utils/substitution';

interface Props {
  matchId: string | null;
  onBack: () => void;
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
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef(timer) as MutableRefObject<TimerState>;
  timerRef.current = timer;

  const team = match ? state.teams.find(t => t.id === match.teamId) : null;
  const playerMap = new Map(team?.players.map(p => [p.id, p.name]) ?? []);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    audioRef.current = new Audio('/alert.mp3');
    audioRef.current.load();
  }, []);

  // Wake lock
  useEffect(() => {
    async function requestWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        } catch { /* ignore */ }
      }
    }
    if (timer.isRunning) {
      requestWakeLock();
    }
    return () => {
      wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, [timer.isRunning]);

  // Timer tick
  useEffect(() => {
    if (!timer.isRunning || timer.startedAt === null) return;

    const intervalId = setInterval(() => {
      const now = Date.now();
      setElapsedMs(timer.elapsedBeforePause + (now - timer.startedAt!) * speedMultiplier);
    }, 250);

    return () => clearInterval(intervalId);
  }, [timer.isRunning, timer.startedAt, timer.elapsedBeforePause, speedMultiplier]);

  // Check substitution boundaries
  const triggerAlert = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
    audioRef.current?.play().catch(() => {});
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Byttehjelp', {
        body: 'Tid for bytte!',
        tag: 'sub-alert',
        requireInteraction: true,
      });
    }
  }, []);

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
  }, [elapsedMs, match, timer.halfIndex, timer.isRunning, alertShown, triggerAlert]);

  // Visibility change handler — uses ref to avoid stale closures
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
      <div className="p-4">
        <button onClick={onBack} className="text-primary text-lg mb-4">&larr; Tilbake</button>
        <p className="text-gray-400 text-center py-12">Ingen kamp valgt. Opprett en kamp forst.</p>
      </div>
    );
  }

  const half = plan.halves[timer.halfIndex];
  const currentPeriod = half.periods[timer.periodIndex];
  const halfDuration = half.durationMinutes;
  const remainingMs = Math.max(0, (halfDuration * 60000) - elapsedMs);
  const remainingMin = Math.floor(remainingMs / 60000);
  const remainingSec = Math.floor((remainingMs % 60000) / 1000);

  // Next substitution time
  const nextPeriodIdx = timer.periodIndex + 1;
  const nextPeriod = nextPeriodIdx < half.periods.length ? half.periods[nextPeriodIdx] : null;
  const nextSubTime = nextPeriod ? nextPeriod.startMinute : null;
  const timeToNextSub = nextSubTime !== null
    ? Math.max(0, (nextSubTime * 60000) - elapsedMs)
    : null;
  const nextSubMin = timeToNextSub !== null ? Math.floor(timeToNextSub / 60000) : null;
  const nextSubSec = timeToNextSub !== null ? Math.floor((timeToNextSub % 60000) / 1000) : null;
  const isSubImminent = timeToNextSub !== null && timeToNextSub <= 60000 && timeToNextSub > 0;

  // Sub diff for current period
  const prevPeriod = timer.periodIndex > 0 ? half.periods[timer.periodIndex - 1] : null;
  const diff = prevPeriod ? getSubstitutionDiff(prevPeriod.positions, currentPeriod.positions) : null;

  // Per-position upcoming changes from current → next period.
  // If the outgoing player was just subbed IN this period (came from bench), filter it out —
  // we don't want to flag a fresh player as already going out in the next panel.
  const upcomingChanges = nextPeriod
    ? Object.keys(currentPeriod.positions)
        .filter(pos => currentPeriod.positions[pos] !== nextPeriod.positions[pos])
        .filter(pos => {
          const outgoing = currentPeriod.positions[pos];
          if (!outgoing) return true;
          if (!diff) return true;
          return !diff.comingIn.has(outgoing);
        })
        .map(pos => ({
          position: pos,
          outgoing: currentPeriod.positions[pos],
          incoming: nextPeriod.positions[pos],
        }))
    : [];

  function handleStart() {
    setTimer(prev => ({
      ...prev,
      isRunning: true,
      startedAt: Date.now(),
    }));

    // Mark match as live + freeze the active draft as the live plan
    if (match!.status === 'planning') {
      const activeDraft = match!.drafts.find(d => d.id === match!.activeDraftId) ?? match!.drafts[0];
      dispatch({
        type: 'UPDATE_MATCH',
        match: { ...match!, status: 'live', livePlan: structuredClone(activeDraft) },
      });
    }
  }

  function handlePause() {
    setTimer(prev => {
      const additionalElapsed = prev.startedAt ? (Date.now() - prev.startedAt) * speedMultiplier : 0;
      return {
        ...prev,
        isRunning: false,
        elapsedBeforePause: prev.elapsedBeforePause + additionalElapsed,
        startedAt: null,
      };
    });
  }

  function handleSpeedChange(newSpeed: number) {
    if (newSpeed === speedMultiplier) return;
    // Snapshot current simulated elapsed so speed changes are seamless
    if (timer.isRunning && timer.startedAt !== null) {
      const now = Date.now();
      const snapshot = timer.elapsedBeforePause + (now - timer.startedAt) * speedMultiplier;
      setTimer(prev => ({ ...prev, elapsedBeforePause: snapshot, startedAt: now }));
    }
    setSpeedMultiplier(newSpeed);
  }

  function handleNextHalf() {
    setTimer({
      halfIndex: 1,
      periodIndex: 0,
      startedAt: null,
      elapsedBeforePause: 0,
      isRunning: false,
    });
    setElapsedMs(0);
    setAlertShown(new Set());
  }

  function handleEndMatch() {
    handlePause();
    dispatch({ type: 'UPDATE_MATCH', match: { ...match!, status: 'completed' } });
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-primary text-lg">&larr;</button>
        <span className="text-sm text-gray-500 font-medium">
          {timer.halfIndex === 0 ? '1. omgang' : '2. omgang'}
        </span>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5" title="Demo-fart for testing">
          {[1, 10, 60].map(s => (
            <button key={s} onClick={() => handleSpeedChange(s)}
              className={`text-xs font-semibold px-2 py-1 rounded-md transition-colors ${
                speedMultiplier === s ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {s}×
            </button>
          ))}
        </div>
      </div>

      {/* Next substitution panel */}
      <div className={`mb-4 rounded-2xl border-2 transition-all ${
        isSubImminent
          ? 'bg-orange-50 border-orange-400 shadow-lg animate-pulse'
          : nextPeriod
            ? 'bg-white border-gray-200'
            : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="px-4 py-3 border-b border-inherit flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-600">
            Neste bytte
          </span>
          {nextPeriod && nextSubMin !== null && nextSubSec !== null && (
            <span className={`font-mono font-bold text-lg tabular-nums ${isSubImminent ? 'text-orange-600' : 'text-gray-700'}`}>
              {String(nextSubMin).padStart(2, '0')}:{String(nextSubSec).padStart(2, '0')}
            </span>
          )}
        </div>
        {!nextPeriod ? (
          <p className="px-4 py-5 text-center text-sm text-gray-500">
            Ingen flere bytter i denne omgangen
          </p>
        ) : upcomingChanges.length === 0 ? (
          <p className="px-4 py-5 text-center text-sm text-gray-500">
            Ingen endringer ved neste periode
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {upcomingChanges.map(c => {
              const outName = c.outgoing ? playerMap.get(c.outgoing) ?? '?' : null;
              const inName = c.incoming ? playerMap.get(c.incoming) ?? '?' : null;
              return (
                <div key={c.position} className="px-4 py-2.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    {c.position}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-red-600 text-base leading-none shrink-0" aria-label="ut">↓</span>
                      <span className={`text-sm truncate ${outName ? 'text-red-700 font-medium' : 'text-gray-300'}`}>
                        {outName ?? '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-green-600 text-base leading-none shrink-0" aria-label="inn">↑</span>
                      <span className={`text-sm truncate ${inName ? 'text-green-800 font-semibold' : 'text-gray-300'}`}>
                        {inName ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Big Timer Display */}
      <div className="text-center mb-6">
        <div className="text-7xl font-mono font-bold text-gray-900 tabular-nums tracking-tight">
          {String(remainingMin).padStart(2, '0')}:{String(remainingSec).padStart(2, '0')}
        </div>
        <div className="text-xs text-gray-400 mt-2">
          Periode {timer.periodIndex + 1} av {half.periods.length}
        </div>

        {/* Progress bar to next sub */}
        {nextSubTime !== null && (
          <div className="mt-3 px-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Neste bytte</span>
              <span>{Math.max(0, Math.ceil((timeToNextSub ?? 0) / 60000))} min</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, ((elapsedMs / 60000) - (half.periods[timer.periodIndex]?.startMinute ?? 0)) / (nextSubTime - (half.periods[timer.periodIndex]?.startMinute ?? 0)) * 100)}%`
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-3 justify-center mb-6">
        {!timer.isRunning ? (
          <button
            onClick={handleStart}
            className="bg-green-600 text-white px-8 py-4 rounded-2xl text-xl font-bold active:scale-95 transition-transform"
          >
            {elapsedMs === 0 ? 'Start' : 'Fortsett'}
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="bg-yellow-500 text-white px-8 py-4 rounded-2xl text-xl font-bold active:scale-95 transition-transform"
          >
            Pause
          </button>
        )}
        {remainingMs === 0 && timer.halfIndex === 0 && (
          <button
            onClick={handleNextHalf}
            className="bg-primary text-white px-6 py-4 rounded-2xl text-lg font-bold active:scale-95 transition-transform"
          >
            2. omgang →
          </button>
        )}
        {remainingMs === 0 && timer.halfIndex === 1 && (
          <button
            onClick={handleEndMatch}
            className="bg-red-600 text-white px-6 py-4 rounded-2xl text-lg font-bold active:scale-95 transition-transform"
          >
            Avslutt kamp
          </button>
        )}
      </div>

      {/* Current Lineup */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500">
          PA BANEN
        </div>
        {Object.entries(currentPeriod.positions).map(([pos, pid]) => {
          const name = pid ? playerMap.get(pid) ?? '?' : '-';
          let rowBg = '';
          if (diff) {
            if (pid && diff.comingIn.has(pid)) rowBg = 'bg-sub-in';
            if (pid && diff.goingOut.has(pid)) rowBg = 'bg-sub-out';
          }
          return (
            <div key={pos} className={`flex items-center justify-between px-4 py-3 border-t border-gray-100 ${rowBg}`}>
              <span className="text-xs text-gray-500 w-24">{pos}</span>
              <span className="text-sm font-medium text-gray-900">{name}</span>
            </div>
          );
        })}
      </div>

      {/* Bench */}
      {currentPeriod.bench.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
          <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-500">
            BENK
          </div>
          {currentPeriod.bench.map((pid, i) => (
            <div key={pid} className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">Innbytter {i + 1}</span>
              <span className="text-sm text-gray-700">{playerMap.get(pid) ?? '?'}</span>
            </div>
          ))}
        </div>
      )}

      {/* Total playing time */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <h3 className="text-xs font-semibold text-gray-500 mb-2">TOTAL SPILLETID</h3>
        <div className="grid grid-cols-2 gap-1">
          {[...calculatePlayingTime(plan).entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([pid, mins]) => (
              <div key={pid} className="flex justify-between text-xs py-1 px-2">
                <span className="text-gray-700">{playerMap.get(pid) ?? '?'}</span>
                <span className="text-gray-500 font-mono">{mins.toFixed(1)} min</span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}
