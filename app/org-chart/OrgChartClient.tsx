'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getFlagEmoji, getStatusColor } from '@/lib/utils';
import type { Entity } from '@/lib/db/schema';
import { ChevronDown, ChevronRight, Building2, ExternalLink } from 'lucide-react';

interface Props {
  entities: Entity[];
}

function EntityNode({ entity, entities, depth = 0, defaultOpen = true }: {
  entity: Entity;
  entities: Entity[];
  depth?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen || depth <= 1);
  const children = entities.filter(e => e.parentEntityId === entity.id);
  const hasChildren = children.length > 0;

  const statusDot = entity.status === 'active' ? 'bg-green-400'
    : entity.status === 'dormant' ? 'bg-yellow-400'
    : entity.status === 'dissolved' ? 'bg-red-400'
    : 'bg-blue-400';

  return (
    <div className={depth > 0 ? 'ml-6 border-l border-gray-200 pl-4' : ''}>
      <div className="flex items-start gap-2 py-1.5 group">
        {/* Expand toggle */}
        {hasChildren ? (
          <button
            onClick={() => setOpen(o => !o)}
            className="mt-1 shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="mt-1 w-4 shrink-0" />
        )}

        {/* Entity card */}
        <div className={`flex-1 flex items-center gap-3 bg-white border rounded-lg px-3 py-2 hover:shadow-sm transition-all hover:border-indigo-300 ${
          entity.status === 'dissolved' ? 'opacity-50' : ''
        }`}>
          <span className="text-xl">{getFlagEmoji(entity.country)}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900 truncate">{entity.name}</p>
              {entity.isLegacyEntity && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">Legacy</span>
              )}
              {entity.purpose && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 capitalize">{entity.purpose}</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{entity.country} · {entity.legalStructure}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className={`w-2 h-2 rounded-full ${statusDot}`} title={entity.status} />
            {entity.healthScore !== null && (
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                entity.healthScore >= 80 ? 'bg-green-100 text-green-700'
                : entity.healthScore >= 60 ? 'bg-yellow-100 text-yellow-700'
                : 'bg-red-100 text-red-700'
              }`}>
                {entity.healthScore}
              </span>
            )}
            <Link
              href={`/entities/${entity.id}`}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500 hover:text-indigo-700"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
        {hasChildren && (
          <span className="mt-2 text-xs text-gray-400 shrink-0">{children.length}</span>
        )}
      </div>

      {hasChildren && open && (
        <div className="mt-1">
          {children
            .sort((a, b) => {
              const aDiss = a.status === 'dissolved' ? 1 : 0;
              const bDiss = b.status === 'dissolved' ? 1 : 0;
              return aDiss - bDiss || a.name.localeCompare(b.name);
            })
            .map(child => (
              <EntityNode key={child.id} entity={child} entities={entities} depth={depth + 1} defaultOpen={depth < 1} />
            ))}
        </div>
      )}
    </div>
  );
}

export default function OrgChartClient({ entities }: Props) {
  const [showDissolved, setShowDissolved] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = showDissolved ? entities : entities.filter(e => e.status !== 'dissolved');
  const roots = filtered.filter(e => !e.parentEntityId || !filtered.find(p => p.id === e.parentEntityId));

  const searchResults = search.length > 1
    ? entities.filter(e => e.name.toLowerCase().includes(search.toLowerCase()) || e.country.toLowerCase().includes(search.toLowerCase()))
    : [];

  const activeCount = entities.filter(e => e.status === 'active').length;
  const dormantCount = entities.filter(e => e.status === 'dormant').length;
  const dissolvedCount = entities.filter(e => e.status === 'dissolved').length;

  return (
    <div className="px-8 py-6 space-y-6">

      {/* Stats + Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-400 inline-block" /> {activeCount} active</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> {dormantCount} dormant</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" /> {dissolvedCount} dissolved</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            placeholder="Search entities…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-52"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showDissolved}
              onChange={e => setShowDissolved(e.target.checked)}
              className="rounded"
            />
            Show dissolved
          </label>
        </div>
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-3 font-medium">Search results ({searchResults.length})</p>
          <div className="space-y-2">
            {searchResults.map(e => (
              <Link key={e.id} href={`/entities/${e.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span>{getFlagEmoji(e.country)}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{e.name}</p>
                  <p className="text-xs text-gray-400">{e.country} · {e.status}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tree */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-5 pb-4 border-b border-gray-100">
          <Building2 className="w-5 h-5 text-indigo-500" />
          <h2 className="font-semibold text-gray-900">Corporate Group Structure</h2>
          <span className="text-xs text-gray-400 ml-auto">Click ▶ to expand / collapse</span>
        </div>
        <div className="space-y-1">
          {roots.map(root => (
            <EntityNode key={root.id} entity={root} entities={filtered} depth={0} defaultOpen />
          ))}
        </div>
      </div>
    </div>
  );
}
