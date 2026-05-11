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
