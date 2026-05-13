'use client';

import { useEffect, useState } from 'react';
import { Building2, Users, Globe, ChevronDown, ChevronRight, Calendar, Shield } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface OrgMember {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    lastLoginAt: string | null;
  };
}

interface OrgEntity {
  id: string;
  name: string;
  country: string;
  status: string;
  legalStructure: string;
}

interface Organisation {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: { entities: number; members: number };
  members: OrgMember[];
  entities: OrgEntity[];
}

function StatCard({ label, value, icon: Icon, colour }: { label: string; value: number; icon: React.ElementType; colour: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colour}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

const STATUS_BADGE: Record<string, string> = {
  active:    'bg-emerald-100 text-emerald-700',
  inactive:  'bg-gray-100 text-gray-500',
  dissolved: 'bg-red-100 text-red-600',
};

const ROLE_BADGE: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin:       'bg-indigo-100 text-indigo-700',
  legal:       'bg-blue-100 text-blue-700',
  finance:     'bg-green-100 text-green-700',
  viewer:      'bg-gray-100 text-gray-500',
};

export default function PlatformAdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Guard: platform owner only (not just any super_admin)
  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.replace('/login'); return; }
    const ownerEmail = process.env.NEXT_PUBLIC_PLATFORM_OWNER_EMAIL?.toLowerCase();
    const userEmail  = (session.user as any).email?.toLowerCase() ?? '';
    const userOrgId  = (session.user as any).organisationId ?? '';
    const isPlatformOwner =
      userOrgId === 'org-default-001' ||
      (ownerEmail && userEmail === ownerEmail);
    if (!isPlatformOwner) router.replace('/dashboard');
  }, [session, status, router]);

  useEffect(() => {
    fetch('/api/admin/platform')
      .then(r => r.json())
      .then(d => {
        if (d.error) { setError(d.error); } else { setOrgs(d.data); }
      })
      .catch(() => setError('Failed to load platform data'))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalEntities = orgs.reduce((s, o) => s + o._count.entities, 0);
  const totalMembers  = orgs.reduce((s, o) => s + o._count.members,  0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6 text-purple-600" />
          Platform Overview
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          All organisations onboarded to EntityOS. Visible to platform owners only.
        </p>
      </div>

      {/* Summary stats */}
      {!loading && !error && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard label="Organisations" value={orgs.length}    icon={Globe}      colour="bg-purple-500" />
          <StatCard label="Total Entities" value={totalEntities} icon={Building2}  colour="bg-indigo-500" />
          <StatCard label="Total Users"    value={totalMembers}  icon={Users}      colour="bg-emerald-500" />
        </div>
      )}

      {/* States */}
      {loading && (
        <div className="text-center py-20 text-gray-400 text-sm">Loading platform data…</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      {/* Org list */}
      {!loading && !error && orgs.map(org => {
        const open = expanded.has(org.id);
        return (
          <div key={org.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

            {/* Org header row */}
            <button
              onClick={() => toggle(org.id)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-sm">
                  {org.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{org.name}</p>
                  <p className="text-xs text-gray-400">/{org.slug}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0 ml-4">
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{org._count.entities}</p>
                  <p className="text-xs text-gray-400">entities</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-gray-900">{org._count.members}</p>
                  <p className="text-xs text-gray-400">members</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(org.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                {open
                  ? <ChevronDown className="w-4 h-4 text-gray-400" />
                  : <ChevronRight className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {/* Expanded detail */}
            {open && (
              <div className="border-t border-gray-100 px-6 py-5 space-y-5">

                {/* Entities */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> Entities ({org.entities.length})
                  </h3>
                  {org.entities.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No entities yet</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {org.entities.map(e => (
                        <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{e.name}</p>
                            <p className="text-xs text-gray-400">{e.country} · {e.legalStructure}</p>
                          </div>
                          <span className={`ml-2 shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[e.status] ?? 'bg-gray-100 text-gray-500'}`}>
                            {e.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Members */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Members ({org.members.length})
                  </h3>
                  {org.members.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No members yet</p>
                  ) : (
                    <div className="space-y-2">
                      {org.members.map(m => (
                        <div key={m.id} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold shrink-0">
                              {m.user.name?.charAt(0).toUpperCase() ?? '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{m.user.name}</p>
                              <p className="text-xs text-gray-400 truncate">{m.user.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 ml-4">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[m.role] ?? 'bg-gray-100 text-gray-500'}`}>
                              {m.role.replace('_', ' ')}
                            </span>
                            {m.user.lastLoginAt && (
                              <span className="text-xs text-gray-400 hidden sm:block">
                                last login {new Date(m.user.lastLoginAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
