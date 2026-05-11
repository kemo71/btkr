# Btkr Valley — File Structure

Authoritative map of the repository. Every directory has a purpose; new
directories must be added here and justified.

```
btkr/
│
├── app/                          # Next.js 15 App Router
│   ├── (public)/                 # Unauthenticated routes (landing, login)        [Phase 2]
│   ├── (app)/                    # Authenticated app shell                         [Phase 2]
│   │   ├── dashboard/            # Strategic Dashboard (Stakeholder view)
│   │   ├── ideas/                # Idea lifecycle UI (submit / vote / gate)
│   │   ├── coach/                # Educational coaching UI (AI + content)
│   │   ├── frameworks/           # Methodology Wizard (TRIZ, SIT, JTBD, Six Hats)
│   │   ├── leaderboard/          # Gamification surface
│   │   └── admin/                # BYOK key vault, RBAC mgmt, branding, audit
│   ├── api/                      # Route Handlers (BYOK proxy, webhooks)
│   ├── icons/                    # Manifest icon endpoints (ImageResponse)
│   ├── manifest.ts               # PWA manifest
│   ├── layout.tsx                # Root layout (HTML <html dir="rtl" lang="ar">)
│   ├── page.tsx                  # Landing
│   ├── icon.tsx                  # Browser favicon
│   ├── apple-icon.tsx            # iOS apple-touch-icon
│   ├── sw.ts                     # Serwist service worker source
│   └── globals.css               # Tailwind v4 entrypoint + DGA tokens
│
├── components/                   # React components (presentational)
│   ├── dga/                      # DGA-pattern primitives (Button, Card, Input, Field, Modal)
│   ├── frameworks/               # TRIZ matrix, Six Hats wheel, JTBD canvas, SIT toolkit
│   ├── lifecycle/                # IdeaCard, StageGate, VoteWidget, DecisionLog
│   ├── coach/                    # CoachChat (BYOK), GuideStep, ReflectionPrompt
│   └── ui/                       # Misc shared UI (skeletons, empty states)
│
├── lib/                          # Server + shared logic (no JSX)
│   ├── auth/                     # Session, SSO adapter (OIDC/SAML), MFA
│   ├── rbac/                     # Role matrix, permission checks, policy DSL
│   ├── db/                       # DB client (Drizzle), query helpers
│   ├── ai/                       # BYOK provider abstraction (Anthropic, OpenAI)
│   ├── crypto/                   # AES-GCM key encryption, KMS adapter
│   ├── audit/                    # Append-only audit log writer
│   └── i18n/                     # Locale loader, formatters, RTL utilities
│
├── db/                           # Database artifacts (DDL, migrations, seed)
│   ├── schema/                   # Drizzle schema files (one per aggregate)
│   ├── migrations/               # Generated migrations
│   └── seed/                     # Seed data (roles, sample frameworks)
│
├── locales/                      # i18n message catalogs
│   ├── ar/                       # Arabic (canonical)
│   └── en/                       # English (parity with ar)
│
├── public/
│   ├── brand/                    # KSAA logo + brand assets (placeholders until official)
│   └── (PWA icons generated dynamically by app/)
│
├── infra/                        # Deployment / runtime
│   ├── Dockerfile                # Multi-stage production image                    [Phase 2]
│   ├── docker-compose.yml        # Local: app + Postgres + Redis                   [Phase 2]
│   └── nginx/                    # Reverse proxy config for self-host
│
├── scripts/                      # Operational scripts (seed, key-rotate, audit-export)
│
├── tests/
│   ├── unit/                     # Vitest unit tests
│   ├── integration/              # API + DB integration
│   └── e2e/                      # Playwright (AR + EN, RTL viewport)
│
├── docs/                         # Architecture, compliance, operations
│   ├── togaf/                    # TOGAF ADD (this folder)
│   ├── security/                 # NCA ECC mapping, threat model, data classification
│   ├── compliance/               # DGA design adherence, accessibility audits
│   ├── operations/               # ITIL 4 runbooks, on-call, SLOs
│   ├── adr/                      # Architecture Decision Records (one per decision)
│   └── STRUCTURE.md              # This file
│
├── .claude/                      # Claude Code workspace config
│   └── settings.json             # SessionStart hook (pnpm install + typecheck)
│
├── CLAUDE.md                     # Project context for Claude Code sessions
├── HANDOVER.md                   # Operational handover (NCA, DGA, runbooks)        [Phase 2]
├── README.md                     # Quick start
└── package.json
```

## Phase legend

- *(no tag)* — created or scaffolded
- **[Phase 2]** — directory reserved; implementation in next slice
- **[Phase 3]** — long-term roadmap

## Conventions

- **No code at folder root unless cross-cutting.** Each feature lives in its
  own subfolder under `app/(app)/`, `components/`, `lib/`.
- **One aggregate per schema file.** `db/schema/ideas.ts` exports tables for
  the Idea aggregate only.
- **Public APIs carry TSDoc.** Functions exported from `lib/*` and components
  exported from `components/*` must have TSDoc with `@example`.
- **Server-only code is marked.** Files under `lib/` that touch secrets import
  `"server-only"` at the top.
- **Empty dirs hold `.gitkeep`.** Removed once first real file lands.
