import Header from '@/components/layout/Header';
import { getLicenses, getEntities } from '@/lib/db/queries';
import LicensesClient from './LicensesClient';

export const dynamic = 'force-dynamic';

export default async function LicensesPage() {
  const [licenses, entities] = await Promise.all([getLicenses(), getEntities()]);

  return (
    <div>
      <Header
        title="License Management"
        subtitle={`${licenses.length} licenses across ${new Set(licenses.map(l => l.entityId)).size} entities`}
      />
      <LicensesClient initialLicenses={licenses} entities={entities} />
    </div>
  );
}
