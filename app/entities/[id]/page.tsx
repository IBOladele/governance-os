import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import Header from '@/components/layout/Header';
import {
  getEntities, getDirectors, getComplianceObligations, getLicenses,
  getRegulatoryCapital, getBoardMeetings
} from '@/lib/db/queries';
import { formatDate, formatCurrency, getStatusColor, getFlagEmoji, daysUntil } from '@/lib/utils';
import { ArrowLeft, Shield, Calendar, TrendingUp, Users, Building2, ExternalLink, Info, FileText } from 'lucide-react';
import Link from 'next/link';
import EntityEditModal from '@/components/entities/EntityEditModal';
import ShareholdersTab from '@/components/entities/ShareholdersTab';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

function HealthScoreRing({ score }: { score: number | null }) {
  if (score === null) return null;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#eab308' : '#ef4444';
  const label = score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'At Risk';
  const bg = score >= 80 ? 'bg-green-50 border-green-200' : score >= 60 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200';
  const circumference = 2 * Math.PI * 20;
  const dashOffset = circumference - (score / 100) * circumference;
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${bg}`}>
      <svg width="52" height="52" viewBox="0 0 52 52">
        <circle cx="26" cy="26" r="20" fill="none" stroke="#e5e7eb" strokeWidth="5" />
        <circle cx="26" cy="26" r="20" fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 26 26)"
        />
        <text x="26" y="30" textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>{score}</text>
      </svg>
      <div>
        <p className="text-xs text-gray-500 font-medium">Health Score</p>
        <p className="text-sm font-bold" style={{ color }}>{label}</p>
      </div>
    </div>
  );
}

export default async function EntityDetailPage({ params }: Props) {
  const { id } = await params;
  const [session, entities, directors, complianceObligations, licenses, regulatoryCapital, boardMeetings] = await Promise.all([
    getServerSession(authOptions),
    getEntities(),
    getDirectors(),
    getComplianceObligations(),
    getLicenses(),
    getRegulatoryCapital(),
    getBoardMeetings()
  ]);
  const isSuperAdmin = session?.user?.role === 'super_admin';

  const entity = entities.find(e => e.id === id);
  if (!entity) notFound();

  const entityDirectors = directors.filter(d => d.entityId === entity.id && d.isActive);
  const entityCompliance = complianceObligations.filter(c => c.entityId === entity.id);
  const entityLicenses = licenses.filter(l => l.entityId === entity.id);
  const entityCapital = regulatoryCapital.find(c => c.entityId === entity.id);
  const entityMeetings = boardMeetings
    .filter(m => m.entityId === entity.id)
    .sort((a, b) => new Date(b.meetingDate).getTime() - new Date(a.meetingDate).getTime())
    .slice(0, 5);
  const parent = entities.find(e => e.id === entity.parentEntityId);
  const subsidiaries = entities.filter(e => e.parentEntityId === entity.id);

  const overdueCompliance = entityCompliance.filter(c => c.status === 'overdue').length;
  const expiredLicenses = entityLicenses.filter(l => l.status === 'expired').length;

  return (
    <div>
      <Header title={entity.name} subtitle={`${entity.country} · ${entity.legalStructure}`} />
      <div className="px-8 py-6 space-y-6">

        <div className="flex items-center justify-between">
          <Link href="/entities" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Back to Entity Registry
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href={`/entities/${entity.id}/tor`}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Terms of Reference
            </Link>
            <EntityEditModal entity={entity} />
          </div>
        </div>

        {(overdueCompliance > 0 || expiredLicenses > 0) && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 flex items-center gap-3">
            <span className="text-red-500 text-lg">⚠</span>
            <p className="text-sm text-red-700 font-medium">
              {[
                overdueCompliance > 0 && `${overdueCompliance} overdue compliance obligation${overdueCompliance > 1 ? 's' : ''}`,
                expiredLicenses > 0 && `${expiredLicenses} expired license${expiredLicenses > 1 ? 's' : ''}`,
              ].filter(Boolean).join(' · ')}
            </p>
          </div>
        )}

        {/* Entity overview */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <span className="text-5xl">{getFlagEmoji(entity.country)}</span>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{entity.name}</h2>
                {entity.formerName && (
                  <p className="text-xs text-gray-400 mt-0.5">Formerly: <span className="font-medium">{entity.formerName}</span></p>
                )}
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
            <div className="flex items-center gap-3">
              <HealthScoreRing score={entity.healthScore} />
              <div className="flex flex-col gap-1 items-end">
                {entity.isLegacyEntity && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                    Ixaris Entity
                  </span>
                )}
                <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${getStatusColor(entity.status)}`}>
                  {entity.status}
                </span>
                {entity.purpose && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 capitalize">
                    {entity.purpose}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 text-sm border-t border-gray-50 pt-5">
            {[
              { label: 'Registration Number', value: entity.registrationNumber, mono: true },
              { label: 'Incorporated', value: formatDate(entity.incorporationDate) },
              { label: 'Financial Year End', value: entity.financialYearEnd },
              { label: 'Governing Law', value: entity.governingLaw },
              { label: 'Regulator', value: entity.regulator, link: entity.regulatorUrl },
              { label: 'Auditor', value: entity.auditor || '—' },
              { label: 'Parent Entity', value: parent?.name ?? '— (HoldCo)' },
            ].map(f => (
              <div key={f.label}>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{f.label}</p>
                {f.link ? (
                  <a href={f.link} target="_blank" rel="noopener noreferrer"
                    className="font-medium text-indigo-600 hover:underline flex items-center gap-1">
                    {f.value}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <p className={`font-medium text-gray-800 ${f.mono ? 'font-mono text-sm' : ''}`}>{f.value as string}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 pt-5 border-t border-gray-50">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Registered Address</p>
            <p className="text-sm font-medium text-gray-800">{entity.registeredAddress}</p>
          </div>

          {entity.notes && (
            <div className="mt-5 pt-5 border-t border-gray-50">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-1">
                <Info className="w-3 h-3" /> Notes
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-line">{entity.notes}</p>
            </div>
          )}

          {subsidiaries.length > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-50">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Direct Subsidiaries ({subsidiaries.length})</p>
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
          const hasRequirement = entityCapital.minimumRequired > 0;
          // Guard against division by zero when no capital requirement is set
          const ratio = hasRequirement ? entityCapital.currentBalance / entityCapital.minimumRequired : null;
          const isBreach  = ratio !== null && ratio < 1;
          const isWarning = ratio !== null && ratio >= 1 && ratio < 1.2;
          // Bar width: cap at 100%, show 0 if no requirement
          const barWidth = hasRequirement
            ? Math.min(100, (entityCapital.currentBalance / (entityCapital.minimumRequired * 3)) * 100)
            : 0;
          return (
            <div className={`rounded-xl border p-6 ${isBreach ? 'bg-red-50 border-red-300' : isWarning ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-100'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-4 h-4 ${isBreach ? 'text-red-600' : 'text-green-600'}`} />
                  <h3 className="font-semibold text-gray-900">Regulatory Capital</h3>
                </div>
                {isBreach   && <span className="text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full">⚠ BREACH — ACTION REQUIRED</span>}
                {isWarning  && <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-3 py-1 rounded-full">Warning — below 20% buffer</span>}
                {!hasRequirement && <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">No minimum set</span>}
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Requirement</p>
                  <p className="text-sm font-medium text-gray-700 leading-tight">{entityCapital.capitalRequirement}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Minimum Required</p>
                  <p className="text-xl font-bold text-gray-900">
                    {hasRequirement ? formatCurrency(entityCapital.minimumRequired, entityCapital.currency) : '—'}
                  </p>
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
                    {ratio !== null ? `${(ratio * 100).toFixed(0)}%` : '—'}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isBreach ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${barWidth}%` }}
                  />
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
            <div className="space-y-2">
              {entityDirectors.map(dir => {
                const apptDate = dir.appointmentDate ? new Date(dir.appointmentDate) : null;
                const tenureYears = apptDate ? Math.floor((Date.now() - apptDate.getTime()) / (365.25 * 86400 * 1000)) : null;
                const isAml = (dir.responsibilities ?? '').toLowerCase().includes('aml');
                return (
                  <div key={dir.id} className="flex items-center justify-between border-b border-gray-50 pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                        {dir.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium text-gray-800">{dir.name}</p>
                          {isAml && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-medium">AML</span>}
                        </div>
                        <p className="text-xs text-gray-400">{dir.role}</p>
                      </div>
                    </div>
                    {tenureYears !== null && (
                      <p className="text-xs text-gray-400 shrink-0 ml-2">{tenureYears}yr tenure</p>
                    )}
                  </div>
                );
              })}
              {entityDirectors.length === 0 && <p className="text-sm text-gray-400">No active directors recorded</p>}
            </div>
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
                {entityCompliance.map(c => {
                  const days = daysUntil(c.dueDate);
                  return (
                    <tr key={c.id} className={c.status === 'overdue' ? 'bg-red-50/40' : ''}>
                      <td className="py-3">
                        <p className="font-medium text-gray-800">{c.requirementType}</p>
                        <p className="text-xs text-gray-400 capitalize">{c.recurrence}</p>
                      </td>
                      <td className="py-3 text-gray-600 text-xs">{c.regulator}</td>
                      <td className={`py-3 font-medium text-sm ${c.status === 'overdue' ? 'text-red-600' : days <= 30 ? 'text-orange-600' : 'text-gray-700'}`}>
                        {formatDate(c.dueDate)}
                        {c.status !== 'overdue' && days <= 90 && (
                          <p className="text-xs font-normal text-orange-500">{days}d remaining</p>
                        )}
                      </td>
                      <td className="py-3 text-gray-600 text-xs">{c.owner}</td>
                      <td className="py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getStatusColor(c.status)}`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {entityMeetings.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Board Meetings</h3>
            <div className="space-y-3">
              {entityMeetings.map(m => (
                <div key={m.id} className="flex items-start justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.meetingType}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{m.agenda}</p>
                    {m.chair && <p className="text-xs text-gray-400 mt-0.5">Chair: {m.chair}</p>}
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

        {/* Shareholders — super_admin only */}
        {isSuperAdmin && (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <ShareholdersTab
              entityId={entity.id}
              entities={entities.map(e => ({ id: e.id, name: e.name }))}
            />
          </div>
        )}

      </div>
    </div>
  );
}
