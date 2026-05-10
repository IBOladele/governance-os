import BoardMeetingsClient from './BoardMeetingsClient';
import { getBoardMeetings, getEntities } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default async function BoardMeetingsPage() {
  const [boardMeetings, entities] = await Promise.all([
    getBoardMeetings(),
    getEntities(),
  ]);

  return <BoardMeetingsClient boardMeetings={boardMeetings} entities={entities} />;
}
