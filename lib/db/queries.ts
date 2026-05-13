// EntityOS – Prisma-backed data queries
// All functions are org-scoped: they resolve the caller's organisationId from
// the session (via getOrgContext) and filter every query accordingly.
// If the session is absent, functions return empty arrays / null — no data leaks.

import prisma from '@/lib/prisma';
import { getOrgContext } from '@/lib/org';
import type {
  Entity,
  Director,
  BoardMeeting,
  MeetingAttendee,
  MeetingDocument,
  MeetingResolution,
  ComplianceObligation,
  License,
  RegulatoryCapital,
  BankAccount,
  Alert,
  Document,
  Submission,
} from './schema';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const iso = (d: Date | null | undefined): string => (d ? d.toISOString() : '');
const isoOrNull = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

/** Resolves the caller's org from session. Returns null if unauthenticated. */
async function getOrgId(): Promise<string | null> {
  const ctx = await getOrgContext();
  return ctx?.organisationId ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Entities
// ─────────────────────────────────────────────────────────────────────────────

export async function getEntities(): Promise<Entity[]> {
  const organisationId = await getOrgId();
  if (!organisationId) return [];

  const rows = await prisma.entity.findMany({
    where: { organisationId },
    orderBy: { name: 'asc' },
  });
  rows.sort((a, b) => {
    const aHoldCo = a.parentEntityId === null || a.parentEntityId === '';
    const bHoldCo = b.parentEntityId === null || b.parentEntityId === '';
    if (aHoldCo && !bHoldCo) return -1;
    if (bHoldCo && !aHoldCo) return 1;
    const aDissolved = a.status === 'dissolved';
    const bDissolved = b.status === 'dissolved';
    if (aDissolved && !bDissolved) return 1;
    if (bDissolved && !aDissolved) return -1;
    return a.name.localeCompare(b.name);
  });
  return rows.map((e) => ({
    id: e.id,
    name: e.name,
    country: e.country,
    legalStructure: e.legalStructure,
    registrationNumber: e.registrationNumber,
    registeredAddress: e.registeredAddress,
    incorporationDate: iso(e.incorporationDate),
    financialYearEnd: e.financialYearEnd,
    governingLaw: e.governingLaw,
    auditor: e.auditor ?? '',
    parentEntityId: e.parentEntityId,
    regulator: e.regulator ?? '',
    regulatorUrl: (e as any).regulatorUrl ?? null,
    formerName: (e as any).formerName ?? null,
    purpose: (e as any).purpose ?? null,
    isLegacyEntity: e.isLegacyEntity,
    status: e.status,
    healthScore: (e as any).healthScore ?? null,
    notes: e.notes ?? null,
    createdAt: iso(e.createdAt),
    updatedAt: iso(e.updatedAt),
  }));
}

export async function getEntityById(id: string): Promise<Entity | null> {
  const organisationId = await getOrgId();
  if (!organisationId) return null;

  // Use findFirst with organisationId to prevent cross-tenant ID enumeration
  const e = await prisma.entity.findFirst({ where: { id, organisationId } });
  if (!e) return null;
  return {
    id: e.id,
    name: e.name,
    country: e.country,
    legalStructure: e.legalStructure,
    registrationNumber: e.registrationNumber,
    registeredAddress: e.registeredAddress,
    incorporationDate: iso(e.incorporationDate),
    financialYearEnd: e.financialYearEnd,
    governingLaw: e.governingLaw,
    auditor: e.auditor ?? '',
    parentEntityId: e.parentEntityId,
    regulator: e.regulator ?? '',
    regulatorUrl: (e as any).regulatorUrl ?? null,
    formerName: (e as any).formerName ?? null,
    purpose: (e as any).purpose ?? null,
    isLegacyEntity: e.isLegacyEntity,
    status: e.status,
    healthScore: (e as any).healthScore ?? null,
    notes: e.notes ?? null,
    createdAt: iso(e.createdAt),
    updatedAt: iso(e.updatedAt),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Directors
// ─────────────────────────────────────────────────────────────────────────────

export async function getDirectors(): Promise<Director[]> {
  const organisationId = await getOrgId();
  if (!organisationId) return [];

  const rows = await prisma.director.findMany({
    where: { entity: { organisationId } },
    orderBy: { name: 'asc' },
  });
  return rows.map((d) => ({
    id: d.id,
    entityId: d.entityId,
    name: d.name,
    email: d.email ?? '',
    role: d.role,
    appointmentDate: iso(d.appointmentDate),
    termExpiry: isoOrNull(d.termExpiry),
    nationality: d.nationality ?? '',
    isActive: d.isActive,
    responsibilities: (d as any).responsibilities ?? null,
    guideUrl: (d as any).guideUrl ?? null,
    createdAt: iso(d.createdAt),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Board meetings
// ─────────────────────────────────────────────────────────────────────────────

export async function getBoardMeetings(): Promise<BoardMeeting[]> {
  const organisationId = await getOrgId();
  if (!organisationId) return [];

  const rows = await prisma.boardMeeting.findMany({
    where: { entity: { organisationId } },
    orderBy: { meetingDate: 'asc' },
  });
  return rows.map((m) => ({
    id: m.id,
    entityId: m.entityId,
    meetingType: m.meetingType,
    meetingDate: m.meetingDate.toISOString().slice(0, 10),
    meetingTime: m.meetingTime,
    timezone: m.timezone,
    locationType: m.locationType,
    location: m.location ?? '',
    virtualLink: m.virtualLink,
    agenda: m.agenda,
    chair: m.chair,
    quorumRequired: m.quorumRequired,
    status: m.status,
    minutes: m.minutes,
    notes: m.notes,
    recurrence: m.recurrence,
    createdBy: m.createdBy,
    createdAt: iso(m.createdAt),
    updatedAt: iso(m.updatedAt),
    heldAt: isoOrNull(m.heldAt),
    confirmedBy: m.confirmedBy,
    directorsPresent: m.directorsPresent,
    minutesUrl: m.minutesUrl,
  }));
}

export async function getMeetingAttendees(meetingId?: string): Promise<MeetingAttendee[]> {
  const organisationId = await getOrgId();
  if (!organisationId) return [];

  const rows = await prisma.meetingAttendee.findMany({
    where: {
      ...(meetingId ? { meetingId } : {}),
      meeting: { entity: { organisationId } },
    },
  });
  return rows.map((a) => ({
    id: a.id,
    meetingId: a.meetingId,
    directorId: a.directorId,
    status: a.status,
    invitedAt: iso(a.invitedAt),
    respondedAt: isoOrNull(a.respondedAt),
  }));
}

export async function getMeetingDocuments(meetingId?: string): Promise<MeetingDocument[]> {
  const organisationId = await getOrgId();
  if (!organisationId) return [];

  const rows = await prisma.meetingDocument.findMany({
    where: {
      ...(meetingId ? { meetingId } : {}),
      meeting: { entity: { organisationId } },
    },
  });
  return rows.map((d) => ({
    id: d.id,
    meetingId: d.meetingId,
    name: d.name,
    fileType: d.fileType,
    fileSize: d.fileSize,
    uploadedBy: d.uploadedBy,
    uploadedAt: iso(d.uploadedAt),
    category: d.category,
    storageUrl: (d as any).storageUrl ?? null,
  }));
}

export async function getMeetingResolutions(meetingId?: string): Promise<MeetingResolution[]> {
  const organisationId = await getOrgId();
  if (!organisationId) return [];

  const rows = await prisma.meetingResolution.findMany({
    where: {
      ...(meetingId ? { meetingId } : {}),
      meeting: { entity: { organisationId } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    meetingId: r.meetingId,
    title: r.title,
    description: r.description,
    proposedBy: r.proposedBy,
    votesFor: r.votesFor,
    votesAgainst: r.votesAgainst,
    votesAbstain: r.votesAbstain,
    status: r.status,
    notes: r.notes,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Compliance
// ─────────────────────────────────────────────────────────────────────────────

export async function getComplianceObligations(): Promise<ComplianceObligation[]> {
  const organisationId = await getOrgId();
  if (!organisationId) return [];

  const rows = await prisma.complianceObligation.findMany({
    where: { entity: { organisationId } },
    orderBy: { dueDate: 'asc' },
  });
  return rows.map((c) => ({
    id: c.id,
    entityId: c.entityId,
    requirementType: c.requirementType,
    regulator: c.regulator,
    description: c.description,
    dueDate: iso(c.dueDate),
    submittedDate: isoOrNull(c.submittedDate),
    status: c.status,
    owner: c.owner,
    notes: c.notes ?? '',
    recurrence: c.recurrence,
    createdAt: iso(c.createdAt),
    updatedAt: iso(c.updatedAt),
    filingReference: c.filingReference,
    confirmedBy: c.confirmedBy,
    completedAt: isoOrNull(c.completedAt),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Licenses
// ─────────────────────────────────────────────────────────────────────────────

export async function getLicenses(): Promise<License[]> {
  const organisationId = await getOrgId();
  if (!organisationId) return [];

  const rows = await prisma.license.findMany({
    where: { entity: { organisationId } },
    orderBy: { expiryDate: 'asc' },
  });
  return rows.map((l) => ({
    id: l.id,
    entityId: l.entityId,
    licenseType: l.licenseType,
    regulator: l.regulator,
    licenseNumber: l.licenseNumber,
    issueDate: iso(l.issueDate),
    expiryDate: iso(l.expiryDate),
    renewalRequired: l.renewalRequired,
    renewalLeadDays: l.renewalLeadDays,
    status: l.status,
    documentUrl: l.documentUrl,
    notes: l.notes ?? '',
    createdAt: iso(l.createdAt),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Regulatory capital
// ─────────────────────────────────────────────────────────────────────────────

export async function getRegulatoryCapital(): Promise<RegulatoryCapital[]> {
  const organisationId = await getOrgId();
  if (!organisationId) return [];

  const rows = await prisma.regulatoryCapital.findMany({
    where: { entity: { organisationId } },
  });
  return rows.map((r) => ({
    id: r.id,
    entityId: r.entityId,
    capitalRequirement: r.capitalRequirement,
    currency: r.currency,
    minimumRequired: r.minimumRequired,
    currentBalance: r.currentBalance,
    bufferPercentage: r.bufferPercentage,
    lastUpdated: iso(r.lastUpdated),
    notes: r.notes ?? '',
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Bank accounts
// ─────────────────────────────────────────────────────────────────────────────

export async function getBankAccounts(): Promise<BankAccount[]> {
  const organisationId = await getOrgId();
  if (!organisationId) return [];

  const rows = await prisma.bankAccount.findMany({
    where: { entity: { organisationId } },
  });
  return rows.map((b) => ({
    id: b.id,
    entityId: b.entityId,
    bankName: b.bankName,
    accountNumber: b.accountNumber,
    currency: b.currency,
    balance: b.balance,
    minRequiredBalance: b.minRequiredBalance,
    lastUpdated: iso(b.lastUpdated),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Alerts
// ─────────────────────────────────────────────────────────────────────────────

export async function getAlerts(): Promise<Alert[]> {
  const organisationId = await getOrgId();
  if (!organisationId) return [];

  const rows = await prisma.alert.findMany({
    where: { entity: { organisationId } },
    orderBy: { createdAt: 'desc' },
    include: { entity: { select: { name: true } } },
  });
  return rows.map((a) => ({
    id: a.id,
    entityId: a.entityId,
    entityName: a.entity.name,
    title: a.title,
    message: a.message,
    severity: a.severity,
    status: a.status,
    category: a.category,
    relatedId: a.relatedId,
    createdAt: iso(a.createdAt),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Documents
// ─────────────────────────────────────────────────────────────────────────────

export async function getDocuments(): Promise<Document[]> {
  const organisationId = await getOrgId();
  if (!organisationId) return [];

  const rows = await prisma.document.findMany({
    where: { entity: { organisationId } },
    orderBy: { uploadedAt: 'desc' },
  });
  return rows.map((d) => ({
    id: d.id,
    entityId: d.entityId,
    name: d.name,
    category: d.category,
    fileType: d.fileType,
    fileSize: d.fileSize,
    uploadedBy: d.uploadedBy,
    storageUrl: d.storageUrl ?? null,
    uploadedAt: iso(d.uploadedAt),
    version: d.version,
    tags: d.tags,
    notes: d.notes ?? null,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Submissions
// ─────────────────────────────────────────────────────────────────────────────

export async function getSubmissions(): Promise<Submission[]> {
  // Submissions are not entity-scoped in the schema; access is gated at the
  // API route level (requireAdmin). No org filter applied here.
  const rows = await (prisma as any).submission.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map((s: any) => ({
    id: s.id,
    type: s.type,
    title: s.title,
    description: s.description,
    pageUrl: s.pageUrl,
    component: s.component,
    severity: s.severity,
    area: s.area,
    priority: s.priority,
    submittedBy: s.submittedBy,
    status: s.status,
    prdContent: s.prdContent,
    prdGeneratedAt: isoOrNull(s.prdGeneratedAt),
    slackMessageTs: s.slackMessageTs,
    approvedBy: s.approvedBy,
    approvedAt: isoOrNull(s.approvedAt),
    rejectedBy: s.rejectedBy,
    rejectedAt: isoOrNull(s.rejectedAt),
    rejectionNote: s.rejectionNote,
    implementedAt: isoOrNull(s.implementedAt),
    implementationNote: s.implementationNote,
    createdAt: iso(s.createdAt),
    updatedAt: iso(s.updatedAt),
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk "everything" fetcher
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllData() {
  const [
    entities,
    directors,
    boardMeetings,
    complianceObligations,
    licenses,
    regulatoryCapital,
    bankAccounts,
    alerts,
    documents,
  ] = await Promise.all([
    getEntities(),
    getDirectors(),
    getBoardMeetings(),
    getComplianceObligations(),
    getLicenses(),
    getRegulatoryCapital(),
    getBankAccounts(),
    getAlerts(),
    getDocuments(),
  ]);
  return {
    entities,
    directors,
    boardMeetings,
    complianceObligations,
    licenses,
    regulatoryCapital,
    bankAccounts,
    alerts,
    documents,
  };
}
