import { getRegulatoryCapital, getBankAccounts, getEntities } from '@/lib/db/queries';
import CapitalClient from './CapitalClient';

export const dynamic = 'force-dynamic';

export default async function CapitalPage() {
  const [regulatoryCapital, bankAccounts, entities] = await Promise.all([
    getRegulatoryCapital(),
    getBankAccounts(),
    getEntities(),
  ]);

  return <CapitalClient regulatoryCapital={regulatoryCapital} bankAccounts={bankAccounts} entities={entities} />;
}
