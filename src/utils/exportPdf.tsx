import { pdf } from '@react-pdf/renderer';
import { MatchPdfDocument } from '../components/print/MatchPdfDocument';
import type { Draft, Formation, Match, Team } from '../types';

interface ExportProps {
  team: Team;
  match: Match;
  draft: Draft;
  formation: Formation;
  playerMap: Map<string, string>;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildFilename({ team, match }: ExportProps): string {
  const teamSlug = slugify(team.name) || 'lag';
  const oppSlug = slugify(match.opponentName) || 'motstander';
  const dateSlug = match.date || new Date().toISOString().slice(0, 10);
  return `kampplan-${teamSlug}-vs-${oppSlug}-${dateSlug}.pdf`;
}

export async function downloadMatchPdf(props: ExportProps): Promise<void> {
  const doc = (
    <MatchPdfDocument
      team={props.team}
      match={props.match}
      draft={props.draft}
      formation={props.formation}
      playerMap={props.playerMap}
    />
  );
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const filename = buildFilename(props);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
