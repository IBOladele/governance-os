import { getAlerts, getEntities } from '@/lib/db/queries';
import AlertsClient from './AlertsClient';

export const dynamic = 'force-dynamic';

export default async function AlertsPage() {
  const [alerts, entities] = await Promise.all([getAlerts(), getEntities()]);
  return <AlertsClient alerts={alerts} entities={entities} />;
}
