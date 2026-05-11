# btkr

A production-ready Next.js 15 Progressive Web App, deployed on Vercel,
installable on iOS and Android home screens.

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
