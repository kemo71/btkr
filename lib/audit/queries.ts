import "server-only";
import { and, desc, eq, gte, lte, sql, asc } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import type { AuditEvent } from "@/db/schema";

/**
 * Server-side queries powering the audit explorer.
 *
 * @see app/[locale]/admin/audit/page.tsx
 * @see lib/audit/chain.ts (chain verification helpers)
 */

export interface AuditFilter {
  category?: string;
  actorId?: string;
  from?: Date;
  to?: Date;
}

export async function listAudit(
  filter: AuditFilter,
  page = 0,
  pageSize = 50,
): Promise<{ rows: AuditEvent[]; total: number }> {
  const conditions = [];
  if (filter.category) conditions.push(eq(schema.auditLog.category, filter.category as "auth" | "rbac" | "byok" | "lifecycle" | "config" | "export"));
  if (filter.actorId) conditions.push(eq(schema.auditLog.actorId, filter.actorId));
  if (filter.from) conditions.push(gte(schema.auditLog.occurredAt, filter.from));
  if (filter.to) conditions.push(lte(schema.auditLog.occurredAt, filter.to));

  const where = conditions.length ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(schema.auditLog)
    .where(where)
    .orderBy(desc(schema.auditLog.occurredAt))
    .limit(pageSize)
    .offset(page * pageSize);

  const [{ c }] = await db
    .select({ c: sql<number>`COUNT(*)::int` })
    .from(schema.auditLog)
    .where(where);

  return { rows, total: Number(c) };
}

/** Stream all audit rows in `occurredAt ASC` for chain verification. */
export async function listAllAscending(): Promise<AuditEvent[]> {
  return db
    .select()
    .from(schema.auditLog)
    .orderBy(asc(schema.auditLog.occurredAt));
}
