import { Suspense } from 'react';
import Header from '@/components/layout/Header';
import SearchClient from './SearchClient';

export const dynamic = 'force-dynamic';

export default function SearchPage() {
  return (
    <div>
      <Header title="Search" subtitle="Find entities, directors, documents, and meetings" />
      <Suspense fallback={<div className="px-8 py-12 text-sm text-gray-400">Loading…</div>}>
        <SearchClient />
      </Suspense>
    </div>
  );
}
