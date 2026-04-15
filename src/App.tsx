import { useState } from 'react';
import { AppProvider } from './store/AppContext';
import { PlanningView } from './screens/PlanningView';
import { MatchTimerScreen } from './screens/MatchTimerScreen';

export type AppMode = 'plan' | 'match';

export default function App() {
  const [mode, setMode] = useState<AppMode>('plan');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-50">
        {mode === 'plan' ? (
          <PlanningView
            onStartMatch={(matchId) => {
              setActiveMatchId(matchId);
              setMode('match');
            }}
          />
        ) : (
          <MatchTimerScreen
            matchId={activeMatchId}
            onBack={() => setMode('plan')}
          />
        )}
      </div>
    </AppProvider>
  );
}
