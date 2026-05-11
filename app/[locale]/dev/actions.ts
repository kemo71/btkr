"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { DEV_USER_COOKIE } from "@/lib/auth/current-actor";

/**
 * Dev-only: switch the acting user by setting the `btkr_dev_user` cookie.
 *
 * Hard no-op in production — the cookie is ignored by `getCurrentActor()`
 * when NODE_ENV is production, and this action refuses to set it there too.
 *
 * @see lib/auth/current-actor.ts
 */
export async function setDevUserAction(formData: FormData): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  const email = String(formData.get("email") ?? "");
  if (!email) return;
  const jar = await cookies();
  jar.set(DEV_USER_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  revalidatePath("/", "layout");
}

export async function clearDevUserAction(): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  const jar = await cookies();
  jar.delete(DEV_USER_COOKIE);
  revalidatePath("/", "layout");
}
