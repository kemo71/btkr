/**
 * Seed roles, permissions, role↔permission grants, a development/demo user
 * set, and a small sample dataset (ideas / votes / comments / lifecycle
 * events / accreditations) so the dashboard and leaderboard aren't empty.
 *
 * Usage:
 *   pnpm db:seed          # (runs with --conditions=react-server so the
 *                         #  "server-only" guard is a no-op in the script)
 *
 * Idempotent — re-running is safe (`ON CONFLICT DO NOTHING`, plus the demo
 * data checks for `IDEA-0001` before inserting).
 *
 * **Production:** the seeded users are skipped when `NODE_ENV=production`
 * unless `BTKR_SEED_FORCE=1` *or* `BTKR_DEMO_MODE=1` is set; the sample
 * data self-gates on those users existing.
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { seedRolesAndPermissions } from "@/db/seed/roles";
import { seedDemoData } from "@/db/seed/demo-data";

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
  // Skip the demo/dev users in production unless explicitly forced — but
  // demo mode (`BTKR_DEMO_MODE=1`) needs them, since `/auth/demo` signs in
  // as these seeded accounts.
  const isProd = process.env.NODE_ENV === "production";
  const forced = process.env.BTKR_SEED_FORCE === "1";
  const demoMode = process.env.BTKR_DEMO_MODE === "1";
  if (isProd && !forced && !demoMode) {
    console.log("skipping demo/dev users (NODE_ENV=production, BTKR_DEMO_MODE unset)");
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

// Wrapped in a function (not top-level await): tsx compiles this as CJS
// when package.json has no "type": "module", and CJS forbids top-level await.
async function main(): Promise<void> {
  await seedRolesAndPermissions();
  await seedDevUsers();
  // Sample ideas / votes / comments / accreditations so the demo's dashboard
  // and leaderboard aren't empty. Self-gates if the seeded users aren't there.
  await seedDemoData();
  console.log("seed complete");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
