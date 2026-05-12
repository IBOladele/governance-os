'use client';

import { useState } from 'react';
import { List, Network } from 'lucide-react';
import type { Entity } from '@/lib/db/schema';
import OrgChartClient from './OrgChartClient';
import VisualOrgChart from './VisualOrgChart';

type OwnershipMap = Record<string, { ownerEntityId: string; pct: number; shareClass: string }[]>;

interface Props {
  entities: Entity[];
  ownershipMap: OwnershipMap;
}

export default function OrgChartPageClient({ entities, ownershipMap }: Props) {
  const [view, setView] = useState<'tree' | 'visual'>('visual');

  return (
    <div className="flex-1 p-8 space-y-6">
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 w-fit">
        <button
          onClick={() => setView('visual')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            view === 'visual' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <Network className="w-4 h-4" /> Visual Chart
        </button>
        <button
          onClick={() => setView('tree')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            view === 'tree' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <List className="w-4 h-4" /> Tree View
        </button>
      </div>

      {view === 'visual' ? (
        <VisualOrgChart entities={entities} ownershipMap={ownershipMap} />
      ) : (
        <OrgChartClient entities={entities} />
      )}
    </div>
  );
}
