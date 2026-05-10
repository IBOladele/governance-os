import {
  getBoardMeetings,
  getMeetingAttendees,
  getMeetingDocuments,
  getMeetingResolutions,
  getEntities,
  getDirectors,
} from '@/lib/db/queries';
import MeetingDetailClient from './MeetingDetailClient';

export const dynamic = 'force-dynamic';

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [
    boardMeetings,
    meetingAttendees,
    meetingDocuments,
    meetingResolutions,
    entities,
    directors,
  ] = await Promise.all([
    getBoardMeetings(),
    getMeetingAttendees(),
    getMeetingDocuments(),
    getMeetingResolutions(),
    getEntities(),
    getDirectors(),
  ]);

  return (
    <MeetingDetailClient
      id={id}
      boardMeetings={boardMeetings}
      meetingAttendees={meetingAttendees}
      meetingDocuments={meetingDocuments}
      meetingResolutions={meetingResolutions}
      entities={entities}
      directors={directors}
    />
  );
}
