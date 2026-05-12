# btkr

A production-ready **Progressive Web App** built with Next.js 15, deployed on
Vercel. Installs as a home-screen app with an icon on both **iOS** and
**Android**.

## Quick start

```bash
pnpm install
pnpm dev
```

Open <http://localhost:3000>.

## Production build

```bash
pnpm build
pnpm start
```

Visit <http://localhost:3000>, open DevTools → Application → Service Workers and
confirm `sw.js` is registered. The manifest is at `/manifest.webmanifest`.

## Install on a device

- **Android (Chrome):** menu → "Install app" / "Add to Home screen"
- **iOS (Safari):** Share → "Add to Home Screen"

The installed shortcut launches the app in standalone mode (no browser chrome).

## Deploy to Vercel (stakeholder demos)

1. Push this repo to GitHub.
2. Import it in <https://vercel.com/new> — Vercel auto-detects Next.js.
3. Every PR you open gets a **preview URL** the Vercel bot posts as a PR
   comment — share that link with stakeholders.
4. Merging to the default branch publishes to your production `*.vercel.app`
   URL (or a custom domain you wire up in Vercel).

### What works with no configuration

With **zero env vars**, the public surface deploys and works:

- `/` — landing (brand placeholder, role-aware nav, sign-in link)
- `/frameworks` (and `/en/frameworks`) — the Methodology Wizard, fully interactive
- The PWA install flow, manifest, icons, service worker
- Strict CSP / security headers

### What needs configuration

The authenticated app (ideas, dashboard, leaderboard, coach, admin) needs:

| Env var | For |
|---|---|
| `DATABASE_URL` | Postgres. The Vercel/Neon integration may instead set `POSTGRES_URL` / `DATABASE_URL_UNPOOLED` — the app accepts those too; no extra config needed. Use the **pooled** string for the app. (KSA region in production — AP2.) |
| `AUTH_STATE_SECRET` | signing the SSO login-state cookie (`openssl rand -base64 32`) |
| `OIDC_ISSUER` / `OIDC_CLIENT_ID` / `OIDC_CLIENT_SECRET` *(or `SAML_*`)* | the IdP |
| `APP_ORIGIN` | your deployment's public origin (for redirect/ACS URLs) |
| `BYOK_KEK` | 32-byte base64 KEK for sealing AI keys |
| `MFA_REQUIRED_ROLES` | e.g. `admin,stakeholder` |

See [`.env.example`](./.env.example) for the full list. After setting
`DATABASE_URL`, run `pnpm db:migrate && pnpm db:seed` once.

### Demo mode (production-safe — no IdP needed)

To demo the **whole authenticated app** on a production deployment without
wiring an IdP, set:

```
DATABASE_URL=...            # a Postgres (Vercel Postgres / Neon)
BYOK_KEK=...                # openssl rand -base64 32
BTKR_DEMO_MODE=1            # enables /auth/demo
```

then run `pnpm db:migrate && pnpm db:seed` once. With `BTKR_DEMO_MODE=1` the
seed creates the demo users **and a small sample dataset** (≈7 ideas across
stages with votes, comments, gate decisions, and a few accreditations) so
the dashboard and leaderboard aren't empty. The header now shows **"Try the
demo"** → `/auth/demo`, a role picker (Admin / Stakeholder / Employee /
Auditor). Each choice creates a **real session** bound to a real seeded user
with a real role — RBAC, the audit log (incl. an `auth.demo.login` entry),
and the strict CSP all still apply. A loud **"DEMO MODE"** banner shows on
every page so it can't be mistaken for production.

Demo mode is **off unless `BTKR_DEMO_MODE=1`** is explicitly set; with it
unset a production deploy stays locked to the IdP. The seeded data on a
public demo is, by design, public and may be modified/reset — only enable
it where that's acceptable. (The dev-only `BTKR_DEV_USER` shim remains
hard-disabled in production.)

### Placeholders to swap before launch

- **Brand:** `public/brand/*` + the PWA icon routes are placeholders —
  see [`public/brand/README.md`](./public/brand/README.md).
- **DGA tokens:** `app/dga-tokens.css` holds approximate values — see
  [`docs/compliance/dga-token-import.md`](./docs/compliance/dga-token-import.md).

## Project layout

See [`CLAUDE.md`](./CLAUDE.md) for the full stack overview and file map.

## Scripts

| Script           | What it does                              |
| ---------------- | ----------------------------------------- |
| `pnpm dev`       | Dev server (Turbopack), SW disabled       |
| `pnpm build`     | Production build (generates `public/sw.js`) |
| `pnpm start`     | Serve the production build                |
| `pnpm typecheck` | `tsc --noEmit`                            |
| `pnpm lint`      | `next lint`                               |
