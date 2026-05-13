'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import { formatDate, getStatusColor, getFlagEmoji, daysUntil } from '@/lib/utils';
import { Building2, Plus, Search, CheckCircle, XCircle, Shield, Activity, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import AddEntityModal from '@/components/entities/AddEntityModal';
import type { Entity, ComplianceObligation, License, RegulatoryCapital } from '@/lib/db/schema';

interface Props {
  entities: Entity[];
  complianceObligations: ComplianceObligation[];
  licenses: License[];
  regulatoryCapital: RegulatoryCapital[];
}

function HealthBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color = score >= 80 ? 'bg-green-100 text-green-700' : score >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  return (
    <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      <Activity className="w-3 h-3" />
      {score}
    </span>
  );
}

export default function EntitiesClient({ entities, complianceObligations, licenses, regulatoryCapital }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filtered = entities.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      e.name.toLowerCase().includes(q) ||
      e.country.toLowerCase().includes(q) ||
      e.registrationNumber.toLowerCase().includes(q) ||
      (e.formerName ?? '').toLowerCase().includes(q) ||
      (e.regulator ?? '').toLowerCase().includes(q);
    const matchCountry = !filterCountry || e.country === filterCountry;
    const matchStatus = !filterStatus || e.status === filterStatus;
    return matchSearch && matchCountry && matchStatus;
  });

  return (
    <div>
      <Header
        title="Entity Registry"
        subtitle={`${entities.length} registered entities across ${new Set(entities.map(e => e.country)).size} jurisdictions`}
      />
      <div className="px-8 py-6 space-y-6">

        {/* Filters bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search name, reg. no., regulator…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700"
            value={filterCountry}
            onChange={e => setFilterCountry(e.target.value)}
          >
            <option value="">All countries</option>
            {[...new Set(entities.map(e => e.country))].sort().map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="dormant">Dormant</option>
            <option value="dissolved">Dissolved</option>
            <option value="in_formation">In Formation</option>
          </select>
          <div className="ml-auto">
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Entity
            </button>
          </div>
        </div>

        {/* Summary row */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>Showing <strong className="text-gray-900">{filtered.length}</strong> of {entities.length} entities</span>
          {(search || filterCountry || filterStatus) && (
            <button onClick={() => { setSearch(''); setFilterCountry(''); setFilterStatus(''); }}
              className="text-indigo-600 hover:text-indigo-700 text-xs underline">Clear filters</button>
          )}
        </div>

        {/* Entity Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          {filtered.map(entity => {
            const entityCompliance = complianceObligations.filter(c => c.entityId === entity.id);
            const entityLicenses = licenses.filter(l => l.entityId === entity.id);
            const entityCapital = regulatoryCapital.find(c => c.entityId === entity.id);
            const overdueCount = entityCompliance.filter(c => c.status === 'overdue').length;
            const expiredLicenses = entityLicenses.filter(l => l.status === 'expired').length;
            const capitalOk = !entityCapital || entityCapital.currentBalance >= entityCapital.minimumRequired;
            const hasIssue = overdueCount > 0 || expiredLicenses > 0 || !capitalOk;

            return (
              <Link
                key={entity.id}
                href={`/entities/${entity.id}`}
                className={`bg-white rounded-xl border p-5 hover:shadow-md transition-all group ${hasIssue ? 'border-red-200' : 'border-gray-100'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getFlagEmoji(entity.country)}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight">
                          {entity.name}
                        </h3>
                        {entity.isLegacyEntity && (
                          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
                            Ixaris
                          </span>
                        )}
                      </div>
                      {entity.formerName && (
                        <p className="text-xs text-gray-400 mt-0.5">Formerly: {entity.formerName}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5">{entity.country} · {entity.legalStructure}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(entity.status)}`}>
                      {entity.status}
                    </span>
                    <HealthBadge score={entity.healthScore} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-4">
                  <div>
                    <span className="text-gray-400">Regulator</span>
                    {entity.regulatorUrl ? (
                      <a
                        href={entity.regulatorUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1 font-medium text-indigo-600 hover:underline truncate"
                      >
                        {(entity.regulator ?? 'N/A').split(' (')[0]}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    ) : (
                      <p className="font-medium text-gray-700 truncate">{(entity.regulator ?? 'N/A').split(' (')[0]}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-gray-400">Auditor</span>
                    <p className="font-medium text-gray-700">{(entity.auditor || '—').split(' ')[0]}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Reg. No.</span>
                    <p className="font-medium text-gray-700 font-mono">{entity.registrationNumber}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">FY End</span>
                    <p className="font-medium text-gray-700">{entity.financialYearEnd}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-1.5">
                    {overdueCount > 0 ? (
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    ) : (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    )}
                    <span className={`text-xs font-medium ${overdueCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {overdueCount > 0 ? `${overdueCount} overdue` : 'Compliance OK'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {entityLicenses.length} license{entityLicenses.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {entityCapital && (
                    <div className="flex items-center gap-1.5 ml-auto">
                      <div className={`w-2 h-2 rounded-full ${capitalOk ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={`text-xs font-medium ${capitalOk ? 'text-green-600' : 'text-red-600'}`}>
                        {capitalOk ? 'Capital OK' : 'Capital breach'}
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-2 bg-white rounded-xl border border-gray-100 p-12 text-center">
              <p className="text-gray-400 text-sm">No entities match your filters.</p>
            </div>
          )}
        </div>

        {/* Corporate Structure */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Corporate Structure</h2>
          <div className="font-mono text-sm text-gray-700 space-y-1.5">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold text-gray-900">EntityOS Holdings Pte. Ltd. (HoldCo — Singapore)</span>
            </div>
            {entities.filter(e => e.parentEntityId === 'ent-001').map((e, i, arr) => (
              <div key={e.id} className="ml-6 flex items-center gap-2 text-gray-600">
                <span className="text-gray-300">{i === arr.length - 1 ? '└' : '├'}</span>
                <span>{getFlagEmoji(e.country)}</span>
                <Link href={`/entities/${e.id}`} className="hover:text-indigo-600 transition-colors">
                  {e.name}
                </Link>
                <span className="text-gray-300">({e.country})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AddEntityModal isOpen={addOpen} onClose={() => setAddOpen(false)} entities={entities} />
    </div>
  );
}
