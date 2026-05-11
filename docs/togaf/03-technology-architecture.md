# TOGAF Technology Architecture — Btkr Valley

> **Phase D — Technology Architecture**
> Architecture Definition Document, Section 3 of 4
> Owner: Platform Engineering · Classification: Internal · Last updated: 2026-05-11

This document captures the **Phase D / Technology Architecture** — runtime
topology, containerization, region pinning, observability, and incident
response for Btkr Valley.

Cross-references:
- Phase B / Business Architecture — [`01-business-architecture.md`](./01-business-architecture.md)
- NCA ECC mapping — [`../security/nca-ecc-mapping.md`](../security/nca-ecc-mapping.md)
- DGA design adherence — [`../compliance/dga-design-adherence.md`](../compliance/dga-design-adherence.md)

---

## 1. Runtime topology

```
                           ┌────────────────────────┐
                           │  Stakeholder / Employee│
                           │  Browser  /  PWA       │
                           └───────────┬────────────┘
                                       │ HTTPS
                                       ▼
                           ┌────────────────────────┐
                           │  TLS / WAF Edge        │  ← KSA region
                           │  (nginx + ACME)        │
                           └───────────┬────────────┘
                                       │
                              ┌────────┴────────┐
                              │                 │
                              ▼                 ▼
                  ┌────────────────────┐  ┌──────────────────┐
                  │  Next.js 15 app    │  │  Static / CDN    │
                  │  (Node 22, RSC)    │  │  cache (immutable)│
                  │  Container × N     │  └──────────────────┘
                  └─────────┬──────────┘
                            │
       ┌────────────────────┼────────────────────────────────┐
       │                    │                                │
       ▼                    ▼                                ▼
┌──────────────┐   ┌──────────────────┐         ┌─────────────────────┐
│  PostgreSQL  │   │  Redis cache     │         │  Object storage     │
│  16 (KSA)    │   │  (sessions, rate │         │  (audit exports,    │
│  pgcrypto    │   │   limit, queues) │         │   user uploads)     │
└──────┬───────┘   └──────────────────┘         └─────────────────────┘
       │
       ▼
┌──────────────────────────────────┐
│  Read-replica for analytics &    │
│  dashboards (KSA)                │
└──────────────────────────────────┘

Out-of-band:
- AI providers (Anthropic, OpenAI) — egress only, BYOK keys held in KMS
- OpenTelemetry collector  → traces / metrics  → SIEM / dashboards
- Audit log replication    → WORM bucket       → quarterly export
```

---

## 2. Stack of record

| Layer            | Technology                          | Version (Phase 1) | Owner               |
| ---------------- | ----------------------------------- | ----------------- | ------------------- |
| Runtime          | Node.js                             | 22 LTS            | Platform Eng        |
| Framework        | Next.js (App Router, RSC)           | 15.5              | Platform Eng        |
| Language         | TypeScript (strict)                 | 5.7               | Platform Eng        |
| UI               | Tailwind CSS                        | 4.1               | UX                  |
| ORM              | Drizzle                             | 0.45              | Platform Eng        |
| Database         | PostgreSQL                          | 16                | Data Eng            |
| Cache / queues   | Redis                               | 7                 | Platform Eng        |
| Edge             | nginx (on-prem) / Vercel edge (PaaS)| 1.27              | Platform Eng        |
| Container        | OCI image (Alpine base)             | —                 | Platform Eng        |
| Observability    | OpenTelemetry SDK + collector       | latest            | SRE                 |
| Service worker   | Serwist (Workbox successor)         | 9                 | Platform Eng        |
| i18n             | next-intl                           | 4                 | Platform Eng        |
| AI providers     | Anthropic, OpenAI (BYOK)            | latest SDK        | Platform Eng        |

---

## 3. Data residency & sovereignty (AP2)

| Concern                  | Implementation                                              |
| ------------------------ | ----------------------------------------------------------- |
| Primary database         | Postgres pinned to a KSA region (managed or self-hosted)    |
| Object storage           | KSA-resident provider (e.g. SDAIA-approved, in-region S3)   |
| Backups                  | Encrypted at rest, retained inside the KSA region           |
| AI provider egress       | Only outbound; payloads scoped to the minimum needed        |
| Telemetry                | Collector resident in KSA; redact PII before export         |
| BYOK KEK                 | KMS / HSM in KSA — never bundled in image or env file       |

The Dockerfile's `output: "standalone"` keeps the runtime image dependency-
isolated; the host (managed container service or k8s) pins to KSA AZs.

---

## 4. Container topology (local-dev)

