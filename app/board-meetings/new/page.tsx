import NewMeetingClient from './NewMeetingClient';
import {
  getEntities,
  getDirectors,
  getBoardMeetings,
  getMeetingAttendees,
} from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default async function NewBoardMeetingPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const { edit } = await searchParams;

  const [entities, directors, boardMeetings, meetingAttendees] = await Promise.all([
    getEntities(),
    getDirectors(),
    edit ? getBoardMeetings() : Promise.resolve([]),
    edit ? getMeetingAttendees() : Promise.resolve([]),
  ]);

  const editMeeting = edit ? boardMeetings.find(m => m.id === edit) ?? null : null;
  const editAttendees = edit ? meetingAttendees.filter(a => a.meetingId === edit) : [];

  return (
    <NewMeetingClient
      entities={entities}
      directors={directors}
      editMeeting={editMeeting}
      editAttendees={editAttendees}
    />
  );
}
