'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/layout/Header';
import Modal from '@/components/ui/Modal';
import { FormField, Input, Select, Button } from '@/components/ui/FormField';
import { Users, Plus, Pencil, UserX, UserCheck, ShieldCheck, Eye, Search, RefreshCw } from 'lucide-react';
import type { AppUser, UserRole } from '@/lib/db/users';
import { ROLE_LABELS, ROLE_PERMISSIONS } from '@/lib/db/users';
import { formatDate } from '@/lib/utils';

// ─── Config ───────────────────────────────────────────────────────────────────

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin — Full system access + user management' },
  { value: 'admin',       label: 'Admin — All modules, no user management' },
  { value: 'legal',       label: 'Legal — Entities, Directors, Compliance, Licenses' },
  { value: 'finance',     label: 'Finance — Entities, Compliance, Regulatory Capital' },
  { value: 'viewer',      label: 'Viewer — Read-only access' },
];

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700 border-purple-200',
  admin:       'bg-indigo-100 text-indigo-700 border-indigo-200',
  legal:       'bg-blue-100 text-blue-700 border-blue-200',
  finance:     'bg-green-100 text-green-700 border-green-200',
  viewer:      'bg-gray-100 text-gray-600 border-gray-200',
};

const ROLE_ICON: Record<UserRole, React.FC<{ className?: string }>> = {
  super_admin: ShieldCheck,
  admin:       ShieldCheck,
  legal:       Users,
  finance:     Users,
  viewer:      Eye,
};

const DEPT_OPTIONS = [
  'Executive', 'Legal', 'Compliance', 'Finance', 'Operations',
  'Technology', 'Risk', 'Product', 'HR',
].map(d => ({ value: d, label: d }));

const BLANK_FORM = { name: '', email: '', role: 'viewer' as UserRole, department: '', title: '' };

// ─── Component ────────────────────────────────────────────────────────────────

