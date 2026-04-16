import type { Formation, PlayFormat } from '../types';

// Standardformasjoner basert på NFFs retningslinjer for barnefotball.
// Hold én anbefalt per format — brukeren kan lage egendefinerte om ønsket.
export const DEFAULT_FORMATIONS: Formation[] = [
  {
    id: '5v5-2-2',
    name: '2-2',
    format: '5v5',
    positions: ['Keeper', 'V. forsvar', 'H. forsvar', 'V. angrep', 'H. angrep'],
    isCustom: false,
  },
  {
    id: '7v7-2-3-1',
    name: '2-3-1',
    format: '7v7',
    positions: ['Keeper', 'V. forsvar', 'H. forsvar', 'V. midtbane', 'Midtbane', 'H. midtbane', 'Spiss'],
    isCustom: false,
  },
  {
    id: '9v9-3-3-2',
    name: '3-3-2',
    format: '9v9',
    positions: ['Keeper', 'V. back', 'Midtstopper', 'H. back', 'V. midtbane', 'S. midtbane', 'H. midtbane', 'V. angrep', 'H. angrep'],
    isCustom: false,
  },
];

export function getFormationsForFormat(format: PlayFormat): Formation[] {
  return DEFAULT_FORMATIONS.filter(f => f.format === format);
}

export function getDefaultFormation(format: PlayFormat): Formation {
  return DEFAULT_FORMATIONS.find(f => f.format === format)!;
}

export function getFieldCount(format: PlayFormat): number {
  return getDefaultFormation(format).positions.length;
}
