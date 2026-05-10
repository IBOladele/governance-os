import DirectorsClient from './DirectorsClient';
import { getDirectors, getEntities, getBoardMeetings } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default async function DirectorsPage() {
  const [directors, entities, boardMeetings] = await Promise.all([
    getDirectors(),
    getEntities(),
    getBoardMeetings(),
  ]);

  return <DirectorsClient initialDirectors={directors} entities={entities} boardMeetings={boardMeetings} />;
}
