import type { Formation, PlayFormat } from '../types';

export const DEFAULT_FORMATIONS: Formation[] = [
  // 5v5
  {
    id: '5v5-1-2-1',
    name: '1-2-1',
    format: '5v5',
    positions: ['Keeper', 'Forsvar', 'V. midtbane', 'H. midtbane', 'Spiss'],
    isCustom: false,
  },
  {
    id: '5v5-2-1-1',
    name: '2-1-1',
    format: '5v5',
    positions: ['Keeper', 'V. forsvar', 'H. forsvar', 'Midtbane', 'Spiss'],
    isCustom: false,
  },
  {
    id: '5v5-1-1-2',
    name: '1-1-2',
    format: '5v5',
    positions: ['Keeper', 'Forsvar', 'Midtbane', 'V. angrep', 'H. angrep'],
    isCustom: false,
  },

  // 7v7
  {
    id: '7v7-2-3-1',
    name: '2-3-1',
    format: '7v7',
    positions: ['Keeper', 'V. forsvar', 'H. forsvar', 'V. midtbane', 'Midtbane', 'H. midtbane', 'Spiss'],
    isCustom: false,
  },
  {
    id: '7v7-3-2-1',
    name: '3-2-1',
    format: '7v7',
    positions: ['Keeper', 'V. forsvar', 'Midtstopper', 'H. forsvar', 'V. midtbane', 'H. midtbane', 'Spiss'],
    isCustom: false,
  },
  {
    id: '7v7-2-2-2',
    name: '2-2-2',
    format: '7v7',
    positions: ['Keeper', 'V. forsvar', 'H. forsvar', 'V. midtbane', 'H. midtbane', 'V. angrep', 'H. angrep'],
    isCustom: false,
  },
  {
    id: '7v7-1-3-2',
    name: '1-3-2',
    format: '7v7',
    positions: ['Keeper', 'Forsvar', 'V. midtbane', 'Midtbane', 'H. midtbane', 'V. angrep', 'H. angrep'],
    isCustom: false,
  },

  // 9v9
  {
    id: '9v9-3-3-2',
    name: '3-3-2',
    format: '9v9',
    positions: ['Keeper', 'V. back', 'Midtstopper', 'H. back', 'V. midtbane', 'S. midtbane', 'H. midtbane', 'V. angrep', 'Spiss'],
    isCustom: false,
  },
  {
    id: '9v9-3-4-1',
    name: '3-4-1',
    format: '9v9',
    positions: ['Keeper', 'V. back', 'Midtstopper', 'H. back', 'V. midtbane', 'S. midtbane 1', 'S. midtbane 2', 'H. midtbane', 'Spiss'],
    isCustom: false,
  },
  {
    id: '9v9-4-3-1',
    name: '4-3-1',
    format: '9v9',
    positions: ['Keeper', 'V. back', 'Midtstopper 1', 'Midtstopper 2', 'H. back', 'V. midtbane', 'S. midtbane', 'H. midtbane', 'Spiss'],
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
