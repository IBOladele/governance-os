// lib/audit.ts
// Helper to write append-only audit log entries.
// Call this from API routes after any important create/update/delete.

import { prisma } from '@/lib/prisma';
import type { AuditAction } from '@prisma/client';

interface AuditParams {
  action: AuditAction;
  tableName: string;
  recordId: string;
  entityId?: string;
  userId?: string;
  oldValues?: object;
  newValues?: object;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}

export async function writeAuditLog(params: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        tableName: params.tableName,
        recordId: params.recordId,
        entityId: params.entityId,
        userId: params.userId,
        oldValues: params.oldValues ? (params.oldValues as object) : undefined,
        newValues: params.newValues ? (params.newValues as object) : undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        notes: params.notes,
      },
    });
  } catch (err) {
    // Audit log failures should never break the main request
    console.error('[AuditLog] Failed to write:', err);
  }
}

// Convenience: extract IP + User-Agent from a Next.js Request
export function requestMeta(req: Request) {
  return {
    ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? undefined,
    userAgent: req.headers.get('user-agent') ?? undefined,
  };
}
