# Btkr Valley — وادي بتكر

An Arabic-first, DGA-compliant **Innovation Management Platform** for **King
Salman Global Academy for Arabic Language (KSAA)**. Built as a Next.js 15 PWA,
deployed on Vercel for stakeholder demos, with a containerized self-host path
(Docker + Postgres + Redis) for production inside KSA data residency.

> **Architecture docs.** See [`docs/togaf/`](./docs/togaf/) for the TOGAF
> Architecture Definition Document and [`docs/STRUCTURE.md`](./docs/STRUCTURE.md)
> for the canonical file layout. Compliance anchors:
> [`docs/security/`](./docs/security/) (NCA ECC),
> [`docs/compliance/`](./docs/compliance/) (DGA),
> [`docs/operations/`](./docs/operations/) (ITIL 4).

## Stack

- **Next.js 15** (App Router, RSC, Turbopack dev)
- **React 19**
- **TypeScript** (strict)
- **Tailwind CSS v4** (`@tailwindcss/postcss`)
- **@serwist/next** for the service worker (disabled in dev)
- **pnpm** as package manager
- **Vercel** for deploys + preview URLs per PR

## Common commands

```bash
pnpm dev         # local dev (http://localhost:3000), SW disabled
pnpm build       # production build (generates public/sw.js)
pnpm start       # serve the production build locally
pnpm typecheck   # tsc --noEmit
pnpm lint        # next lint
```

## Layout

- `app/layout.tsx` — root layout, sets iOS PWA meta + theme color
- `app/page.tsx` — landing page
- `app/manifest.ts` — typed PWA manifest, served at `/manifest.webmanifest`
- `app/icon.tsx` — 32x32 browser favicon (generated via `ImageResponse`)
- `app/apple-icon.tsx` — 180x180 apple-touch-icon (generated via `ImageResponse`)
- `app/icons/{192,512,maskable-512}/route.tsx` — manifest icon routes
- `app/sw.ts` — Serwist service worker source (compiled into `public/sw.js`)
- `app/globals.css` — Tailwind v4 entrypoint + theme tokens

## PWA notes

- Manifest `display: "standalone"` so it looks app-like once installed
- Maskable 512x512 icon has built-in safe-zone padding for Android adaptive icons
- iOS: `appleWebApp.capable = true` + `app/apple-icon.tsx` covers Add-to-Home-Screen
- Service worker only runs in production builds (set `disable` in `next.config.ts`)
- After `pnpm build`, `public/sw.js` is generated — it's `.gitignore`d

## Deploy

Vercel auto-detects Next.js. Import the repo in the Vercel dashboard and every
PR will get a preview URL automatically (look for the bot comment on the PR).

## Claude Code remote sessions

`.claude/settings.json` defines a `SessionStart` hook that runs
`pnpm install --frozen-lockfile && pnpm typecheck` so a fresh remote session
opens with deps installed and TypeScript verified.

## Project conventions (Btkr Valley)

- **Arabic-first, RTL by default.** All UI defaults to `dir="rtl"` `lang="ar"`;
  English is a toggle via i18n, never the canonical form.
- **Auth.** Federated SSO (OIDC Auth-Code+PKCE or SAML 2.0) → `lib/auth/sso/`;
  sessions in `lib/auth/session.ts` (cookie holds the token, DB holds its
  SHA-256 hash); privileged roles need TOTP MFA (`lib/auth/mfa*.ts`). In dev
  with no IdP, the `/dev` page / `BTKR_DEV_USER` env shim stands in — disabled
  in production.
- **No standing AI keys server-side.** Anthropic / OpenAI keys are BYOK,
  AES-256-GCM-sealed at rest in `lib/crypto/`, rotated quarterly.
- **RBAC.** Admin / Stakeholder / Employee / Auditor. Permission checks
  centralized in `lib/rbac/`; deny-by-default at the policy layer. Resolve the
  actor with `getCurrentActor()`.
- **Audit.** Every sensitive action writes to the append-only, hash-chained
  log via `lib/audit/writer.ts`. Don't bypass — even admin actions are logged.
- **CSP.** Strict, per-request nonce, set in `middleware.ts`. Inline scripts
  need the nonce from `headers().get("x-csp-nonce")`.
- **TSDoc on every public API.** Exports from `lib/*` and `components/*`
  must carry TSDoc with an `@example` block.
- **No new top-level dirs without updating `docs/STRUCTURE.md`.**
