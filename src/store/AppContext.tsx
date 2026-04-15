import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import type { AppData, Match, Team } from '../types';

const STORAGE_KEY = 'byttehjelp';
const CURRENT_VERSION = 1;

function loadFromStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as AppData;
      if (data.version === CURRENT_VERSION) return data;
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
