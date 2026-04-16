import type { Draft } from '../types';

interface Props {
  plan: Draft;
  playerMap: Map<string, string>;
}

function minutesFor(plan: Draft, pid: string): number {
  let total = 0;
  for (const half of plan.halves) {
    for (const period of half.periods) {
      if (Object.values(period.positions).includes(pid)) {
        total += period.endMinute - period.startMinute;
      }
    }
  }
  return total;
}

export function PlayingTimeRail({ plan, playerMap }: Props) {
  const players = plan.availablePlayerIds.map(pid => ({
    id: pid,
    name: playerMap.get(pid) ?? '?',
    mins: minutesFor(plan, pid),
  }));
  if (players.length === 0) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Spilletid · estimat</div>
        <p className="text-xs text-gray-400 mt-2">Ingen spillere i draft.</p>
      </div>
    );
  }

  const total = players.reduce((acc, p) => acc + p.mins, 0);
  const avg = total / players.length;
  const max = Math.max(...players.map(p => p.mins), 1);
  const threshold = avg * 0.85;

  // Sort descending by minutes, low performers flagged
  const sorted = [...players].sort((a, b) => b.mins - a.mins);

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold">Spilletid · estimat</div>
        <span className="text-xs text-gray-500 font-mono">snitt {avg.toFixed(0)} min</span>
      </div>
      <div className="space-y-1.5 mt-2">
        {sorted.map(p => {
          const low = p.mins < threshold;
          const pct = (p.mins / max) * 100;
          return (
            <div key={p.id} className="flex items-center gap-2">
              <span className={`flex-1 truncate text-sm ${low ? 'text-orange-700 font-semibold' : 'text-gray-700'}`}>
                {p.name}
              </span>
              <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${low ? 'bg-orange-400' : 'bg-[var(--color-primary)]'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`font-mono text-xs tabular-nums w-10 text-right ${low ? 'text-orange-700 font-semibold' : 'text-gray-500'}`}>
                {p.mins}
              </span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-400 mt-3 leading-snug">
        Spillere lavere enn 85% av snittet markeres med oransje — fordel byttene slik at alle får rimelig tid.
      </p>
    </div>
  );
}