```yaml
# infra/docker-compose.yml
services:
  app:       Next.js standalone, non-root user "btkr"
  db:        postgres:16-alpine, persistent volume
  cache:     redis:7-alpine, persistent volume
  proxy:     nginx:1.27-alpine, terminates HTTP at :8080
```

This local-dev compose deliberately mirrors the production topology one-for-
one (4 boxes) so a developer running `docker compose up` exercises the same
network paths the production deployment uses.

### Production substitutions
- `db` → managed Postgres in KSA (point-in-time recovery, encrypted at rest)
- `cache` → managed Redis in KSA
- `proxy` → cloud load balancer or hardened nginx reverse proxy with TLS
- `app` → 2+ replicas behind the LB, rolling deploy

---

## 5. Security posture (NCA ECC anchors)

Detailed mapping lives in [`docs/security/nca-ecc-mapping.md`](../security/nca-ecc-mapping.md).
Highlights:

| Control area                | Implementation                                               |
| --------------------------- | ------------------------------------------------------------ |
| Identity (ECC-2-2)          | OIDC / SAML SSO, MFA required for admin / stakeholder roles  |
| Authorization (ECC-2-2-3)   | Fine-grained RBAC, deny-by-default, scoped grants            |
| Cryptography (ECC-2-8)      | TLS 1.2+ in transit, AES-256-GCM at rest for secrets         |
| Key management (ECC-2-8-2)  | KEK in KMS/HSM (KSA), DEK rotation every 90 days             |
| Audit (ECC-2-15)            | Immutable `audit_log`, six categories, append-only role      |
| Backup (ECC-2-9)            | Daily encrypted backups, quarterly restore drills            |
| Vulnerability (ECC-2-10)    | `pnpm audit` in CI, monthly dep updates, SBOM exported       |
| Incident (ECC-2-13)         | On-call rotation, runbooks under `docs/operations/`          |

---

## 6. Observability

- **Tracing**: OpenTelemetry SDK auto-instruments Next.js, postgres-js, and
  Redis. Spans flow to the collector → SIEM (KSA-resident).
- **Metrics**: RED (rate/errors/duration) per route, p95 latency tracked
  against the 99.5% availability KPI (TOGAF B §9).
- **Logs**: structured JSON to stdout; the container runtime forwards to the
  log aggregator. Never log: API keys, session tokens, BYOK ciphertext.
- **Synthetic probes**: hit `/manifest.webmanifest` from a KSA probe every
  30 s. Health-checks defined in the Dockerfile.

---

## 7. CI / CD

- **Vercel preview deploys** per PR for stakeholder review (Phase 1).
- **On-prem promotion** path: build the OCI image, scan with Trivy, push to
  the org registry, roll the deployment in the KSA cluster.
- **Pre-merge gates**: `pnpm typecheck`, `pnpm lint`, unit + integration
  tests, dependency audit.
- **No bypass**: hooks (`--no-verify`, etc.) are never used.

---

## 8. Disaster recovery

| Failure                | Detection                   | Response                                       |
| ---------------------- | --------------------------- | ---------------------------------------------- |
| App container crash    | Health-check fails ×3       | LB removes from rotation, replica scales in    |
| DB primary down        | Connection pool errors      | Promote read-replica (DR runbook 2.1)          |
| Region outage (KSA)    | Synthetic probes red        | Failover to secondary KSA AZ; cross-region is **not** permitted |
| AI provider outage     | Coach calls fail            | Degrade gracefully — coach disabled, lifecycle continues |
| BYOK KEK compromise    | Audit anomaly / out-of-band | Revoke KEK in KMS, rotate all BYOK keys, run audit export |

**RPO**: 15 minutes (continuous archive shipping).
**RTO**: 4 hours for total cluster loss.

---

## 9. Capacity planning (Phase 1)

| Resource          | Sizing (Phase 1)                | Trigger to scale                 |
| ----------------- | ------------------------------- | -------------------------------- |
| App pods          | 2 × (1 vCPU, 1 GiB)             | p95 latency > 800 ms             |
| Postgres          | 4 vCPU, 16 GiB, 200 GiB SSD     | Storage > 70%, IOPS > 60%        |
| Redis             | 1 GiB                           | Memory > 70%                     |
| Concurrent users  | ~500                            | DAU > 1,000 → scale to 4 pods    |

Growth assumption: ≤ 5,000 active users by end of Phase 1.

---

## 10. Open technology questions

- Final pick of KSA managed Postgres vs self-hosted on KSA k8s
- Object storage provider (SDAIA-approved candidates)
- KMS / HSM selection (in-region KMS vs SDAIA HSM service)
- SIEM choice (in-house vs managed)

---

*End of Phase D / Technology Architecture.*
