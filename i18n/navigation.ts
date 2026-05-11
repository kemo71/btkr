import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware wrappers around Next.js navigation primitives.
 *
 * Use `Link`, `useRouter`, `usePathname`, and `redirect` from this module
 * (not from `next/navigation`) when you need locale-aware behavior. These
 * automatically prepend the correct locale prefix per `routing` rules.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
