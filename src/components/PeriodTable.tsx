import type { Formation, Half } from '../types';

interface Props {
  formation: Formation;
  half: Half;
  playerMap: Map<string, string>;
  activePeriodIdx: number;
  keeperLocked: boolean;
  interactive: boolean;
  onCellClick: (periodIdx: number, position: string) => void;
  onJumpToPeriod: (periodIdx: number) => void;
}

export function PeriodTable({ formation, half, playerMap, activePeriodIdx, keeperLocked, interactive, onCellClick, onJumpToPeriod }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left py-2.5 px-3 font-medium text-gray-500 text-xs sticky left-0 bg-gray-50 min-w-[140px] border-r border-gray-200">
              Posisjon
            </th>
            {half.periods.map((period, pi) => (
              <th key={pi} onClick={() => onJumpToPeriod(pi)}
                className={`text-center py-2.5 px-2 font-medium text-xs min-w-[100px] border-r border-gray-100 last:border-r-0 cursor-pointer ${
                  pi === activePeriodIdx ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary)]' : 'text-gray-500 hover:bg-gray-100'
                }`}>
                P{pi + 1} — {period.startMinute}′–{period.endMinute}′
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
                  {pos} {isKeeper && keeperLocked && <span className="text-[var(--color-keeper-ink)]">🔒</span>}
                </td>
                {half.periods.map((period, pi) => {
                  const pid = period.positions[pos];
                  const name = pid ? playerMap.get(pid) ?? '?' : '';
                  const isLockedKeeper = isKeeper && keeperLocked && pi > 0;

                  let bg = '';
                  if (pid && pi > 0) {
                    const prevPid = half.periods[pi - 1].positions[pos];
                    if (prevPid && prevPid !== pid) bg = 'bg-[var(--color-sub-in)]';
                  }
                  if (pid && pi < half.periods.length - 1) {
                    const nextPid = half.periods[pi + 1].positions[pos];
                    if (nextPid && nextPid !== pid) bg = 'bg-[var(--color-sub-out)]';
                  }
                  if (pid && pi > 0 && pi < half.periods.length - 1) {
                    const prevPid = half.periods[pi - 1].positions[pos];
                    const nextPid = half.periods[pi + 1].positions[pos];
                    if (prevPid && prevPid !== pid && nextPid && nextPid !== pid) {
                      bg = 'bg-[var(--color-sub-out)]';
                    }
                  }

                  const isInteractable = !isLockedKeeper && interactive;
                  return (
                    <td key={pi}
                      onClick={() => isInteractable && onCellClick(pi, pos)}
                      className={`py-1.5 px-1 text-center border-r border-gray-100 last:border-r-0 transition-colors ${bg} ${!isInteractable ? 'opacity-70 cursor-default' : 'cursor-pointer hover:bg-[var(--color-primary-soft)] active:opacity-80'}`}>
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
                      <td key={pi} className={`py-1.5 px-1 text-center text-xs text-gray-500 border-r border-gray-100 last:border-r-0 ${pi === activePeriodIdx ? 'bg-[var(--color-primary-soft)]/60' : ''}`}>
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
  );
}
