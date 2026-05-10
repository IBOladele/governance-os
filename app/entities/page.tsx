import EntitiesClient from './EntitiesClient';
import { getEntities, getComplianceObligations, getLicenses, getRegulatoryCapital } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

export default async function EntitiesPage() {
  const [entities, complianceObligations, licenses, regulatoryCapital] = await Promise.all([
    getEntities(),
    getComplianceObligations(),
    getLicenses(),
    getRegulatoryCapital(),
  ]);

  return <EntitiesClient entities={entities} complianceObligations={complianceObligations} licenses={licenses} regulatoryCapital={regulatoryCapital} />;
}
