/**
 * Seed roles, permissions, role↔permission grants, and a development user
 * set so the BYOK / lifecycle UIs are immediately usable in local dev.
 *
 * Usage:
 *   pnpm db:seed
 *
 * Idempotent — every insert uses `ON CONFLICT DO NOTHING`.
 *
 * **Production:** the dev users created here are dev-only and should never
 * exist in a production database. The seeder skips them when
 * `NODE_ENV === "production"` unless `BTKR_SEED_FORCE=1` is set.
 */
import "dotenv/config";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { seedRolesAndPermissions } from "@/db/seed/roles";

interface DevUserSeed {
  email: string;
  fullName: string;
  department: string;
  roleSlugs: readonly string[];
  preferredLocale: "ar" | "en";
}

const DEV_USERS: readonly DevUserSeed[] = [
  {
    email: "admin@ksaa.gov.sa",
    fullName: "مدير النظام",
    department: "Innovation Office",
    roleSlugs: ["admin"],
    preferredLocale: "ar",
  },
  {
    email: "stakeholder@ksaa.gov.sa",
    fullName: "صاحب المصلحة",
    department: "Executive Office",
    roleSlugs: ["stakeholder"],
    preferredLocale: "ar",
  },
  {
    email: "employee@ksaa.gov.sa",
    fullName: "موظف ابتكار",
    department: "Research & Development",
    roleSlugs: ["employee"],
    preferredLocale: "ar",
  },
  {
    email: "auditor@ksaa.gov.sa",
    fullName: "مدقق",
    department: "Internal Audit",
    roleSlugs: ["auditor"],
    preferredLocale: "en",
  },
];

async function seedDevUsers(): Promise<void> {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.BTKR_SEED_FORCE !== "1"
  ) {
    console.log("skipping dev users (NODE_ENV=production)");
    return;
  }

  for (const u of DEV_USERS) {
    await db
      .insert(schema.users)
      .values({
        email: u.email,
        fullName: u.fullName,
        department: u.department,
        preferredLocale: u.preferredLocale,
      })
      .onConflictDoNothing({ target: schema.users.email });

    const [user] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, u.email));
    if (!user) continue;

    for (const slug of u.roleSlugs) {
      const [role] = await db
        .select({ id: schema.roles.id })
        .from(schema.roles)
        .where(eq(schema.roles.slug, slug));
      if (!role) continue;
      await db
        .insert(schema.userRoles)
        .values({ userId: user.id, roleId: role.id })
        .onConflictDoNothing();
    }
  }
}

await seedRolesAndPermissions();
await seedDevUsers();
console.log("seed complete");
process.exit(0);
