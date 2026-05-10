import { notFound } from 'next/navigation';
import Header from '@/components/layout/Header';
import {
  getEntities, getDirectors, getComplianceObligations, getLicenses,
  getRegulatoryCapital, getBoardMeetings
} from '@/lib/db/queries';
import { formatDate, formatCurrency, getStatusColor, getFlagEmoji, daysUntil } from '@/lib/utils';
import { ArrowLeft, Shield, Calendar, TrendingUp, Users, Building2 } from 'lucide-react';
import Link from 'next/link';
import EntityEditModal from '@/components/entities/EntityEditModal';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const entities = await getEntities();
  return entities.map(e => ({ id: e.id }));
}

export default async function EntityDetailPage({ params }: Props) {
  const { id } = await params;
  const [entities, directors, complianceObligations, licenses, regulatoryCapital, boardMeetings] = await Promise.all([
    getEntities(),
    getDirectors(),
    getComplianceObligations(),
    getLicenses(),
    getRegulatoryCapital(),
    getBoardMeetings()
  ]);

  const entity = entities.find(e => e.id === id);
  if (!entity) notFound();

  const entityDirectors = directors.filter(d => d.entityId === entity.id && d.isActive);
  const entityCompliance = complianceObligations.filter(c => c.entityId === entity.id);
  const entityLicenses = licenses.filter(l => l.entityId === entity.id);
  const entityCapital = regulatoryCapital.find(c => c.entityId === entity.id);
  const entityMeetings = boardMeetings
    .filter(m => m.entityId === entity.id)
    .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime())
    .slice(0, 3);
  const parent = entities.find(e => e.id === entity.parentEntityId);
  const subsidiaries = entities.filter(e => e.parentEntityId === entity.id);

  return (
    <div>
      <Header title={entity.name} subtitle={`${entity.country} · ${entity.legalStructure}`} />
      <div className="px-8 py-6 space-y-6">

        <div className="flex items-center justify-between">
          <Link href="/entities" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Back to Entity Registry
          </Link>
          <EntityEditModal entity={entity} />
        </div>

        {/* Entity overview */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{getFlagEmoji(entity.country)}</span>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{entity.name}</h2>
                <p className="text-gray-500 mt-0.5">{entity.legalStructure} · {entity.country}</p>
                {parent && (
                  <p className="text-xs text-gray-400 mt-1">
                    Subsidiary of{' '}
                    <Link href={`/entities/${parent.id}`} className="text-indigo-600 hover:underline">
                      {parent.name}
                    </Link>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {entity.isLegacyEntity && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                  Ixaris Entity
                </span>
              )}
              <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${getStatusColor(entity.status)}`}>
                {entity.status}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 text-sm border-t border-gray-50 pt-5">
            {[
              { label: 'Registration Number', value: entity.registrationNumber, mono: true },
              { label: 'Incorporated', value: formatDate(entity.incorporationDate) },
              { label: 'Financial Year End', value: entity.financialYearEnd },
              { label: 'Governing Law', value: entity.governingLaw },
              { label: 'Regulator', value: entity.regulator },
              { label: 'Auditor', value: entity.auditor },
              { label: 'Parent Entity', value: parent?.name ?? '— (HoldCo)' },
            ].map(f => (
              <div key={f.label}>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{f.label}</p>
                <p className={`font-medium text-gray-800 ${f.mono ? 'font-mono text-sm' : ''}`}>{f.value}</p>
              </div>
            ))}
          </div>

          {/* Registered Address */}
          <div className="mt-5 pt-5 border-t border-gray-50">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Registered Address</p>
            <p className="text-sm font-medium text-gray-800">{entity.registeredAddress}</p>
          </div>

          {subsidiaries.length > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-50">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Direct Subsidiaries</p>
              <div className="flex flex-wrap gap-2">
                {subsidiaries.map(sub => (
                  <Link key={sub.id} href={`/entities/${sub.id}`}
                    className="flex items-center gap-1.5 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">
                    {getFlagEmoji(sub.country)} {sub.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Capital */}
        {entityCapital && (() => {
          const ratio = entityCapital.currentBalance / entityCapital.minimumRequired;
          const isBreach = ratio < 1;
          const isWarning = ratio >= 1 && ratio < 1.2;
          return (
            <div className={`rounded-xl border p-6 ${isBreach ? 'bg-red-50 border-red-300' : isWarning ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-4 h-4 ${isBreach ? 'text-red-600' : 'text-green-600'}`} />
                  <h3 className="font-semibold text-gray-900">Regulatory Capital</h3>
                </div>
                {isBreach && <span className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">⚠ BREACH — ACTION REQUIRED</span>}
                {isWarning && <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full">Warning — below 20% buffer</span>}
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Requirement</p>
                  <p className="text-sm font-medium text-gray-700 leading-tight">{entityCapital.capitalRequirement}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Minimum Required</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(entityCapital.minimumRequired, entityCapital.currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Current Balance</p>
                  <p className={`text-xl font-bold ${isBreach ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(entityCapital.currentBalance, entityCapital.currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Coverage</p>
                  <p className={`text-xl font-bold ${isBreach ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-green-600'}`}>
                    {(ratio * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${isBreach ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(100, (entityCapital.currentBalance / (entityCapital.minimumRequired * 3)) * 100)}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1">Last updated: {formatDate(entityCapital.lastUpdated)}</p>
              </div>
            </div>
          );
        })()}

        <div className="grid grid-cols-2 gap-6">
          {/* Licenses */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Licenses ({entityLicenses.length})</h3>
              </div>
              <Link href="/licenses" className="text-xs text-indigo-600 hover:underline">View all →</Link>
            </div>
            <div className="space-y-4">
              {entityLicenses.map(lic => {
                const days = daysUntil(lic.expiryDate);
                return (
                  <div key={lic.id} className="flex items-start justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{lic.licenseType}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{lic.regulator} · <span className="font-mono">{lic.licenseNumber}</span></p>
                      {lic.notes && <p className="text-xs text-orange-600 mt-0.5">{lic.notes}</p>}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(lic.status)}`}>
                        {lic.status}
                      </span>
                      <p className={`text-xs mt-1 ${days < 0 ? 'text-red-600 font-semibold' : days < 60 ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>
                        {days < 0 ? `Expired ${Math.abs(days)}d ago` : `${days}d remaining`}
                      </p>
                    </div>
                  </div>
                );
              })}
              {entityLicenses.length === 0 && <p className="text-sm text-gray-400">No licenses recorded</p>}
            </div>
          </div>

          {/* Directors */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <h3 className="font-semibold text-gray-900">Board ({entityDirectors.length})</h3>
              </div>
              <Link href="/directors" className="text-xs text-indigo-600 hover:underline">View all →</Link>
            </div>
            {/* Executive Directors */}
            {entityDirectors.filter(d => !d.role.toLowerCase().includes('independent')).length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Executive / Non-Executive</p>
                <div className="space-y-2">
                  {entityDirectors.filter(d => !d.role.toLowerCase().includes('independent')).map(dir => (
                    <div key={dir.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                          {dir.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{dir.name}</p>
                          <p className="text-xs text-gray-400">{dir.role}</p>
                        </div>
                      </div>
                      {dir.termExpiry && <p className="text-xs text-gray-400">Until {formatDate(dir.termExpiry)}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Independent Directors */}
            {entityDirectors.filter(d => d.role.toLowerCase().includes('independent')).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Independent Directors</p>
                <div className="space-y-2">
                  {entityDirectors.filter(d => d.role.toLowerCase().includes('independent')).map(dir => (
                    <div key={dir.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-600">
                          {dir.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{dir.name}</p>
                          <p className="text-xs text-gray-400">{dir.role}</p>
                        </div>
                      </div>
                      {dir.termExpiry && <p className="text-xs text-gray-400">Until {formatDate(dir.termExpiry)}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Compliance */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <h3 className="font-semibold text-gray-900">Compliance Obligations ({entityCompliance.length})</h3>
            </div>
            <Link href="/compliance" className="text-xs text-indigo-600 hover:underline">View all →</Link>
          </div>
          {entityCompliance.length === 0 ? (
            <p className="text-sm text-gray-400">No obligations recorded for this entity.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="text-left py-2 font-medium">Obligation</th>
                  <th className="text-left py-2 font-medium">Regulator</th>
                  <th className="text-left py-2 font-medium">Due Date</th>
                  <th className="text-left py-2 font-medium">Owner</th>
                  <th className="text-left py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entityCompliance.map(c => (
                  <tr key={c.id} className={c.status === 'overdue' ? 'bg-red-50/40' : ''}>
                    <td className="py-3">
                      <p className="font-medium text-gray-800">{c.requirementType}</p>
                      <p className="text-xs text-gray-400 capitalize">{c.recurrence}</p>
                    </td>
                    <td className="py-3 text-gray-600 text-xs">{c.regulator}</td>
                    <td className={`py-3 font-medium text-sm ${c.status === 'overdue' ? 'text-red-600' : 'text-gray-700'}`}>
                      {formatDate(c.dueDate)}
                    </td>
                    <td className="py-3 text-gray-600 text-xs">{c.owner}</td>
                    <td className="py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(c.status)}`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Board Meetings */}
        {entityMeetings.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Recent Board Meetings</h3>
            <div className="space-y-3">
              {entityMeetings.map(m => (
                <div key={m.id} className="flex items-start justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.meetingType}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{m.agenda}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{m.location}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-medium text-gray-700">{formatDate(m.meetingDate)}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(m.status)}`}>
                      {m.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
