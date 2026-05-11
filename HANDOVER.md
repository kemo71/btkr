# Btkr Valley — Operational Handover

> **Audience:** KSAA Innovation Office, IT Operations, CISO, incoming
> engineering lead.
> **Last updated:** 2026-05-11

This document is the **single-page summary** of what Btkr Valley is, how it's
built, how it's secured, and how it's operated. Each section links to the
authoritative detailed document.

---

## 1. What it is

Btkr Valley (وادي بتكر) is the innovation management platform for **King
Salman Global Academy for Arabic Language (KSAA)**. It turns employee ideas
into measurable institutional impact through a configurable stage-gate
lifecycle, an AI-coached methodology wizard, and a gamified recognition
layer — all Arabic-first.

See: [`docs/togaf/01-business-architecture.md`](docs/togaf/01-business-architecture.md)

---

## 2. Stack at a glance

| Layer            | Technology                                | Where it lives          |
| ---------------- | ----------------------------------------- | ----------------------- |
| Web framework    | Next.js 15.5 (App Router, RSC)            | `app/`                  |
| Language         | TypeScript 5.7 (strict)                   | repo-wide               |
| UI               | Tailwind CSS v4 + custom DGA primitives   | `components/dga/`       |
| i18n             | next-intl 4 (Arabic canonical, English toggle) | `i18n/`, `locales/` |
| ORM              | Drizzle 0.45 + postgres-js                | `db/schema/`, `lib/db/` |
| Database         | PostgreSQL 16                             | (KSA region)            |
| Cache            | Redis 7                                   | (KSA region)            |
| Crypto           | WebCrypto AES-256-GCM                     | `lib/crypto/`           |
| Container        | OCI image (Node 22-alpine, multi-stage)   | `infra/Dockerfile`      |
| Local-dev infra  | docker-compose (app + DB + cache + nginx) | `infra/docker-compose.yml` |

---

## 3. Compliance posture

| Standard                     | Status        | Authoritative doc                                                          |
| ---------------------------- | ------------- | -------------------------------------------------------------------------- |
| **DGA Design System**        | Aligned, swap-ready for official tokens | [`docs/compliance/dga-design-adherence.md`](docs/compliance/dga-design-adherence.md) |
| **NCA Essential Cybersecurity Controls** | Mapped, multiple controls in progress | [`docs/security/nca-ecc-mapping.md`](docs/security/nca-ecc-mapping.md)             |
| **TOGAF 9.2 ADM (Phases B, D)** | Documented   | [`docs/togaf/`](docs/togaf/)                                              |
| **ITIL 4 Service Design / Op** | Runbook in place | [`docs/operations/runbook.md`](docs/operations/runbook.md)                |
| **WCAG 2.1 AA**              | Tokens + primitives compliant; automated audit planned | DGA adherence doc §5      |

> **Important:** This handover documents the *implementation status* of
> controls and design alignment. **Formal NCA / DGA compliance attestation
> is an external audit process and is not granted by these documents.**

---

## 4. Identity & access (RBAC)

Four canonical roles, seeded in `db/seed/roles.ts`:

| Role          | Permission set (summary)                                                                    |
| ------------- | ------------------------------------------------------------------------------------------- |
| **admin**     | Full system (user mgmt, RBAC grants, BYOK rotation, branding, audit export, config)         |
| **stakeholder** | Read users / dashboards, comment on ideas, approve / reject gate decisions, read audit    |
| **employee**  | Submit / edit own ideas, vote, comment, use AI coach, select frameworks                     |
| **auditor**   | Read-only across users, ideas, audit log; can export audit                                  |

Permission catalog: [`lib/rbac/permissions.ts`](lib/rbac/permissions.ts) — 27
explicit permission literals. Deny-by-default policy DSL in
[`lib/rbac/policy.ts`](lib/rbac/policy.ts).

Federated SSO (OIDC + SAML 2.0) is the production path; local password auth
is dev-seed only. MFA enforcement for admin/stakeholder is planned.

---

## 5. BYOK (Bring Your Own Key) — AI provider keys

**No standing AI keys live in this codebase or any environment file.**

- Admins enter Anthropic / OpenAI keys via the secure admin UI.
- Keys are encrypted with **AES-256-GCM** in [`lib/crypto/aes-gcm.ts`](lib/crypto/aes-gcm.ts).
- The Key Encryption Key (KEK) is a 32-byte value loaded from `BYOK_KEK`,
  which itself comes from a KMS/HSM resident in KSA — never from a `.env`
  file in production.
- Encrypted rows live in `byok_keys` (ciphertext + iv + authTag + kekRef
  stored separately).
