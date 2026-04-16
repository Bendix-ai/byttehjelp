import type { Formation } from '../types';

type Coord = { x: number; y: number };

// Pitch is a 100 × 110 logical canvas. Own goal is at the bottom (y=110), attack at top.
const Y_BY_ROW = { keeper: 96, def: 74, mid: 46, att: 20 } as const;

// Use Y_BY_ROW constants so hardcoded layouts follow the same grid.
const LAYOUTS: Record<string, Record<string, Coord>> = {
  '5v5-2-2': {
    'Keeper': { x: 50, y: Y_BY_ROW.keeper },
    'V. forsvar': { x: 30, y: Y_BY_ROW.def },
    'H. forsvar': { x: 70, y: Y_BY_ROW.def },
    'V. angrep': { x: 30, y: Y_BY_ROW.att },
    'H. angrep': { x: 70, y: Y_BY_ROW.att },
  },
  '7v7-2-3-1': {
    'Keeper': { x: 50, y: Y_BY_ROW.keeper },
    'V. forsvar': { x: 30, y: Y_BY_ROW.def },
    'H. forsvar': { x: 70, y: Y_BY_ROW.def },
    'V. midtbane': { x: 22, y: Y_BY_ROW.mid },
    'Midtbane': { x: 50, y: Y_BY_ROW.mid },
    'H. midtbane': { x: 78, y: Y_BY_ROW.mid },
    'Spiss': { x: 50, y: Y_BY_ROW.att },
  },
  '9v9-3-3-2': {
    'Keeper': { x: 50, y: Y_BY_ROW.keeper },
    'V. back': { x: 22, y: Y_BY_ROW.def },
    'Midtstopper': { x: 50, y: Y_BY_ROW.def },
    'H. back': { x: 78, y: Y_BY_ROW.def },
    'V. midtbane': { x: 22, y: Y_BY_ROW.mid },
    'S. midtbane': { x: 50, y: Y_BY_ROW.mid },
    'H. midtbane': { x: 78, y: Y_BY_ROW.mid },
    'V. angrep': { x: 35, y: Y_BY_ROW.att },
    'H. angrep': { x: 65, y: Y_BY_ROW.att },
  },
};

function guessRow(posName: string): keyof typeof Y_BY_ROW {
  const n = posName.toLowerCase();
  if (n.includes('keeper') || n === 'gk') return 'keeper';
  if (n.includes('spiss') || n.includes('angrep') || n.includes('forward') || n.includes('striker')) return 'att';
  if (n.includes('forsvar') || n.includes('back') || n.includes('stopper') || n.includes('libero')) return 'def';
  if (n.includes('midt') || n.includes('mid')) return 'mid';
  return 'mid';
}

export function layoutPositions(formation: Formation): Record<string, Coord> {
  if (LAYOUTS[formation.id]) return LAYOUTS[formation.id];

  // Auto-layout for custom/unknown formations
  const rows: Record<keyof typeof Y_BY_ROW, string[]> = { keeper: [], def: [], mid: [], att: [] };
  for (const pos of formation.positions) rows[guessRow(pos)].push(pos);

  // Ensure at least a keeper row
  if (rows.keeper.length === 0 && formation.positions.length > 0) {
    rows.keeper.push(formation.positions[0]);
    for (const row of ['def', 'mid', 'att'] as const) {
      rows[row] = rows[row].filter(p => p !== formation.positions[0]);
    }
  }

  const result: Record<string, Coord> = {};
  for (const row of Object.keys(rows) as Array<keyof typeof Y_BY_ROW>) {
    const list = rows[row];
    const n = list.length;
    list.forEach((pos, i) => {
      const x = n === 1 ? 50 : 18 + (64 * i) / (n - 1);
      result[pos] = { x, y: Y_BY_ROW[row] };
    });
  }
  return result;
}
