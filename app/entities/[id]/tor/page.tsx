import { notFound } from 'next/navigation';
import { getEntities, getDirectors } from '@/lib/db/queries';
import { getJurisdictionTemplate } from '@/lib/tor/jurisdictions';
import TorClient from './TorClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TorPage({ params }: Props) {
  const { id } = await params;
  const [entities, directors] = await Promise.all([getEntities(), getDirectors()]);

  const entity = entities.find(e => e.id === id);
  if (!entity) notFound();

  const activeDirectors = directors.filter(d => d.entityId === id && d.isActive);
  const template = getJurisdictionTemplate(entity.country);

  return (
    <TorClient
      entity={entity}
      directors={activeDirectors}
      template={template}
    />
  );
}
