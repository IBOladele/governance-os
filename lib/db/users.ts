// EntityOS User Store
// In-memory user database (mirrors the Prisma User schema).
// In production, swap all reads/writes here for Prisma DB calls.

export type UserRole = 'super_admin' | 'admin' | 'legal' | 'finance' | 'viewer';

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  legal: 'Legal',
  finance: 'Finance',
  viewer: 'Viewer',
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  super_admin: ['entities', 'directors', 'compliance', 'licenses', 'capital', 'alerts', 'documents', 'admin'],
  admin:       ['entities', 'directors', 'compliance', 'licenses', 'capital', 'alerts', 'documents'],
  legal:       ['entities', 'directors', 'compliance', 'licenses', 'alerts', 'documents'],
  finance:     ['entities', 'compliance', 'capital', 'alerts'],
  viewer:      ['entities', 'directors', 'compliance', 'licenses'],
};

export interface AppUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: UserRole;
  department: string;
  title: string;
  isActive: boolean;
  oktaId?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Seed data ────────────────────────────────────────────────────────────────
// These users would be seeded into the DB via prisma/seed.ts in production.

export let users: AppUser[] = [
  {
    id: 'usr-001',
    name: 'Alex Chen',
    email: 'admin@governanceos.app',
    role: 'super_admin',
    department: 'Executive',
    title: 'CEO',
    isActive: true,
    oktaId: 'okta|admin.user',
    lastLoginAt: new Date().toISOString(),
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'usr-002',
    name: 'Ankit Darak',
    email: 'ankit.darak@governanceos.app',
    role: 'admin',
    department: 'Legal',
    title: 'General Counsel',
    isActive: true,
    oktaId: 'okta|ankit.darak',
    lastLoginAt: '2026-04-08T09:15:00Z',
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2026-04-08T09:15:00Z',
  },
  {
    id: 'usr-003',
    name: 'Deepa Narayan',
    email: 'deepa.narayan@governanceos.app',
    role: 'legal',
    department: 'Legal',
    title: 'Head of Regulatory Affairs',
    isActive: true,
    oktaId: 'okta|deepa.narayan',
    lastLoginAt: '2026-04-07T14:22:00Z',
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2026-04-07T14:22:00Z',
  },
  {
    id: 'usr-004',
    name: 'Marcus Lai',
    email: 'marcus.lai@governanceos.app',
    role: 'finance',
    department: 'Finance',
    title: 'VP Regulatory Capital',
    isActive: true,
    oktaId: 'okta|marcus.lai',
    lastLoginAt: '2026-04-09T08:00:00Z',
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2026-04-09T08:00:00Z',
  },
  {
    id: 'usr-005',
    name: 'Sophie Chen',
    email: 'sophie.chen@governanceos.app',
    role: 'legal',
    department: 'Compliance',
    title: 'Chief Compliance Officer',
    isActive: true,
    oktaId: 'okta|sophie.chen',
    lastLoginAt: '2026-04-08T16:45:00Z',
    createdAt: '2024-03-15T00:00:00Z',
    updatedAt: '2026-04-08T16:45:00Z',
  },
  {
    id: 'usr-006',
    name: 'James Wright',
    email: 'james.wright@governanceos.app',
    role: 'finance',
    department: 'Finance',
    title: 'Group Finance Controller',
    isActive: true,
    oktaId: 'okta|james.wright',
    lastLoginAt: '2026-04-06T11:30:00Z',
    createdAt: '2024-04-01T00:00:00Z',
    updatedAt: '2026-04-06T11:30:00Z',
  },
  {
    id: 'usr-007',
    name: 'Priya Sharma',
    email: 'priya.sharma@governanceos.app',
    role: 'viewer',
    department: 'Operations',
    title: 'Entity Operations Analyst',
    isActive: true,
    oktaId: 'okta|priya.sharma',
    lastLoginAt: '2026-04-07T10:10:00Z',
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2026-04-07T10:10:00Z',
  },
  {
    id: 'usr-008',
    name: 'David Koh',
    email: 'david.koh@governanceos.app',
    role: 'viewer',
    department: 'Legal',
    title: 'Corporate Paralegal',
    isActive: false,
    oktaId: null,
    lastLoginAt: '2025-12-15T09:00:00Z',
    createdAt: '2024-08-01T00:00:00Z',
    updatedAt: '2025-12-15T09:00:00Z',
  },
];

// ─── CRUD helpers (used by API routes) ───────────────────────────────────────

export function getUsers(): AppUser[] {
  return users;
}

export function getUserById(id: string): AppUser | undefined {
  return users.find(u => u.id === id);
}

export function getUserByEmail(email: string): AppUser | undefined {
  return users.find(u => u.email === email);
}

export function createUser(data: Omit<AppUser, 'id' | 'createdAt' | 'updatedAt'>): AppUser {
  const newUser: AppUser = {
    ...data,
    id: `usr-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  users = [...users, newUser];
  return newUser;
}

export function updateUser(id: string, data: Partial<AppUser>): AppUser | null {
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...data, updatedAt: new Date().toISOString() };
  return users[idx];
}

export function deactivateUser(id: string): AppUser | null {
  return updateUser(id, { isActive: false });
}
