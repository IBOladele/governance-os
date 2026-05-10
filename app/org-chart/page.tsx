import Header from '@/components/layout/Header';
import { getEntities } from '@/lib/db/queries';
import OrgChartPageClient from './OrgChartPageClient';

export const dynamic = 'force-dynamic';

export default async function OrgChartPage() {
  const entities = await getEntities();
  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Header
        title="Corporate Org Chart"
        subtitle="Interactive group structure — click any entity to view its profile"
      />
      <OrgChartPageClient entities={entities} />
    </div>
  );
}
