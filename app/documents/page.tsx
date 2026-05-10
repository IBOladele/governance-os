import Header from '@/components/layout/Header';
import { getEntities, getDocuments } from '@/lib/db/queries';
import DocumentsClient from './DocumentsClient';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage() {
  const [entities, documents] = await Promise.all([getEntities(), getDocuments()]);

  return (
    <div>
      <Header
        title="Document Vault"
        subtitle={`${documents.length} document${documents.length !== 1 ? 's' : ''} · Secure storage with version control`}
      />
      <DocumentsClient entities={entities} initialDocuments={documents} />
    </div>
  );
}
