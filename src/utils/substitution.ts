import type { Half, Match, Period } from '../types';

export function generateDefaultPeriods(
  halfDuration: number,
  playerCount: number,
  fieldCount: number,
  positions: string[],
): Period[] {
  const benchCount = playerCount - fieldCount;
  if (benchCount <= 0) {
    return [{
      startMinute: 0,
      endMinute: halfDuration,
      positions: Object.fromEntries(positions.map(p => [p, ''])),
      bench: [],
    }];
  }

  const periodCount = benchCount + 1;
  const periodLength = +(halfDuration / periodCount).toFixed(1);

  return Array.from({ length: periodCount }, (_, i) => ({
    startMinute: +(i * periodLength).toFixed(1),
    endMinute: i === periodCount - 1 ? halfDuration : +((i + 1) * periodLength).toFixed(1),
    positions: Object.fromEntries(positions.map(p => [p, ''])),
    bench: [],
  }));
}

export function computeNextBench(
  currentPositions: Record<string, string>,
  nextPositions: Record<string, string>,
  currentBench: string[],
): string[] {
  const currentField = new Set(Object.values(currentPositions).filter(Boolean));
  const nextField = new Set(Object.values(nextPositions).filter(Boolean));

  const comingIn = new Set(
    currentBench.filter(pid => nextField.has(pid))
  );
  const goingOut = [...currentField].filter(pid => !nextField.has(pid));

  const newBench = currentBench.filter(pid => !comingIn.has(pid));
  for (const pid of goingOut) {
    newBench.push(pid);
  }

  return newBench;
}

export function getSubstitutionDiff(
  prevPositions: Record<string, string>,
  nextPositions: Record<string, string>,
): { goingOut: Set<string>; comingIn: Set<string> } {
  const prevField = new Set(Object.values(prevPositions).filter(Boolean));
  const nextField = new Set(Object.values(nextPositions).filter(Boolean));

  return {
    goingOut: new Set([...prevField].filter(id => !nextField.has(id))),
    comingIn: new Set([...nextField].filter(id => !prevField.has(id))),
  };
}

export function calculatePlayingTime(match: Match): Map<string, number> {
  const minutes = new Map<string, number>();

  for (const half of match.halves) {
    for (const period of half.periods) {
      const duration = period.endMinute - period.startMinute;
      for (const playerId of Object.values(period.positions)) {
        if (playerId) {
          minutes.set(playerId, (minutes.get(playerId) ?? 0) + duration);
        }
      }
    }
  }

  return minutes;
}

export function autoRotate(
  availablePlayerIds: string[],
  positions: string[],
  halfDuration: number,
): Half {
  const fieldCount = positions.length;
  const benchCount = availablePlayerIds.length - fieldCount;

  if (benchCount <= 0) {
    return {
      durationMinutes: halfDuration,
      periods: [{
        startMinute: 0,
        endMinute: halfDuration,
        positions: Object.fromEntries(positions.map((pos, i) => [pos, availablePlayerIds[i] ?? ''])),
        bench: [],
      }],
    };
  }

  const periodCount = benchCount + 1;
  const periodLength = +(halfDuration / periodCount).toFixed(1);
  const players = [...availablePlayerIds];
  const periods: Period[] = [];

  for (let p = 0; p < periodCount; p++) {
    // Rotate: shift 'benchCount' players into bench each period
    const offset = p * benchCount;
    const rotated: string[] = [];
    for (let i = 0; i < players.length; i++) {
      rotated.push(players[(i + offset) % players.length]);
    }

    const fieldPlayers = rotated.slice(0, fieldCount);
    const benchPlayers = rotated.slice(fieldCount);

    periods.push({
      startMinute: +(p * periodLength).toFixed(1),
      endMinute: p === periodCount - 1 ? halfDuration : +((p + 1) * periodLength).toFixed(1),
      positions: Object.fromEntries(positions.map((pos, i) => [pos, fieldPlayers[i]])),
      bench: benchPlayers,
    });
  }

  return { durationMinutes: halfDuration, periods };
}
