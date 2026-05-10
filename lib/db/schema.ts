// EntityOS Database Schema

export type EntityStatus = 'active' | 'dormant' | 'dissolved' | 'in_formation';
export type ComplianceStatus = 'pending' | 'submitted' | 'overdue' | 'completed' | 'not_applicable';
export type LicenseStatus = 'active' | 'expired' | 'suspended' | 'pending_renewal';
export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'unread' | 'read' | 'dismissed';
export type MeetingStatus = 'draft' | 'scheduled' | 'completed' | 'cancelled';
export type MeetingLocationType = 'physical' | 'virtual' | 'hybrid';
export type AttendeeStatus = 'invited' | 'accepted' | 'declined' | 'tentative';
export type ResolutionStatus = 'proposed' | 'passed' | 'defeated' | 'deferred';
export type SubmissionType = 'bug' | 'feature';
export type SubmissionStatus = 'open' | 'in_review' | 'approved' | 'implementing' | 'done' | 'rejected';

export interface Entity {
  id: string;
  name: string;
  country: string;
  legalStructure: string;
  registrationNumber: string;
  registeredAddress: string;
  incorporationDate: string;
  financialYearEnd: string;
  governingLaw: string;
  auditor: string;
  parentEntityId: string | null;
  regulator: string;
  regulatorUrl: string | null;
  formerName: string | null;
  purpose: string | null;
  isLegacyEntity: boolean;
  status: EntityStatus;
  healthScore: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Director {
  id: string;
  entityId: string;
  name: string;
  email: string;
  role: string;
  appointmentDate: string;
  termExpiry: string | null;
  nationality: string;
  isActive: boolean;
  responsibilities: string | null;
  guideUrl: string | null;
  createdAt: string;
}

export interface BoardMeeting {
  id: string;
  entityId: string;
  meetingType: string;
  meetingDate: string;        // YYYY-MM-DD
  meetingTime: string;        // HH:MM (24h)
  timezone: string;
  locationType: MeetingLocationType;
  location: string;
  virtualLink: string | null;
  agenda: string;
  chair: string;
  quorumRequired: number;
  status: MeetingStatus;
  minutes: string | null;
  notes: string | null;
  recurrence: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  heldAt: string | null;
  confirmedBy: string | null;
  directorsPresent: number | null;
  minutesUrl: string | null;
}

export interface MeetingAttendee {
  id: string;
  meetingId: string;
  directorId: string;
  status: AttendeeStatus;
  invitedAt: string;
  respondedAt: string | null;
}

export interface MeetingDocument {
  id: string;
  meetingId: string;
  name: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: string;
  category: string;
  storageUrl: string | null;
}

export interface MeetingResolution {
  id: string;
  meetingId: string;
  title: string;
  description: string;
  proposedBy: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  status: ResolutionStatus;
  notes: string | null;
}

export interface ComplianceObligation {
  id: string;
  entityId: string;
  requirementType: string;
  regulator: string;
  description: string;
  dueDate: string;
  submittedDate: string | null;
  status: ComplianceStatus;
  owner: string;
  notes: string;
  recurrence: string;
  createdAt: string;
  updatedAt: string;
  filingReference: string | null;
  confirmedBy: string | null;
  completedAt: string | null;
}

export interface License {
  id: string;
  entityId: string;
  licenseType: string;
  regulator: string;
  licenseNumber: string;
  issueDate: string;
  expiryDate: string;
  renewalRequired: boolean;
  renewalLeadDays: number;
  status: LicenseStatus;
  documentUrl: string | null;
  notes: string;
  createdAt: string;
}

export interface RegulatoryCapital {
  id: string;
  entityId: string;
  capitalRequirement: string;
  currency: string;
  minimumRequired: number;
  currentBalance: number;
  bufferPercentage: number;
  lastUpdated: string;
  notes: string;
}

export interface BankAccount {
  id: string;
  entityId: string;
  bankName: string;
  accountNumber: string;
  currency: string;
  balance: number;
  minRequiredBalance: number;
  lastUpdated: string;
}

export interface Alert {
  id: string;
  entityId: string;
  entityName: string;
  title: string;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: string;
  relatedId: string | null;
  createdAt: string;
}

export interface Document {
  id: string;
  entityId: string;
  name: string;
  category: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  storageUrl: string | null;
  uploadedAt: string;
  version: number;
  tags: string[];
  notes: string | null;
}

export interface Submission {
  id: string;
  type: SubmissionType;
  title: string;
  description: string;
  pageUrl: string | null;
  component: string | null;
  severity: string | null;
  area: string | null;
  priority: string | null;
  submittedBy: string;
  status: SubmissionStatus;
  prdContent: string | null;
  prdGeneratedAt: string | null;
  slackMessageTs: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionNote: string | null;
  implementedAt: string | null;
  implementationNote: string | null;
  createdAt: string;
  updatedAt: string;
}
