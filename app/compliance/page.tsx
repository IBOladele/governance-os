import { getComplianceObligations, getEntities } from '@/lib/db/queries';
import ComplianceClient from './ComplianceClient';

export const dynamic = 'force-dynamic';

export default async function CompliancePage() {
  const [complianceObligations, entities] = await Promise.all([
    getComplianceObligations(),
    getEntities(),
  ]);

  return <ComplianceClient initialObligations={complianceObligations} entities={entities} />;
}
