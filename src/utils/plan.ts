import type { Half, Period } from '../types';

export function buildHalf(duration: number, interval: number, positions: string[]): Half {
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

export function computeBench(period: Period, allPlayerIds: string[], prevBench: string[]): string[] {
  const onField = new Set(Object.values(period.positions).filter(Boolean));
  const shouldBeBenched = allPlayerIds.filter(id => !onField.has(id));
  const ordered: string[] = [];
  for (const id of prevBench) {
    if (shouldBeBenched.includes(id)) ordered.push(id);
  }
  for (const id of shouldBeBenched) {
    if (!ordered.includes(id)) ordered.push(id);
  }
  return ordered;
}

export function recomputeAllBenches(half: Half, allPlayerIds: string[]) {
  for (let i = 0; i < half.periods.length; i++) {
    const prevBench = i > 0 ? half.periods[i - 1].bench : [];
    half.periods[i].bench = computeBench(half.periods[i], allPlayerIds, prevBench);
  }
}

export function copyForward(half: Half) {
  for (let i = 1; i < half.periods.length; i++) {
    for (const pos of Object.keys(half.periods[i].positions)) {
      if (!half.periods[i].positions[pos] && half.periods[i - 1].positions[pos]) {
        half.periods[i].positions[pos] = half.periods[i - 1].positions[pos];
      }
    }
  }
}
