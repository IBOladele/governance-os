import Header from '@/components/layout/Header';
import prisma from '@/lib/prisma';
import { getOrgContext } from '@/lib/org';
import { formatCurrency, formatDate, getStatusColor, getFlagEmoji, daysUntil } from '@/lib/utils';
import {
  Building2, AlertTriangle, Shield, TrendingUp,
  Calendar, CheckCircle, XCircle, Clock, Zap, GitBranch
} from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const orgCtx = await getOrgContext();
  const organisationId = orgCtx?.organisationId;

  // If no org context (unauthenticated in prod), render empty state
  if (!organisationId) {
    return (
      <div>
        <Header title="Global Control Tower" subtitle="EntityOS" />
        <div className="px-8 py-20 text-center text-gray-400">Loading…</div>
      </div>
    );
  }

  const orgScope  = { entity: { organisationId } };

  // Fetch data in parallel, all scoped to the caller's organisation
  const [
    entities,
    complianceObligations,
    licenses,
    regulatoryCapital,
    alerts,
    boardMeetings,
    allEntities,
  ] = await Promise.all([
    prisma.entity.findMany({ where: { status: 'active', organisationId } }),
    prisma.complianceObligation.findMany({ where: { ...orgScope } }),
    prisma.license.findMany({ where: { ...orgScope } }),
    prisma.regulatoryCapital.findMany({ where: { ...orgScope } }),
    prisma.alert.findMany({ where: { ...orgScope } }),
    prisma.boardMeeting.findMany({ where: { ...orgScope } }),
    prisma.entity.findMany({ where: { organisationId } }),
  ]);

  // Compute KPIs
  const activeEntities = entities.length;
  const overdueCompliance = complianceObligations.filter(c => c.status === 'overdue').length;
  const pendingCompliance = complianceObligations.filter(c => c.status === 'pending').length;
  const expiringLicenses = licenses.filter(l => l.expiryDate != null && daysUntil(l.expiryDate) <= 180).length;
  const expiredLicenses = licenses.filter(l => l.status === 'expired').length;
  const capitalBreaches = regulatoryCapital.filter(c => c.currentBalance < c.minimumRequired).length;
  const unreadAlerts = alerts.filter(a => a.status === 'unread').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.status === 'unread').length;
  const upcomingMeetings = boardMeetings.filter(m => m.status === 'scheduled' && daysUntil(m.meetingDate) >= 0 && daysUntil(m.meetingDate) <= 30).length;

  const kpis = [
    {
      label: 'Active Entities',
      value: activeEntities,
      sub: `${allEntities.length} total`,
      icon: Building2,
      color: 'bg-indigo-500',
      href: '/entities',
    },
    {
      label: 'Compliance Issues',
      value: overdueCompliance + pendingCompliance,
      sub: `${overdueCompliance} overdue`,
      icon: overdueCompliance > 0 ? AlertTriangle : CheckCircle,
      color: overdueCompliance > 0 ? 'bg-red-500' : 'bg-green-500',
      href: '/compliance',
    },
    {
      label: 'License Alerts',
      value: expiringLicenses + expiredLicenses,
      sub: `${expiredLicenses} expired`,
      icon: Shield,
      color: expiredLicenses > 0 ? 'bg-red-500' : 'bg-yellow-500',
      href: '/licenses',
    },
    {
      label: 'Capital Breaches',
      value: capitalBreaches,
      sub: capitalBreaches > 0 ? 'Immediate action required' : 'All entities compliant',
      icon: TrendingUp,
      color: capitalBreaches > 0 ? 'bg-red-500' : 'bg-green-500',
      href: '/capital',
    },
  ];

  const criticalAlertsList = alerts.filter(a => a.severity === 'critical' && a.status === 'unread').slice(0, 4);
  const recentEntities = entities.slice(0, 5);
  const upcomingMeetingsList = boardMeetings
    .filter(m => m.status === 'scheduled' && daysUntil(m.meetingDate) >= 0)
    .sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime())
    .slice(0, 3);

  return (
    <div>
      <Header
        title="Global Control Tower"
        subtitle={`EntityOS — ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`}
      />
      <div className="px-8 py-6 space-y-6">

        {/* Critical banner */}
        {criticalAlerts > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                {criticalAlerts} critical issue{criticalAlerts > 1 ? 's' : ''} require immediate attention
              </p>
              <p className="text-sm text-red-600 mt-0.5">
                Capital breach (UK), expired license (India), overdue filings (Australia, Lithuania)
              </p>
            </div>
            <Link href="/alerts" className="ml-auto shrink-0 text-xs font-medium text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors">
              View all →
            </Link>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <Link key={kpi.label} href={kpi.href} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg ${kpi.color} flex items-center justify-center`}>
                  <kpi.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs text-gray-400 group-hover:text-indigo-500 transition-colors">View →</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-sm font-medium text-gray-700 mt-1">{kpi.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{kpi.sub}</p>
            </Link>
          ))}
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-3 gap-6">

          {/* Critical Alerts */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Critical Alerts</h2>
              <Link href="/alerts" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                View all {unreadAlerts} →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {criticalAlertsList.map(alert => (
                <div key={alert.id} className="px-6 py-4 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{alert.message}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                    {getFlagEmoji(entities.find(e => e.id === alert.entityId)?.country ?? '')} {entities.find(e => e.id === alert.entityId)?.country}
                  </span>
                </div>
              ))}
              {criticalAlertsList.length === 0 && (
                <div className="px-6 py-8 text-center text-sm text-gray-400">
                  <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  No critical alerts
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Board Meetings */}
          <div className="bg-white rounded-xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Board Meetings</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {upcomingMeetingsList.map(meeting => {
                const entity = entities.find(e => e.id === meeting.entityId);
                const days = daysUntil(meeting.meetingDate);
                return (
                  <div key={meeting.id} className="px-6 py-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{entity?.name ?? 'Unknown entity'}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{meeting.meetingType}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-medium text-gray-700">{formatDate(meeting.meetingDate)}</p>
                        <p className="text-xs text-indigo-600 mt-0.5">in {days} days</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {upcomingMeetingsList.length === 0 && (
                <div className="px-6 py-8 text-center text-sm text-gray-400">
                  <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  No upcoming meetings
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Entity Summary Table */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Entity Portfolio</h2>
            <Link href="/entities" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
              Manage all entities →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-50">
                  <th className="text-left px-6 py-3 font-medium">Entity</th>
                  <th className="text-left px-6 py-3 font-medium">Regulator</th>
                  <th className="text-left px-6 py-3 font-medium">Compliance</th>
                  <th className="text-left px-6 py-3 font-medium">Capital</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entities.map(entity => {
                  const entityCompliance = complianceObligations.filter(c => c.entityId === entity.id);
                  const hasOverdue = entityCompliance.some(c => c.status === 'overdue');
                  const entityCapital = regulatoryCapital.find(c => c.entityId === entity.id);
                  const capitalOk = !entityCapital || entityCapital.currentBalance >= entityCapital.minimumRequired;

                  return (
                    <tr key={entity.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">{getFlagEmoji(entity.country)}</span>
                          <div>
                            <Link href={`/entities/${entity.id}`} className="font-medium text-gray-900 hover:text-indigo-600">
                              {entity.name}
                            </Link>
                            <p className="text-xs text-gray-400">{entity.country}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-600 text-xs">{(entity.regulator ?? 'N/A').split(' (')[0]}</td>
                      <td className="px-6 py-3">
                        {hasOverdue ? (
                          <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
                            <XCircle className="w-3.5 h-3.5" /> Overdue
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" /> On track
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        {entityCapital ? (
                          capitalOk ? (
                            <span className="text-xs text-green-600 font-medium">✓ Compliant</span>
                          ) : (
                            <span className="text-xs text-red-600 font-medium">⚠ Breach</span>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(entity.status)}`}>
                          {entity.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Compliance summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Compliance Health</p>
              <Calendar className="w-4 h-4 text-gray-400" />
            </div>
            <div className="space-y-2">
              {[
                { label: 'Completed', count: complianceObligations.filter(c => c.status === 'completed').length, color: 'bg-green-500' },
                { label: 'Pending', count: complianceObligations.filter(c => c.status === 'pending').length, color: 'bg-yellow-500' },
                { label: 'Overdue', count: complianceObligations.filter(c => c.status === 'overdue').length, color: 'bg-red-500' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-xs text-gray-600 flex-1">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">License Health</p>
              <Shield className="w-4 h-4 text-gray-400" />
            </div>
            <div className="space-y-2">
              {[
                { label: 'Active', count: licenses.filter(l => l.status === 'active').length, color: 'bg-green-500' },
                { label: 'Expiring soon', count: licenses.filter(l => l.status === 'active' && l.expiryDate != null && daysUntil(l.expiryDate) <= 180).length, color: 'bg-yellow-500' },
                { label: 'Expired', count: licenses.filter(l => l.status === 'expired').length, color: 'bg-red-500' },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${item.color}`} />
                  <span className="text-xs text-gray-600 flex-1">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-700">Capital Status</p>
              <TrendingUp className="w-4 h-4 text-gray-400" />
            </div>
            <div className="space-y-2">
              {regulatoryCapital.map(cap => {
                const entity = entities.find(e => e.id === cap.entityId);
                const ratio = cap.currentBalance / cap.minimumRequired;
                const ok = ratio >= 1;
                return (
                  <div key={cap.id} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${ratio < 1 ? 'bg-red-500' : ratio < 1.2 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                    <span className="text-xs text-gray-600 flex-1 truncate">{entity?.country}</span>
                    <span className={`text-xs font-semibold ${ratio < 1 ? 'text-red-600' : 'text-green-600'}`}>
                      {(ratio * 100).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick Actions row */}
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</p>
          <div className="flex flex-wrap gap-3">
            <Link href="/org-chart" className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
              <GitBranch className="w-4 h-4" /> View Org Chart
            </Link>
            <Link href="/calendar" className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
              <Calendar className="w-4 h-4" /> Key Dates Calendar
            </Link>
            <Link href="/alerts" className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
              <AlertTriangle className="w-4 h-4" /> View All Alerts
            </Link>
            <Link href="/alerts" className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
              <Zap className="w-4 h-4" /> Alert Centre
            </Link>
            <Link href="/admin/submissions" className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
              <Clock className="w-4 h-4" /> Review Submissions
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
