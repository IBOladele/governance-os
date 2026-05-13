import Header from '@/components/layout/Header';
import { getEntities } from '@/lib/db/queries';
import { prisma } from '@/lib/prisma';
import { getOrgContext } from '@/lib/org';
import OrgChartPageClient from './OrgChartPageClient';

export const dynamic = 'force-dynamic';

export default async function OrgChartPage() {
  const orgCtx = await getOrgContext();
  const organisationId = orgCtx?.organisationId;

  const [entities, shareholders] = await Promise.all([
    getEntities(),
    organisationId
      ? prisma.shareholder.findMany({
          where: { entityOwnerId: { not: null }, isActive: true, entity: { organisationId } },
          select: { entityId: true, entityOwnerId: true, percentageOwned: true, shareClass: true },
        })
      : Promise.resolve([]),
  ]);

  // Map: entityId → ownership info (who owns it and how much)
  const ownershipMap: Record<string, { ownerEntityId: string; pct: number; shareClass: string }[]> = {};
  for (const s of shareholders) {
    if (!s.entityOwnerId) continue;
    if (!ownershipMap[s.entityId]) ownershipMap[s.entityId] = [];
    ownershipMap[s.entityId].push({ ownerEntityId: s.entityOwnerId, pct: s.percentageOwned, shareClass: s.shareClass });
  }

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-gray-50">
      <Header
        title="Corporate Org Chart"
        subtitle="Interactive group structure — click any entity to view its profile"
      />
      <OrgChartPageClient entities={entities} ownershipMap={ownershipMap} />
    </div>
  );
}
