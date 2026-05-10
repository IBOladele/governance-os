import Header from '@/components/layout/Header';
import { getSubmissions } from '@/lib/db/queries';
import SubmissionsClient from './SubmissionsClient';

export default async function SubmissionsPage() {
  let submissions: Awaited<ReturnType<typeof getSubmissions>> = [];
  try {
    submissions = await getSubmissions();
  } catch {
    // Table may not exist yet if migration hasn't run
  }
  return (
    <div>
      <Header title="Submissions" subtitle="Bug reports and feature requests — review, generate PRDs, approve or reject" />
      <SubmissionsClient initialSubmissions={submissions} />
    </div>
  );
}
