export type PlayFormat = '5v5' | '7v7' | '9v9';

export interface Player {
  id: string;
  name: string;
}

export interface Formation {
  id: string;
  name: string;
  format: PlayFormat;
  positions: string[];
  isCustom: boolean;
}

export interface Team {
  id: string;
  name: string;
  format: PlayFormat;
  players: Player[];
  savedFormations: Formation[];
  defaultFormationId?: string;
  createdAt: number;
}

export interface Period {
  startMinute: number;
  endMinute: number;
  positions: Record<string, string>;
  bench: string[];
}

export interface Half {
  durationMinutes: number;
  periods: Period[];
}

export type MatchStatus = 'planning' | 'live' | 'completed';

export interface Match {
  id: string;
  teamId: string;
  opponentName: string;
  date: string;
  format: PlayFormat;
  formationId: string;
  availablePlayerIds: string[];
  halves: [Half, Half];
  status: MatchStatus;
  intervalMinutes: number;
  halfDurationMinutes: number;
  keeperLocked: boolean;
  createdAt: number;
}

export interface TimerState {
  halfIndex: 0 | 1;
  periodIndex: number;
  startedAt: number | null;
  elapsedBeforePause: number;
  isRunning: boolean;
}

export interface AppData {
  teams: Team[];
  matches: Match[];
  version: number;
}
