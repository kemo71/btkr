import "server-only";
import { db, schema } from "@/lib/db/client";
import { PERMISSIONS, type Permission } from "@/lib/rbac";

/**
 * Seed: roles, permissions, and the role↔permission grants.
 *
 * Run via `tsx db/seed/roles.ts` (script wiring added with the docker
 * compose slice). Idempotent — uses INSERT ... ON CONFLICT DO NOTHING.
 *
 * Role matrix is the canonical source for §6 of the TOGAF B doc.
 *
 * @see docs/togaf/01-business-architecture.md §6 (Organizational Roles)
 */

interface RoleSeed {
  slug: string;
  nameAr: string;
  nameEn: string;
  descriptionAr?: string;
  descriptionEn?: string;
  permissions: readonly Permission[];
}

const ROLE_SEEDS: readonly RoleSeed[] = [
  {
    slug: "admin",
    nameAr: "مدير النظام",
    nameEn: "Administrator",
    descriptionAr: "صلاحيات إدارة عامة على المنصة",
    descriptionEn: "Global system operator",
    permissions: PERMISSIONS, // full set
  },
  {
    slug: "stakeholder",
    nameAr: "صاحب مصلحة",
    nameEn: "Stakeholder",
    descriptionAr: "قرارات البوابات المرحلية ومتابعة المؤشرات",
    descriptionEn: "Gate decisions and dashboard visibility",
    permissions: [
      "user:read",
      "rbac:read",
      "idea:read",
      "idea:comment",
      "gate:approve",
      "gate:reject",
      "framework:select",
      "audit:read",
      "config:read",
    ],
  },
  {
    slug: "employee",
    nameAr: "موظف",
    nameEn: "Employee",
    descriptionAr: "تقديم الأفكار والتصويت والتعلم",
    descriptionEn: "Submit, vote, comment, learn",
    permissions: [
      "user:read",
      "idea:read",
      "idea:create",
      "idea:edit-own",
      "idea:vote",
      "idea:comment",
      "coach:use",
      "framework:select",
    ],
  },
  {
    slug: "auditor",
    nameAr: "مدقق",
    nameEn: "Auditor",
    descriptionAr: "وصول للقراءة فقط لأغراض التدقيق",
    descriptionEn: "Read-only cross-org observer",
    permissions: [
      "user:read",
      "rbac:read",
      "idea:read",
      "audit:read",
      "audit:export",
      "config:read",
    ],
  },
];

/**
 * Apply the seed. Safe to re-run.
 */
export async function seedRolesAndPermissions(): Promise<void> {
  // 1. Permissions
  for (const slug of PERMISSIONS) {
    await db
      .insert(schema.permissions)
      .values({ slug })
      .onConflictDoNothing({ target: schema.permissions.slug });
  }

  // 2. Roles
  for (const r of ROLE_SEEDS) {
    await db
      .insert(schema.roles)
      .values({
        slug: r.slug,
        nameAr: r.nameAr,
        nameEn: r.nameEn,
        descriptionAr: r.descriptionAr,
        descriptionEn: r.descriptionEn,
        isSystem: "true",
      })
      .onConflictDoNothing({ target: schema.roles.slug });
  }

  // 3. Role ↔ permission grants
  for (const r of ROLE_SEEDS) {
    const [role] = await db
      .select({ id: schema.roles.id })
      .from(schema.roles)
      .where(eq(schema.roles.slug, r.slug));
    if (!role) continue;
    for (const p of r.permissions) {
      const [perm] = await db
        .select({ id: schema.permissions.id })
        .from(schema.permissions)
        .where(eq(schema.permissions.slug, p));
      if (!perm) continue;
      await db
        .insert(schema.rolePermissions)
        .values({ roleId: role.id, permissionId: perm.id })
        .onConflictDoNothing();
    }
  }
}

import { eq } from "drizzle-orm";
