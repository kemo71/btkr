# NCA Essential Cybersecurity Controls — Btkr Valley Mapping

> **Status:** In-progress · **Owner:** CISO + Platform Eng
> **Reference:** NCA Essential Cybersecurity Controls (ECC-1:2018, ECC-2:2023)

This document maps each applicable **NCA ECC** control to its concrete
implementation in the Btkr Valley codebase or operational procedure.
Items marked **(planned)** are in the Phase 1 roadmap but not yet
implemented; **(out of scope)** are deferred to a later phase with rationale.

> **Disclaimer.** This is an internal mapping prepared by the engineering
> team. Formal NCA compliance attestation requires an external audit and is
> not granted by this document.

---

## Domain 1 — Cybersecurity Governance

| Control     | Implementation                                                                | Evidence                                   |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------ |
| ECC-1-1     | Defined CISO + Innovation Office security ownership                           | KSAA org chart (out of repo)               |
| ECC-1-2     | Annual security strategy review, recorded in `docs/operations/`               | (planned)                                  |
| ECC-1-3     | Approved security policies (acceptable use, classification)                   | (planned, KSAA legal)                      |
| ECC-1-5     | Risk assessment per major release                                             | (planned, paired with each phase gate)     |

---

## Domain 2 — Cybersecurity Defence

### 2-1 Asset Management

| Control     | Implementation                                                                | Evidence                                   |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------ |
| ECC-2-1-1   | SBOM exported per release (`pnpm` → CycloneDX)                                | (planned, CI step)                         |
| ECC-2-1-2   | Data classification: public / internal / restricted / secret applied in code  | Header comments + table in `STRUCTURE.md`  |

### 2-2 Identity & Access Management

| Control     | Implementation                                                                | Evidence                                                                          |
| ----------- | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| ECC-2-2-1   | Unique identity per user (no shared accounts)                                 | `db/schema/users.ts` — `email` unique constraint                                  |
| ECC-2-2-2   | MFA required for privileged roles (admin, stakeholder)                        | `users.mfa_enrolled` flag, enforced in session middleware (planned)               |
| ECC-2-2-3   | Least privilege via fine-grained RBAC                                         | `lib/rbac/permissions.ts` (27 explicit permissions), deny-by-default in `policy.ts` |
| ECC-2-2-4   | Authorization reviewed on role change                                         | `user_roles` carries `granted_by`, `granted_at`, `expires_at`                     |
| ECC-2-2-5   | Privileged session timeouts                                                   | `sessions.expires_at` (planned: 30 min for admin)                                 |
| ECC-2-2-6   | Federated SSO ready (OIDC + SAML 2.0)                                         | `users.sso_subject`; SSO adapter in `lib/auth/sso/` (planned)                     |

### 2-3 Network Security

| Control     | Implementation                                                                | Evidence                                          |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| ECC-2-3-1   | TLS 1.2+ in transit, modern cipher suites                                     | nginx config + LB pinning                         |
| ECC-2-3-2   | Internal services not exposed publicly                                        | `docker-compose.yml` — only `proxy` publishes a port |
| ECC-2-3-3   | Egress allowlisted (AI provider hosts only)                                   | Network policy at infra layer (planned)           |

### 2-4 Mobile / Endpoint

Out of scope for app — endpoint hardening is the responsibility of KSAA IT.

### 2-5 Data Protection

| Control     | Implementation                                                                | Evidence                                                  |
| ----------- | ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| ECC-2-5-1   | Data at rest encrypted                                                        | Database storage encryption + `pgcrypto` for sensitive fields |
| ECC-2-5-2   | Secrets encrypted (AES-256-GCM) with KMS-managed KEK                          | `lib/crypto/aes-gcm.ts`, `db/schema/byok.ts`              |
| ECC-2-5-3   | Data residency — KSA only                                                     | Architecture Principle AP2, infra region pinning          |

### 2-6 Cryptography

| Control     | Implementation                                                                | Evidence                                                  |
| ----------- | ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| ECC-2-6-1   | NIST-approved algorithms only (AES-GCM, SHA-256, RSA-2048+)                   | `lib/crypto/`                                             |
| ECC-2-6-2   | Keys stored in KMS/HSM, never in code                                         | `BYOK_KEK` sourced from KMS only                          |
| ECC-2-6-3   | Quarterly key rotation                                                        | Rotation runbook (`docs/operations/`) + audit log of rotations |

### 2-7 Application Security