export default function UserManagementPage() {
  const [userList, setUserList] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Add modal
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(BLANK_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [addSaved, setAddSaved] = useState(false);

  // Edit modal
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<AppUser | null>(null);
  const [editForm, setEditForm] = useState(BLANK_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [editSaved, setEditSaved] = useState(false);

  // Deactivate confirmation
  const [confirmUser, setConfirmUser] = useState<AppUser | null>(null);
  const [confirmSaving, setConfirmSaving] = useState(false);

  // Selected role for permissions preview
  const [previewRole, setPreviewRole] = useState<UserRole>('viewer');

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch('/api/users');
    const data = await res.json();
    setUserList(data);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const setAdd = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAddForm(prev => ({ ...prev, [field]: e.target.value }));
  const setEdit = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setEditForm(prev => ({ ...prev, [field]: e.target.value }));

  const openEdit = (user: AppUser) => {
    setEditUser(user);
    setEditForm({ name: user.name, email: user.email, role: user.role, department: user.department, title: user.title });
    setEditSaved(false);
    setEditOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddSaving(true);
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(addForm),
    });
    if (res.ok) {
      await fetchUsers();
      setAddSaving(false);
      setAddSaved(true);
      setTimeout(() => { setAddSaved(false); setAddOpen(false); setAddForm(BLANK_FORM); }, 1500);
    } else {
      setAddSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditSaving(true);
    await fetch(`/api/users/${editUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    await fetchUsers();
    setEditSaving(false);
    setEditSaved(true);
    setTimeout(() => { setEditSaved(false); setEditOpen(false); }, 1500);
  };

  const handleDeactivate = async () => {
    if (!confirmUser) return;
    setConfirmSaving(true);
    await fetch(`/api/users/${confirmUser.id}`, { method: 'DELETE' });
    await fetchUsers();
    setConfirmSaving(false);
    setConfirmUser(null);
  };

  const handleReactivate = async (user: AppUser) => {
    await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: true }),
    });
    await fetchUsers();
  };

  // ─── Filtered list ──────────────────────────────────────────────────────────

  const filtered = userList.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !filterRole || u.role === filterRole;
    const matchStatus = !filterStatus || (filterStatus === 'active' ? u.isActive : !u.isActive);
    return matchSearch && matchRole && matchStatus;
  });

  const active = userList.filter(u => u.isActive);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div>
      <Header
        title="User Management"
        subtitle={`${active.length} active users · ${userList.filter(u => !u.isActive).length} deactivated`}
      />
      <div className="px-8 py-6 space-y-6">

        {/* Role stats */}
        <div className="grid grid-cols-5 gap-3">
          {(Object.keys(ROLE_LABELS) as UserRole[]).map(role => {
            const RoleIcon = ROLE_ICON[role];
            const count = active.filter(u => u.role === role).length;
            return (
              <div key={role} className="bg-white rounded-xl border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <RoleIcon className="w-4 h-4 text-gray-400" />
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ROLE_COLORS[role]}`}>
                    {ROLE_LABELS[role]}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search by name or email…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700">
            <option value="">All roles</option>
            {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700">
            <option value="">All users</option>
            <option value="active">Active only</option>
            <option value="inactive">Deactivated only</option>
          </select>
          <button onClick={fetchUsers} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="ml-auto">
            <button
              onClick={() => { setAddSaved(false); setAddForm(BLANK_FORM); setAddOpen(true); }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" /> Invite User
            </button>
          </div>
        </div>

        {/* User table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-gray-400 text-sm">Loading users…</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 uppercase tracking-wide bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium">User</th>
                  <th className="text-left px-6 py-3 font-medium">Role</th>
                  <th className="text-left px-6 py-3 font-medium">Department</th>
                  <th className="text-left px-6 py-3 font-medium">Okta Status</th>
                  <th className="text-left px-6 py-3 font-medium">Last Login</th>
                  <th className="text-left px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(user => {
                  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  const RoleIcon = ROLE_ICON[user.role];
                  return (
                    <tr key={user.id} className={`hover:bg-gray-50 transition-colors group ${!user.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            user.isActive ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <RoleIcon className="w-3.5 h-3.5 text-gray-400" />
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${ROLE_COLORS[user.role]}`}>
                            {ROLE_LABELS[user.role]}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700">{user.department || '—'}</p>
                        <p className="text-xs text-gray-400">{user.title || '—'}</p>
                      </td>
                      <td className="px-6 py-4">
                        {user.oktaId ? (
                          <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Provisioned</span>
                        ) : (
                          <span className="text-xs font-medium text-yellow-700 bg-yellow-50 px-2 py-0.5 rounded-full">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-400">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt.slice(0, 10)) : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        {user.isActive ? (
                          <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Active</span>
                        ) : (
                          <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Deactivated</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openEdit(user)}
                            className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-indigo-600 transition-colors" title="Edit user">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {user.isActive ? (
                            <button onClick={() => setConfirmUser(user)}
                              className="p-1.5 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors" title="Deactivate">
                              <UserX className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button onClick={() => handleReactivate(user)}
                              className="p-1.5 hover:bg-green-50 rounded-lg text-gray-400 hover:text-green-600 transition-colors" title="Reactivate">
                              <UserCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">No users match the selected filters.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Permissions matrix */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Role Permissions</h3>
            <select value={previewRole} onChange={e => setPreviewRole(e.target.value as UserRole)}
              className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-white text-gray-700">
              {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'entities', label: 'Entity Registry' },
              { key: 'directors', label: 'Directors' },
              { key: 'compliance', label: 'Compliance & Finance' },
              { key: 'licenses', label: 'Licenses' },
              { key: 'capital', label: 'Regulatory Capital' },
              { key: 'alerts', label: 'Alerts' },
              { key: 'documents', label: 'Document Vault' },
              { key: 'admin', label: 'User Management' },
            ].map(({ key, label }) => {
              const hasAccess = ROLE_PERMISSIONS[previewRole].includes(key);
              return (
                <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${hasAccess ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-400 line-through'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasAccess ? 'bg-green-500' : 'bg-gray-300'}`} />
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Add User Modal ── */}
      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title="Invite User" subtitle="Add a new user to EntityOS" size="lg">
        {addSaved ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl">✓</div>
            <p className="font-semibold text-green-800">User invited successfully</p>
            <p className="text-sm text-gray-500">They&apos;ll receive an Okta invitation email to activate their account.</p>
          </div>
        ) : (
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name" required className="col-span-2">
                <Input placeholder="Jane Smith" value={addForm.name} onChange={setAdd('name')} required />
              </FormField>
              <FormField label="Work Email" required className="col-span-2">
                <Input type="email" placeholder="jane.smith@governanceos.app" value={addForm.email} onChange={setAdd('email')} required />
              </FormField>
              <FormField label="Role" required className="col-span-2">
                <Select value={addForm.role} onChange={setAdd('role')} options={ROLE_OPTIONS} />
              </FormField>
              <FormField label="Department">
                <Select value={addForm.department} onChange={setAdd('department')} options={DEPT_OPTIONS} placeholder="Select department" />
              </FormField>
              <FormField label="Job Title">
                <Input placeholder="e.g. Legal Counsel" value={addForm.title} onChange={setAdd('title')} />
              </FormField>
            </div>

            {/* Permissions preview */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">This role grants access to</p>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_PERMISSIONS[addForm.role].map(p => (
                  <span key={p} className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full capitalize">{p}</span>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <Button type="button" variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" loading={addSaving}>Send Invitation</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Edit User Modal ── */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit User" subtitle={editUser?.email} size="lg">
        {editSaved ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl">✓</div>
            <p className="font-semibold text-green-800">User updated</p>
          </div>
        ) : (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name" required className="col-span-2">
                <Input value={editForm.name} onChange={setEdit('name')} required />
              </FormField>
              <FormField label="Email Address" required className="col-span-2">
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={setEdit('email')}
                  required
                  placeholder="name@governanceos.app"
                />
                {editForm.email !== editUser?.email && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    ⚠ Changing the email will also update the Okta login identifier.
                  </p>
                )}
              </FormField>
              <FormField label="Role" required className="col-span-2">
                <Select value={editForm.role} onChange={setEdit('role')} options={ROLE_OPTIONS} />
              </FormField>
              <FormField label="Department">
                <Select value={editForm.department} onChange={setEdit('department')} options={DEPT_OPTIONS} placeholder="Select department" />
              </FormField>
              <FormField label="Job Title">
                <Input value={editForm.title} onChange={setEdit('title')} />
              </FormField>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" loading={editSaving}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Deactivate Confirm ── */}
      <Modal isOpen={!!confirmUser} onClose={() => setConfirmUser(null)} title="Deactivate User" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to deactivate <span className="font-semibold text-gray-900">{confirmUser?.name}</span>?
            They will lose all access to EntityOS and their Okta session will be revoked.
          </p>
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setConfirmUser(null)}>Cancel</Button>
            <button
              onClick={handleDeactivate}
              disabled={confirmSaving}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60 transition-colors"
            >
              {confirmSaving ? 'Deactivating…' : 'Deactivate User'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