- Quarterly KEK rotation procedure: [`docs/operations/runbook.md`](docs/operations/runbook.md) §4.4.

---

## 6. Data residency

Architecture Principle **AP2 — Data sovereignty (KSA only)**. Enforced via:

- Postgres and Redis pinned to a KSA region.
- Object storage from a KSA-resident, SDAIA-approved provider.
- Backups never leave the KSA residency boundary.
- AI provider egress is outbound-only; payloads scoped to the minimum needed.

See: [`docs/togaf/03-technology-architecture.md`](docs/togaf/03-technology-architecture.md) §3.

---

## 7. Audit & evidence

- **Audit log**: append-only `audit_log` table, six categories
  (`auth`, `rbac`, `byok`, `lifecycle`, `config`, `export`). The only
  sanctioned write path is [`lib/audit/writer.ts`](lib/audit/writer.ts).
- **Lifecycle events**: every stage transition recorded immutably in
  `lifecycle_events`; the `ideas.stage` column is a denormalized projection
  of the latest event.
- **Retention**: ≥ 12 months in primary; archived to WORM bucket per
  ECC-2-8-4.
- **Export**: admin or auditor role can export via the admin UI; export is
  itself logged as an audit event.

---

## 8. Run, deploy, restore

### Local dev (no Docker)

```bash
pnpm install
pnpm dev          # http://localhost:3000  (SW disabled in dev)
pnpm typecheck
pnpm lint
pnpm build
```

### Local dev (Docker, mirrors prod topology)

```bash
docker compose -f infra/docker-compose.yml up --build
# Open http://localhost:8080 (nginx → app)
```

### Production deploy

- **Preview**: every PR gets a Vercel preview URL — for stakeholder demos.
- **On-prem / KSA cluster**: CI builds the multi-stage OCI image
  (`infra/Dockerfile`), scans with Trivy, pushes to the org registry,
  rolling-deploys to the KSA cluster.

### Restore from backup

See [`docs/operations/runbook.md`](docs/operations/runbook.md) §4.2 and
the DR section in [`docs/togaf/03-technology-architecture.md`](docs/togaf/03-technology-architecture.md) §8.

RPO 15 min · RTO 4 h.

---

## 9. On-call & incident response

- **Severity matrix** + escalation path: [`docs/operations/runbook.md`](docs/operations/runbook.md) §2–3.
- **Sev-1**: full outage, data loss, or BYOK / KEK exposure.
- **Sev-1 response target**: ≤ 15 min ack.
- **BYOK compromise playbook**: runbook §4.3.
- **KEK rotation**: quarterly, runbook §4.4.

---

## 10. Risks and known gaps (Phase 1)

| Risk / Gap                                                          | Planned remediation                                  |
| ------------------------------------------------------------------- | ---------------------------------------------------- |
| Official DGA tokens not yet integrated — using approximate values   | Swap `@theme` block in `app/globals.css` on receipt  |
| Federated SSO adapter not yet implemented                           | `lib/auth/sso/` slated for Phase 1.5                 |
| MFA enforcement for admin / stakeholder not yet implemented          | Session middleware gate planned                      |
| Audit-log hash chain (tamper detection) not yet implemented         | Phase 2; WORM export covers Phase 1                  |
| Trivy + CycloneDX SBOM CI not yet wired                             | Wire in the GitHub Actions slice                     |
| Dual-control approval for BYOK rotation not yet implemented         | Phase 2 admin UI                                     |
| KSAA logo + official brand assets not loaded                        | Replace placeholders in `public/brand/` when delivered |

---

## 11. Contacts & ownership

| Role                  | Where to look                          |
| --------------------- | -------------------------------------- |
| Business owner        | KSAA Innovation Office                 |
| Technical owner       | Platform Engineering lead              |
| Security DRI          | CISO escalation                        |
| Primary on-call       | PagerDuty rotation                     |

(Concrete handles intentionally not committed to the repo.)

---

## 12. Where to start, by role

- **Incoming engineer**: read [`CLAUDE.md`](CLAUDE.md) → [`docs/STRUCTURE.md`](docs/STRUCTURE.md) → [`docs/togaf/`](docs/togaf/).
- **Auditor**: read [`docs/security/nca-ecc-mapping.md`](docs/security/nca-ecc-mapping.md) → audit log schema → role matrix.
- **On-call**: read [`docs/operations/runbook.md`](docs/operations/runbook.md).
- **Stakeholder**: read this file (§1, §3) then the Vercel preview URL on the latest PR.
- **CISO**: read this file (§4–7, §9) + the NCA ECC mapping document.
