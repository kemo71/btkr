import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { tryGetCurrentActor } from "@/lib/auth/current-actor";
import { Badge, Card, CardBody, CardHeader } from "@/components/dga";
import { setDevUserAction, clearDevUserAction } from "./actions";
import type { Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

/**
 * Dev-only role switcher.
 *
 * Lists every seeded user and lets you set the `btkr_dev_user` cookie so
 * you can act as any role without restarting the dev server. Returns 404
 * in production.
 *
 * @see lib/auth/current-actor.ts
 * @see db/seed/roles.ts (seeded dev users)
 */
export default async function DevPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  await params; // locale not needed beyond satisfying the route signature
  if (process.env.NODE_ENV === "production") notFound();

  const users = await db
    .select({
      id: schema.users.id,
      email: schema.users.email,
      fullName: schema.users.fullName,
      department: schema.users.department,
    })
    .from(schema.users)
    .where(eq(schema.users.isActive, true));

  const actor = await tryGetCurrentActor();
  let actingEmail: string | null = null;
  if (actor) {
    const [u] = await db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, actor.userId));
    actingEmail = u?.email ?? null;
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-6 py-12">
      <header>
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900">
          Dev role switcher
        </h1>
        <p className="mt-2 text-sm text-neutral-600">
          Development only — not reachable in production. Sets the{" "}
          <code className="rounded bg-neutral-100 px-1">btkr_dev_user</code>{" "}
          cookie.
        </p>
      </header>

      <Card>
        <CardHeader
          title="Acting as"
          action={
            actingEmail ? (
              <Badge tone="primary">{actingEmail}</Badge>
            ) : (
              <Badge tone="warning">no actor</Badge>
            )
          }
        />
        <CardBody className="flex flex-col gap-3">
          {users.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No users seeded yet. Run <code>pnpm db:seed</code>.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-100">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {u.fullName}
                    </p>
                    <p
                      className="truncate text-xs text-neutral-500"
                      dir="ltr"
                    >
                      {u.email}
                      {u.department ? ` · ${u.department}` : ""}
                    </p>
                  </div>
                  <form action={setDevUserAction}>
                    <input type="hidden" name="email" value={u.email} />
                    <button
                      type="submit"
                      disabled={u.email === actingEmail}
                      className="inline-flex h-9 items-center rounded-md border border-primary-600 px-3 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50 disabled:opacity-40"
                    >
                      {u.email === actingEmail ? "current" : "act as"}
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <form action={clearDevUserAction}>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md border border-neutral-300 px-3 text-sm text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              Clear override (fall back to BTKR_DEV_USER env)
            </button>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
