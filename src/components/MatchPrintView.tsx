import type { Draft, Formation, Team, Match } from '../types';

interface Props {
  team: Team;
  match: Match;
  draft: Draft;
  formation: Formation;
  playerMap: Map<string, string>;
}

function minutesFor(draft: Draft, pid: string): number {
  let total = 0;
  for (const half of draft.halves) {
    for (const period of half.periods) {
      if (Object.values(period.positions).includes(pid)) {
        total += period.endMinute - period.startMinute;
      }
    }
  }
  return total;
}

export function MatchPrintView({ team, match, draft, formation, playerMap }: Props) {
  return (
    <div className="hidden print:block p-6 text-black bg-white max-w-[210mm] mx-auto text-sm">
      {/* Header */}
      <div className="mb-4 border-b pb-3">
        <h1 className="text-2xl font-bold">{team.name} vs {match.opponentName}</h1>
        <div className="flex gap-4 text-gray-600 mt-1 text-xs flex-wrap">
          <span>{match.date}</span>
          {match.kickoffTime && <span>kl. {match.kickoffTime}</span>}
          {match.venue && <span>{match.venue}</span>}
          <span>{match.format}</span>
          <span>Draft: {draft.name}</span>
          <span>{draft.intervalMinutes} min bytteintervall · {draft.halfDurationMinutes} min omgang</span>
        </div>
      </div>

      {/* Half tables */}
      {draft.halves.map((half, hIdx) => (
        <div key={hIdx} className="mb-5">
          <h2 className="text-sm font-bold uppercase text-gray-600 mb-1">
            {hIdx === 0 ? '1. omgang' : '2. omgang'} ({half.durationMinutes} min)
          </h2>
          <table className="w-full border-collapse border border-gray-400 text-xs">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left py-1.5 px-2 border border-gray-300 font-semibold">Posisjon</th>
                {half.periods.map((p, pi) => (
                  <th key={pi} className="text-center py-1.5 px-1 border border-gray-300 font-semibold">
                    P{pi + 1} ({p.startMinute}′–{p.endMinute}′)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {formation.positions.map((pos, posIdx) => (
                <tr key={pos}>
                  <td className="py-1 px-2 border border-gray-300 font-semibold text-gray-700">
                    {pos} {posIdx === 0 && draft.keeperLocked ? '🔒' : ''}
                  </td>
                  {half.periods.map((period, pi) => {
                    const pid = period.positions[pos];
                    const name = pid ? playerMap.get(pid) ?? '?' : '';
                    let bgCls = '';
                    if (pid && pi > 0) {
                      const prev = half.periods[pi - 1].positions[pos];
                      if (prev && prev !== pid) bgCls = 'bg-[#D9EAD3] text-[#1f6b32] font-semibold';
                    }
                    if (pid && pi < half.periods.length - 1) {
                      const next = half.periods[pi + 1].positions[pos];
                      if (next && next !== pid) bgCls = 'bg-[#F4CCCC] text-[#8a1f1f] font-semibold';
                    }
                    return (
                      <td key={pi} className={`py-1 px-1 text-center border border-gray-300 ${bgCls}`}>
                        {name || '–'}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {/* Bench */}
              {half.periods.some(p => p.bench.length > 0) && (
                <>
                  <tr>
                    <td colSpan={1 + half.periods.length} className="py-1 px-2 bg-gray-200 font-bold text-gray-600 border border-gray-300 text-[10px] uppercase">
                      Benk
                    </td>
                  </tr>
                  {Array.from({ length: Math.max(...half.periods.map(p => p.bench.length), 0) }, (_, bi) => (
                    <tr key={`b${bi}`}>
                      <td className="py-0.5 px-2 border border-gray-300 text-gray-500">Innb. {bi + 1}</td>
                      {half.periods.map((period, pi) => {
                        const bid = period.bench[bi];
                        return (
                          <td key={pi} className="py-0.5 px-1 text-center border border-gray-300 text-gray-500">
                            {bid ? playerMap.get(bid) ?? '?' : ''}
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
      ))}

      {/* Playing time summary */}
      <div className="mb-4">
        <h2 className="text-sm font-bold uppercase text-gray-600 mb-1">Spilletid (estimat)</h2>
        <div className="grid grid-cols-3 gap-x-6 gap-y-0.5 text-xs">
          {draft.availablePlayerIds
            .map(pid => ({ pid, name: playerMap.get(pid) ?? '?', mins: minutesFor(draft, pid) }))
            .sort((a, b) => b.mins - a.mins)
            .map(p => (
              <div key={p.pid} className="flex justify-between border-b border-dotted border-gray-300 py-0.5">
                <span>{p.name}</span>
                <span className="font-mono">{p.mins} min</span>
              </div>
            ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-[9px] text-gray-400 mt-6 pt-2 border-t border-gray-200 text-center">
        Generert av Byttehjelp · byttehjelp.no
      </div>
    </div>
  );
}

export function generateTextSummary(team: Team, match: Match, draft: Draft, formation: Formation, playerMap: Map<string, string>): string {
  const lines: string[] = [];
  lines.push(`${team.name} vs ${match.opponentName}`);
  lines.push(`${match.date}${match.kickoffTime ? ` kl. ${match.kickoffTime}` : ''}${match.venue ? ` · ${match.venue}` : ''}`);
  lines.push(`${match.format} · ${draft.intervalMinutes} min bytteintervall · ${draft.halfDurationMinutes} min omgang`);
  lines.push(`Draft: ${draft.name}`);
  lines.push('');

  for (let hIdx = 0; hIdx < 2; hIdx++) {
    const half = draft.halves[hIdx];
    lines.push(`--- ${hIdx === 0 ? '1' : '2'}. omgang ---`);
    const header = ['Posisjon', ...half.periods.map((p, pi) => `P${pi + 1} (${p.startMinute}′–${p.endMinute}′)`)];
    lines.push(header.join(' | '));

    for (const pos of formation.positions) {
      const cells = half.periods.map(p => {
        const pid = p.positions[pos];
        return pid ? playerMap.get(pid) ?? '?' : '–';
      });
      lines.push(`${pos} | ${cells.join(' | ')}`);
    }

    const maxBench = Math.max(...half.periods.map(p => p.bench.length), 0);
    if (maxBench > 0) {
      lines.push('Benk:');
      for (let bi = 0; bi < maxBench; bi++) {
        const cells = half.periods.map(p => {
          const bid = p.bench[bi];
          return bid ? playerMap.get(bid) ?? '?' : '';
        });
        lines.push(`  ${cells.join(' | ')}`);
      }
    }
    lines.push('');
  }

  lines.push('Spilletid:');
  const times = draft.availablePlayerIds
    .map(pid => ({ name: playerMap.get(pid) ?? '?', mins: minutesFor(draft, pid) }))
    .sort((a, b) => b.mins - a.mins);
  for (const t of times) {
    lines.push(`  ${t.name}: ${t.mins} min`);
  }

  return lines.join('\n');
}
