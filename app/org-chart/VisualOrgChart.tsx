'use client';

import type { Entity } from '@/lib/db/schema';
import { useRef, useCallback } from 'react';

type OwnershipMap = Record<string, { ownerEntityId: string; pct: number; shareClass: string }[]>;

const REGIONS = [
  {
    name: 'Asia Pacific',
    color: '#0284c7',
    bg: '#f0f9ff',
    border: '#bae6fd',
    countries: ['Singapore', 'Australia', 'Hong Kong', 'Japan', 'Malaysia', 'Indonesia', 'New Zealand', 'India'],
  },
  {
    name: 'United Kingdom',
    color: '#0f766e',
    bg: '#f0fdf4',
    border: '#a7f3d0',
    countries: ['United Kingdom'],
  },
  {
    name: 'Europe & Malta',
    color: '#b45309',
    bg: '#fffbeb',
    border: '#fde68a',
    countries: ['Lithuania', 'Netherlands', 'Malta'],
  },
  {
    name: 'Americas',
    color: '#be123c',
    bg: '#fff1f2',
    border: '#fecdd3',
    countries: ['United States', 'Canada', 'Colombia', 'Mexico', 'Brazil'],
  },
] as const;

// ── Entity card ───────────────────────────────────────────────────────────────
function Card({ entity, accent, ownership }: {
  entity: Entity;
  accent: string;
  ownership?: { pct: number; shareClass: string }[];
}) {
  const score = entity.healthScore;
  const [sbg, sfg] = !score ? ['', '']
    : score >= 80 ? ['#dcfce7', '#166534']
    : score >= 60 ? ['#fef3c7', '#92400e']
    : ['#fee2e2', '#991b1b'];

  const totalPct = ownership?.reduce((s, o) => s + o.pct, 0);

  return (
    <div className="rounded-lg overflow-hidden border border-gray-200 shadow-sm bg-white w-full">
      <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: accent }}>
        <p className="text-xs font-semibold text-white leading-snug flex-1 pr-2 truncate">
          {entity.name}
        </p>
        {score !== null && score !== undefined && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ backgroundColor: sbg, color: sfg }}>
            {score}
          </span>
        )}
      </div>
      <div className="px-3 py-1.5 flex items-center justify-between gap-2">
        <p className="text-[11px] text-gray-500">{entity.country}</p>
        {totalPct != null && totalPct > 0 && (
          <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
            {totalPct.toFixed(0)}%
          </span>
        )}
      </div>
    </div>
  );
}

// ── Single region column ──────────────────────────────────────────────────────
function RegionColumn({
  region, entities, rootId, ownershipMap,
}: {
  region: typeof REGIONS[number];
  entities: Entity[];
  rootId: string;
  ownershipMap: OwnershipMap;
}) {
  const regionEnts = entities.filter(
    e => (region.countries as readonly string[]).includes(e.country) && e.id !== rootId,
  );
  if (!regionEnts.length) return null;

  const regionIds = new Set(regionEnts.map(e => e.id));
  const heads = regionEnts.filter(e => !e.parentEntityId || !regionIds.has(e.parentEntityId));
  const subs  = regionEnts.filter(e => !!e.parentEntityId && regionIds.has(e.parentEntityId));

  return (
    <div
      className="flex-1 min-w-[210px] max-w-xs rounded-xl border p-3 flex flex-col gap-3"
      style={{ borderColor: region.border, backgroundColor: region.bg }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: region.color }}>
          {region.name}
        </span>
        <span className="text-[11px] font-semibold tabular-nums" style={{ color: region.color + 'aa' }}>
          {regionEnts.length}
        </span>
      </div>

      {heads.map(head => {
        const kids = subs.filter(s => s.parentEntityId === head.id);
        return (
          <div key={head.id} className="flex flex-col gap-0">
            <Card entity={head} accent={region.color} ownership={ownershipMap[head.id]} />
            {kids.length > 0 && (
              <div className="relative ml-4 mt-1 flex flex-col gap-1.5">
                <div className="absolute left-0 top-0 bottom-3 w-px" style={{ backgroundColor: region.color + '55' }} />
                {kids.map(kid => (
                  <div key={kid.id} className="relative flex items-start gap-2">
                    <div className="absolute left-0 top-4 h-px w-3" style={{ backgroundColor: region.color + '55' }} />
                    <div className="pl-4 w-full">
                      <Card entity={kid} accent={region.color + 'cc'} ownership={ownershipMap[kid.id]} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Root card ─────────────────────────────────────────────────────────────────
function RootCard({ entity }: { entity: Entity }) {
  return (
    <div className="mx-auto rounded-xl overflow-hidden border-2 border-blue-800 shadow-lg bg-white" style={{ width: 260 }}>
      <div className="px-4 py-3 bg-blue-900">
        <p className="text-sm font-bold text-white">{entity.name}</p>
      </div>
      <div className="px-4 py-2 flex items-center gap-2">
        <p className="text-xs text-gray-500">{entity.country}</p>
        {entity.healthScore !== null && entity.healthScore !== undefined && (
          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-800">
            {entity.healthScore}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Connector between root and regions ────────────────────────────────────────
function TopConnector() {
  return (
    <div className="flex flex-col items-center">
      <div className="w-px h-5 bg-gray-300" />
      <div className="w-full h-px bg-gray-300" />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function VisualOrgChart({ entities, ownershipMap }: { entities: Entity[]; ownershipMap: OwnershipMap }) {
  const wrapRef = useRef<HTMLDivElement>(null);

  const active = entities.filter(e => e.status !== 'dissolved');
  const root   = active.find(e => !e.parentEntityId);
  if (!root) return <p className="text-sm text-gray-500 p-4">No root entity found.</p>;

  const downloadPNG = useCallback(async () => {
    // simple fallback: print the section
    window.print();
  }, []);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <p className="text-xs text-gray-400">Live data · {active.length} entities · {new Set(active.map(e => e.country)).size} jurisdictions</p>
        <div className="ml-auto flex gap-2">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Print / PDF
          </button>
        </div>
      </div>

      {/* Chart */}
      <div ref={wrapRef} className="bg-slate-50 rounded-xl border border-gray-200 p-6 overflow-x-auto">
        <div className="min-w-[860px]">

          {/* Root */}
          <div className="flex flex-col items-center mb-0">
            <RootCard entity={root} />
            <div className="w-px h-5 bg-gray-300 mt-1" />
            <div className="w-3/4 h-px bg-gray-300" />
          </div>

          {/* Drop lines from bus to each region */}
          <div className="flex justify-around">
            {REGIONS.map(r => {
              const has = active.some(e => (r.countries as readonly string[]).includes(e.country) && e.id !== root.id);
              return has ? <div key={r.name} className="w-px h-4 bg-gray-300" /> : null;
            })}
          </div>

          {/* Region columns */}
          <div className="flex gap-4 items-start">
            {REGIONS.map(region => (
              <RegionColumn
                key={region.name}
                region={region}
                entities={active}
                rootId={root.id}
                ownershipMap={ownershipMap}
              />
            ))}
          </div>

          {/* Legend */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex items-center gap-6 text-[11px] text-gray-400">
            <span>Health score: <span className="text-green-700 font-medium">≥80</span> · <span className="text-yellow-700 font-medium">60–79</span> · <span className="text-red-700 font-medium">&lt;60</span></span>
            <span>Dissolved entities hidden</span>
            <span className="ml-auto">EntityOS — Confidential · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