| Control     | Implementation                                                                | Evidence                                                                       |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| ECC-2-7-1   | Secure SDLC — typecheck, lint, tests on every PR                              | Vercel preview + (planned) GitHub Actions                                      |
| ECC-2-7-2   | Input validation at all server boundaries                                     | (planned) Zod schemas on every route handler                                   |
| ECC-2-7-3   | Output encoding — React auto-escapes JSX                                      | React 19 default behavior                                                      |
| ECC-2-7-4   | CSRF protection                                                               | Server actions use Next.js anti-CSRF token; cookies are `SameSite=Lax`         |
| ECC-2-7-5   | Security headers (HSTS, CSP, X-Frame-Options, Referrer-Policy)                | `infra/nginx/nginx.conf` + Next.js middleware (planned strict CSP)             |
| ECC-2-7-6   | Dependency vulnerability scanning                                             | `pnpm audit` in CI                                                             |

### 2-8 Logging & Audit

| Control     | Implementation                                                                | Evidence                                                                 |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| ECC-2-8-1   | Centralized, immutable audit log                                              | `db/schema/audit.ts` — append-only, six categories                       |
| ECC-2-8-2   | Audit events for sensitive actions (auth, RBAC change, key rotation)          | `lib/audit/writer.ts` is the only sanctioned insert path                 |
| ECC-2-8-3   | Tamper detection (audit row hashing)                                          | (planned, Phase 2 — hash chain or external WORM)                         |
| ECC-2-8-4   | Retention ≥ 12 months                                                         | Backup policy (operations runbook)                                       |

### 2-9 Backup

| Control     | Implementation                                                                | Evidence                                          |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| ECC-2-9-1   | Daily encrypted backups                                                       | Managed Postgres automated backup                 |
| ECC-2-9-2   | Backup restoration tested quarterly                                           | (planned) DR runbook                              |
| ECC-2-9-3   | Backups stored in same residency boundary (KSA)                               | Provider config                                   |

### 2-10 Vulnerability Management

| Control     | Implementation                                                                | Evidence                                          |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| ECC-2-10-1  | Monthly dependency review                                                     | Renovate / Dependabot config (planned)            |
| ECC-2-10-2  | Image scanning before deploy                                                  | Trivy in CI (planned)                             |

### 2-11 Incident Response

| Control     | Implementation                                                                | Evidence                                          |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| ECC-2-11-1  | On-call rotation + escalation policy                                          | (planned) `docs/operations/oncall.md`             |
| ECC-2-11-2  | Documented incident playbooks                                                 | (planned) `docs/operations/incidents/`            |

### 2-12 Privilege Management

| Control     | Implementation                                                                | Evidence                                                          |
| ----------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| ECC-2-12-1  | Dual-control for highly privileged actions (BYOK rotation, role grants)       | (planned) admin actions require 2nd-party approval                |
| ECC-2-12-2  | Just-in-time elevation                                                        | Scoped grants with `user_roles.expires_at`                        |

### 2-13 Cybersecurity Awareness

Owned by KSAA HR / training. Btkr Valley itself includes the Educational
Coaching UI to reinforce *innovation* awareness — out of cybersecurity scope.

---

## Domain 3 — Cybersecurity Resilience

| Control     | Implementation                                                                | Evidence                                                  |
| ----------- | ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| ECC-3-1     | Business continuity plan including app + data path                            | (planned) `docs/operations/bcp.md`                        |
| ECC-3-2     | DR runbook with RPO 15 min / RTO 4 hr                                         | `docs/togaf/03-technology-architecture.md` §8 + ops runbook |

---

## Domain 4 — Third-Party Cybersecurity

| Control     | Implementation                                                                | Evidence                                                  |
| ----------- | ----------------------------------------------------------------------------- | --------------------------------------------------------- |
| ECC-4-1     | Third-party security assessment (Vercel, managed DB, AI providers)            | (planned) vendor risk file                                |
| ECC-4-2     | DPA / data residency clauses with each vendor                                 | (planned) procurement / legal                             |
| ECC-4-3     | BYOK so no third-party AI provider holds long-lived KSAA credentials          | Architecture Principle AP3 + `lib/crypto/`, `db/schema/byok.ts` |

---

## Domain 5 — Cloud Computing Cybersecurity

| Control     | Implementation                                                                | Evidence                                          |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| ECC-5-1     | Cloud workloads in KSA region                                                 | Infra region pin (AP2)                            |
| ECC-5-2     | Cloud account hardening (MFA, no root, scoped IAM)                            | Cloud config baseline (out of repo)               |

---

## Quarterly attestation log

| Quarter    | Reviewer    | Status     | Notes                            |
| ---------- | ----------- | ---------- | -------------------------------- |
| 2026-Q2    | (pending)   | —          | Initial mapping established      |
