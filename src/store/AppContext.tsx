import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import type { AppData, Draft, Match, Team } from '../types';
import { generateId } from '../utils/id';

const STORAGE_KEY = 'byttehjelp';
const CURRENT_VERSION = 2;

type LegacyMatchV1 = Omit<Match, 'drafts' | 'activeDraftId' | 'livePlan'> & {
  formationId: string;
  availablePlayerIds: string[];
  halves: Draft['halves'];
  intervalMinutes: number;
  halfDurationMinutes: number;
  keeperLocked: boolean;
};

function migrateV1ToV2(old: { teams?: Team[]; matches?: LegacyMatchV1[] }): AppData {
  const matches: Match[] = (old.matches ?? []).map(m => {
    const draftId = generateId();
    const draft: Draft = {
      id: draftId,
      name: 'Hovedutkast',
      formationId: m.formationId,
      availablePlayerIds: m.availablePlayerIds,
      halves: m.halves,
      intervalMinutes: m.intervalMinutes,
      halfDurationMinutes: m.halfDurationMinutes,
      keeperLocked: m.keeperLocked,
      createdAt: m.createdAt,
      updatedAt: m.createdAt,
    };
    return {
      id: m.id,
      teamId: m.teamId,
      opponentName: m.opponentName,
      date: m.date,
      format: m.format,
      drafts: [draft],
      activeDraftId: draftId,
      livePlan: m.status !== 'planning' ? draft : undefined,
      status: m.status,
      createdAt: m.createdAt,
    };
  });
  return { teams: old.teams ?? [], matches, version: 2 };
}

function loadFromStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.version === CURRENT_VERSION) return data as AppData;
      if (data.version === 1 || data.version === undefined) return migrateV1ToV2(data);
    }
  } catch { /* ignore */ }
  return { teams: [], matches: [], version: CURRENT_VERSION };
}

function saveToStorage(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

type AppAction =
  | { type: 'ADD_TEAM'; team: Team }
  | { type: 'UPDATE_TEAM'; team: Team }
  | { type: 'DELETE_TEAM'; teamId: string }
  | { type: 'ADD_MATCH'; match: Match }
  | { type: 'UPDATE_MATCH'; match: Match }
  | { type: 'DELETE_MATCH'; matchId: string };

function appReducer(state: AppData, action: AppAction): AppData {
  switch (action.type) {
    case 'ADD_TEAM':
      return { ...state, teams: [...state.teams, action.team] };
    case 'UPDATE_TEAM':
      return { ...state, teams: state.teams.map(t => t.id === action.team.id ? action.team : t) };
    case 'DELETE_TEAM':
      return { ...state, teams: state.teams.filter(t => t.id !== action.teamId) };
    case 'ADD_MATCH':
      return { ...state, matches: [...state.matches, action.match] };
    case 'UPDATE_MATCH':
      return { ...state, matches: state.matches.map(m => m.id === action.match.id ? action.match : m) };
    case 'DELETE_MATCH':
      return { ...state, matches: state.matches.filter(m => m.id !== action.matchId) };
  }
}

interface AppContextValue {
  state: AppData;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, null, loadFromStorage);

  useEffect(() => {
    const timer = setTimeout(() => saveToStorage(state), 100);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used within AppProvider');
  return ctx;
}
