import { useState, useEffect, type ReactNode } from 'react';
import { useAppState } from '../store/AppContext';
import { Sidebar, type AppSection } from '../components/Sidebar';
import { OnboardingScreen } from './OnboardingScreen';
import { MatchesScreen } from './MatchesScreen';
import { PlannerScreen } from './PlannerScreen';
import { MatchTimerScreen } from './MatchTimerScreen';

export function AppShell() {
  const { state } = useAppState();
  const team = state.teams[0] ?? null;
  const teamMatches = team ? state.matches.filter(m => m.teamId === team.id) : [];

  const [section, setSection] = useState<AppSection>('opprett');
  const [activeMatchId, setActiveMatchId] = useState<string | null>(
    teamMatches.length > 0 ? teamMatches[teamMatches.length - 1].id : null
  );

  // Auto-redirect on first load to the appropriate section
  useEffect(() => {
    if (!team) { setSection('opprett'); return; }
    if (team.players.length === 0) { setSection('spillere'); return; }
    if (teamMatches.length === 0) { setSection('kamper'); return; }
    // else: stay where user navigated (or default to kamper / planlegger)
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep activeMatchId valid if a match is deleted
  useEffect(() => {
    if (activeMatchId && !teamMatches.find(m => m.id === activeMatchId)) {
      setActiveMatchId(teamMatches.length > 0 ? teamMatches[teamMatches.length - 1].id : null);
    }
  }, [activeMatchId, teamMatches]);

  const hasTeam = !!team;
  const hasPlayers = team ? team.players.length > 0 : false;
  const hasMatch = !!activeMatchId && teamMatches.some(m => m.id === activeMatchId);

  const navItems = [
    { id: 'opprett' as const, label: 'Opprett lag', enabled: true },
    { id: 'spillere' as const, label: 'Spillere', enabled: hasTeam },
    { id: 'kamper' as const, label: 'Kamper', enabled: hasTeam && hasPlayers },
    { id: 'planlegger' as const, label: 'Planlegger', enabled: hasMatch },
    { id: 'kamp' as const, label: 'Kamp', enabled: hasMatch },
  ];

  let content: ReactNode;
  if (section === 'opprett' || section === 'spillere') {
    content = (
      <OnboardingScreen
        step={section === 'opprett' ? 'team' : 'players'}
        onContinue={() => {
          if (section === 'opprett') setSection('spillere');
          else if (section === 'spillere') setSection(teamMatches.length > 0 ? 'kamper' : 'kamper');
        }}
        onGoToSection={setSection}
      />
    );
  } else if (section === 'kamper') {
    content = (
      <MatchesScreen
        activeMatchId={activeMatchId}
        onSelectMatch={(id) => { setActiveMatchId(id); setSection('planlegger'); }}
        onCreateMatch={(id) => { setActiveMatchId(id); setSection('planlegger'); }}
      />
    );
  } else if (section === 'planlegger') {
    content = (
      <PlannerScreen
        matchId={activeMatchId}
        onStartMatch={() => setSection('kamp')}
        onGoToMatches={() => setSection('kamper')}
      />
    );
  } else {
    content = (
      <MatchTimerScreen
        matchId={activeMatchId}
        onBack={() => setSection('planlegger')}
      />
    );
  }

  return (
    <div className="flex h-full bg-[var(--color-surface)]">
      <Sidebar
        active={section}
        items={navItems}
        teamName={team?.name}
        onSelect={setSection}
      />
      <main className="flex-1 overflow-y-auto">
        {content}
      </main>
    </div>
  );
}
