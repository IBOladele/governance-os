'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  Building2, LayoutDashboard, Calendar, FileText,
  Users, TrendingUp, Bell, ChevronRight, Shield,
  Globe, LogOut, UserCog, ChevronDown, ClipboardList,
  GitBranch, MessageSquarePlus, Settings,
} from 'lucide-react';
import { useState } from 'react';
import type { UserRole } from '@/lib/db/users';
import { ROLE_LABELS } from '@/lib/db/users';

const ALL_NAV = [
  { href: '/dashboard',      label: 'Dashboard',           icon: LayoutDashboard, module: 'entities' },
  { href: '/entities',       label: 'Entities',             icon: Building2,       module: 'entities' },
  { href: '/org-chart',      label: 'Org Chart',            icon: GitBranch,       module: 'entities' },
  { href: '/directors',      label: 'Directors',            icon: Users,           module: 'directors' },
  { href: '/board-meetings', label: 'Board Meetings',       icon: ClipboardList,   module: 'meetings' },
  { href: '/calendar',       label: 'Key Dates',            icon: Calendar,        module: 'compliance' },
  { href: '/compliance',     label: 'Compliance & Finance', icon: Calendar,        module: 'compliance' },
  { href: '/licenses',       label: 'Licenses',             icon: Shield,          module: 'licenses' },
  { href: '/capital',        label: 'Regulatory Capital',   icon: TrendingUp,      module: 'capital' },
  { href: '/alerts',         label: 'Alerts',               icon: Bell,            module: 'alerts',    badge: true },
  { href: '/documents',      label: 'Document Vault',       icon: FileText,        module: 'documents' },
];

// Platform Overview is shown only to the platform owner (identified by org-default-001
// in dev/seed mode, or by NEXT_PUBLIC_PLATFORM_OWNER_EMAIL in production).
// All other admin items are visible to super_admin + admin within any org.
const ADMIN_NAV = [
  { href: '/admin/users',       label: 'User Management', icon: UserCog,           module: 'admin',    platformOnly: false },
  { href: '/admin/submissions', label: 'Submissions',     icon: MessageSquarePlus, module: 'admin',    platformOnly: false },
  { href: '/settings/members',  label: 'Team Members',    icon: Settings,          module: 'admin',    platformOnly: false },
  { href: '/admin/platform',    label: 'Platform Overview', icon: Globe,            module: 'platform', platformOnly: true  },
];

// Permissions per role (matches ROLE_PERMISSIONS in users.ts — duplicated to avoid a server import in this client component)
const PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ['entities', 'directors', 'meetings', 'compliance', 'licenses', 'capital', 'alerts', 'documents', 'admin', 'platform'],
  admin:       ['entities', 'directors', 'meetings', 'compliance', 'licenses', 'capital', 'alerts', 'documents', 'admin'],
  legal:       ['entities', 'directors', 'meetings', 'compliance', 'licenses', 'alerts', 'documents'],
  finance:     ['entities', 'compliance', 'capital', 'alerts'],
  viewer:      ['entities', 'directors', 'compliance', 'licenses'],
};

const ROLE_BADGE: Record<UserRole, string> = {
  super_admin: 'bg-purple-500/20 text-purple-200',
  admin:       'bg-indigo-500/20 text-indigo-200',
  legal:       'bg-blue-500/20 text-blue-200',
  finance:     'bg-green-500/20 text-green-200',
  viewer:      'bg-slate-500/20 text-slate-300',
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [profileOpen, setProfileOpen] = useState(false);

  // When auth is disabled, fall back to the seed super_admin so the UI is fully functional
  const AUTH_DISABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED !== 'true';
  const fallbackUser = { name: 'Ibrahim Oladele', email: 'ibrahim@monsterlabs.org', role: 'super_admin' as UserRole, department: 'Executive', title: 'CEO', organisationId: 'org-default-001', organisationName: 'Monster Labs' };

  const user = session?.user ?? (AUTH_DISABLED ? fallbackUser : null);
  const role = (user?.role ?? 'super_admin') as UserRole;
  const perms = PERMISSIONS[role] ?? PERMISSIONS.super_admin;

  // Platform Overview is exclusive to the platform owner (operator of this EntityOS instance).
  // Identified by organisationId === 'org-default-001' (seed/platform org) or by
  // NEXT_PUBLIC_PLATFORM_OWNER_EMAIL env var matching the user's email.
  const platformOwnerEmail = process.env.NEXT_PUBLIC_PLATFORM_OWNER_EMAIL?.toLowerCase();
  const isPlatformOwner =
    (user as any)?.organisationId === 'org-default-001' ||
    (platformOwnerEmail && (user as any)?.email?.toLowerCase() === platformOwnerEmail);

  const visibleNav   = ALL_NAV.filter(item => perms.includes(item.module));
  const visibleAdmin = ADMIN_NAV.filter(item =>
    perms.includes(item.module) && (!item.platformOnly || isPlatformOwner)
  );

  const initials = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() ?? 'PN';

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col shrink-0">
      {/* Logo + org */}
      <div className="px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm leading-tight truncate">
              {(user as any)?.organisationName || 'EntityOS'}
            </p>
            <p className="text-slate-400 text-xs">EntityOS Platform</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map(({ href, label, icon: Icon, badge }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {badge && <span className="w-2 h-2 bg-red-400 rounded-full" />}
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
            </Link>
          );
        })}

        {/* Admin section */}
        {visibleAdmin.length > 0 && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Admin</p>
            </div>
            {visibleAdmin.map(({ href, label, icon: Icon }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User profile */}
      <div className="px-3 py-3 border-t border-slate-700">
        <button
          onClick={() => setProfileOpen(p => !p)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-white truncate">{user?.name ?? 'Loading…'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_BADGE[role]}`}>
                {ROLE_LABELS[role]}
              </span>
            </div>
          </div>
          <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform shrink-0', profileOpen && 'rotate-180')} />
        </button>

        {profileOpen && (
          <div className="mt-1 mx-1 bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
            <div className="px-4 py-3 border-b border-slate-700">
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              {(user as any)?.department && (
                <p className="text-xs text-slate-500 mt-0.5">{(user as any).department} · {(user as any).title}</p>
              )}
              {(user as any)?.organisationName && (
                <p className="text-xs text-indigo-400 mt-1 font-medium truncate">{(user as any).organisationName}</p>
              )}
            </div>
            <button
              onClick={() => AUTH_DISABLED ? undefined : signOut({ callbackUrl: '/login' })}
              className={`w-full flex items-center gap-2 px-4 py-3 text-sm transition-colors ${AUTH_DISABLED ? 'text-slate-500 cursor-default' : 'text-red-400 hover:bg-slate-700 hover:text-red-300'}`}
              title={AUTH_DISABLED ? 'Auth disabled — enable Okta to sign out' : undefined}
            >
              <LogOut className="w-4 h-4" />
              {AUTH_DISABLED ? 'Auth disabled' : 'Sign out'}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
