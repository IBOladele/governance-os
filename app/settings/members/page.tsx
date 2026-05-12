'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import { Users, UserPlus, Trash2, Pencil, CheckCircle, X, AlertCircle } from 'lucide-react';

const ROLES = ['super_admin', 'admin', 'legal', 'finance', 'viewer'] as const;
type Role = typeof ROLES[number];

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  admin:       'Admin',
  legal:       'Legal',
  finance:     'Finance',
  viewer:      'Viewer',
};

const ROLE_COLORS: Record<Role, string> = {
  super_admin: 'bg-red-100 text-red-700',
  admin:       'bg-indigo-100 text-indigo-700',
  legal:       'bg-blue-100 text-blue-700',
  finance:     'bg-emerald-100 text-emerald-700',
  viewer:      'bg-gray-100 text-gray-600',
};

interface Member {
  id: string;
  role: Role;
  joinedAt: string;
  user: { id: string; name: string | null; email: string; isActive: boolean };
}

interface Org {
  id: string;
  name: string;
  slug: string;
  plan: string;
  members: Member[];
}

export default function MembersPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [invite, setInvite] = useState({ email: '', name: '', role: 'viewer' as Role });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role>('viewer');

  const load = async () => {
    const res = await fetch('/api/organisations');
    if (res.ok) setOrg(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    const res = await fetch('/api/organisations/members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invite),
    });
    if (res.ok) {
      setSuccess(`${invite.email} added to the organisation.`);
      setInvite({ email: '', name: '', role: 'viewer' });
      setShowInvite(false);
      load();
    } else {
      const j = await res.json();
      setError(j.error || 'Failed to invite user');
    }
    setSaving(false);
  };

  const handleRoleChange = async (memberId: string) => {
    await fetch(`/api/organisations/members/${memberId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: editRole }),
    });
    setEditingId(null);
    load();
  };

  const handleRemove = async (memberId: string, name: string) => {
    if (!confirm(`Remove ${name} from the organisation?`)) return;
    await fetch(`/api/organisations/members/${memberId}`, { method: 'DELETE' });
    load();
  };

  if (loading) {
    return (
      <div>
        <Header title="Team Members" subtitle="Manage who has access to your organisation" />
        <div className="px-8 py-12 text-center text-gray-400">Loading…</div>
      </div>
    );
  }

  if (!org) {
    return (
      <div>
        <Header title="Team Members" subtitle="Manage who has access to your organisation" />
        <div className="px-8 py-12 text-center text-gray-400">Unable to load organisation.</div>
      </div>
    );
  }

  return (
    <div>
      <Header
        title="Team Members"
        subtitle={`${org.name} · ${org.plan.charAt(0).toUpperCase() + org.plan.slice(1)} plan`}
      />
      <div className="px-8 py-6 space-y-6">

        {/* Feedback */}
        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
            <CheckCircle className="w-4 h-4 shrink-0" /> {success}
            <button onClick={() => setSuccess('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Summary + invite button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{org.members.length}</p>
              <p className="text-xs text-gray-500">Team member{org.members.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <UserPlus className="w-4 h-4" /> Invite Member
          </button>
        </div>

        {/* Members table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Member</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {org.members.map(m => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-xs">
                        {(m.user.name || m.user.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{m.user.name || '—'}</p>
                        <p className="text-xs text-gray-500">{m.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {editingId === m.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editRole}
                          onChange={e => setEditRole(e.target.value as Role)}
                          className="text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                        <button onClick={() => handleRoleChange(m.id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:bg-gray-100 rounded">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[m.role]}`}>
                        {ROLE_LABELS[m.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {new Date(m.joinedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditingId(m.id); setEditRole(m.role); }}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Change role"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemove(m.id, m.user.name || m.user.email)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove from organisation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Role guide */}
        <div className="bg-gray-50 rounded-xl border border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-600 mb-3">Role permissions</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs text-gray-500">
            {([
              { role: 'super_admin', desc: 'Full access incl. shareholding, user management, org settings' },
              { role: 'admin',       desc: 'All features except shareholding; can invite members' },
              { role: 'legal',       desc: 'Entities, compliance, directors, board meetings, licenses' },
              { role: 'finance',     desc: 'Capital, bank accounts, financial key dates' },
              { role: 'viewer',      desc: 'Read-only access to all non-sensitive data' },
            ] as { role: Role; desc: string }[]).map(({ role, desc }) => (
              <div key={role} className="space-y-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[role]}`}>
                  {ROLE_LABELS[role]}
                </span>
                <p className="leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Invite Team Member</h2>
                <p className="text-xs text-gray-400 mt-0.5">They'll have immediate access once added</p>
              </div>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="px-6 py-5 space-y-4">
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Email address *</label>
                <input
                  required type="email"
                  value={invite.email} onChange={e => setInvite(p => ({ ...p, email: e.target.value }))}
                  placeholder="alice@example.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Full name</label>
                <input
                  value={invite.name} onChange={e => setInvite(p => ({ ...p, name: e.target.value }))}
                  placeholder="Alice Smith"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                <select
                  value={invite.role} onChange={e => setInvite(p => ({ ...p, role: e.target.value as Role }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowInvite(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50">
                  {saving ? 'Adding…' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
