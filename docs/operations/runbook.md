# Btkr Valley — Operations Runbook

> **ITIL 4 — Service Design + Operation**
> Owner: SRE / Platform Eng · Last updated: 2026-05-11

This is the operational runbook for Btkr Valley. Audience: on-call engineers,
the deployment lead, and the security duty officer.

---

## 1. Service definition

| Field                    | Value                                                       |
| ------------------------ | ----------------------------------------------------------- |
| Service name             | Btkr Valley (وادي بتكر)                                     |
| Business owner           | KSAA Innovation Office                                      |
| Technical owner          | Platform Engineering                                        |
| Service hours            | 24×7 (best-effort outside business hours)                   |
| Availability target      | ≥ 99.5% rolling 30-day (excluding scheduled maintenance)    |
| RPO                      | 15 minutes                                                  |
| RTO                      | 4 hours                                                     |
| Severity 1 response      | ≤ 15 minutes                                                |
| Severity 2 response      | ≤ 1 hour                                                    |

---

## 2. Severity matrix

| Sev | Definition                                          | Examples                                |
| --- | --------------------------------------------------- | --------------------------------------- |
| 1   | Full outage or data loss / breach risk              | Site down, DB unavailable, KEK leaked   |
| 2   | Major degradation                                   | Login broken, gate decisions failing    |
| 3   | Minor degradation, workaround exists                | One framework page slow                 |
| 4   | Cosmetic                                            | Translation typo                        |

---

## 3. On-call escalation

```
Primary  on-call → Secondary on-call → Platform lead → CISO (for security)
                                                    → Service owner (for business)
```

Acknowledge within 15 min. If unacknowledged within 5 min beyond that, the
paging system escalates.

---

## 4. Common incident playbooks

### 4.1 App responds 5xx

1. Check `/manifest.webmanifest` synthetic probe status.
2. `docker compose logs app --since 10m` or LB-aggregated logs.
3. If a recent deploy: roll back to previous image tag.
4. If DB-related: jump to **4.2**.
5. Open a Sev-2 incident; communicate in `#btkr-ops` and to the service owner.

### 4.2 DB unavailable

1. Check Postgres health endpoint / cloud console.
2. Verify replica lag is < 1 minute.
3. If primary lost: promote read-replica (managed DB control plane).
4. Re-point app via secret rotation — `DATABASE_URL` swap, rolling restart.
5. Confirm app reads succeed; investigate primary post-mortem.

### 4.3 BYOK key suspected compromised

**Treat as Sev-1.**

1. Revoke the suspected key in the provider's console (Anthropic / OpenAI).
2. In Btkr Valley admin UI: mark the row `revoked_at = now()`; `is_active = false`.
3. Insert a new key (the rotation flow); confirm Coach calls succeed.
4. Export the audit log slice for the affected window.
5. Notify CISO; file incident report within 24 hours.

### 4.4 KEK rotation

Quarterly or on suspected exposure. See `docs/operations/kek-rotation.md`
(planned). High-level flow:

1. Generate new 32-byte random KEK in KMS; assign new `kek_ref` (e.g. `BYOK_KEK_2026Q3`).
2. Run `scripts/rotate-byok.ts` which re-seals every active row under the new KEK.
3. Atomically swap `BYOK_KEK` to point to the new key; rolling restart.
4. Mark old KEK for destruction after 30-day grace.

### 4.5 Audit-log integrity verification

Quarterly. Run `scripts/audit-verify.ts` (planned) which:

1. Streams the last quarter's events.
2. Re-computes the hash chain (Phase 2).
3. Exports to WORM bucket and produces an integrity report.

---

## 5. Deployment

### 5.1 Standard release

1. Open PR; Vercel posts a preview URL.
2. QA + stakeholder ack on preview.
3. Merge to `main`.
4. CI builds OCI image, scans (Trivy), pushes to registry.
5. Rolling deploy to KSA cluster; health-check confirms readiness.

### 5.2 Hotfix

1. Branch from `main`; minimal targeted change.
2. Skip non-blocking checks only with platform lead approval (and only those
   that don't include security tests).
3. Same image build + scan path — **never** bypass image scanning.

### 5.3 Rollback

```
kubectl set image deploy/btkr-app app=<previous-tag>
```

Or via the cloud control plane. Rollback should complete in ≤ 5 minutes.

---

## 6. Scheduled maintenance

- **DB minor upgrades**: monthly window, off-hours KSA time.
- **Dependency updates**: monthly Renovate batch PR.
- **KEK rotation**: quarterly.
- **Audit-log integrity check**: quarterly.

Maintenance windows are posted in `#btkr-ops` and to the stakeholder list
≥ 48 h in advance.

---

## 7. Monitoring & alerts

Alerts that page (Sev-1 or Sev-2):

- Synthetic probe failures (≥ 2 consecutive)
- Error rate > 2% over 5 min
- p95 latency > 1500 ms over 5 min
- DB primary disk > 85%
- Audit-write failure rate > 0 over 5 min
- Any 5xx from `/api/byok/*`

Alerts that ticket only (Sev-3):

- Dependency CVE published (medium)
- Translation key missing in CI lint
- Backup duration > 30 min

---

## 8. Contacts

| Role                  | Channel               |
| --------------------- | --------------------- |
| Primary on-call       | PagerDuty rotation    |
| Service owner         | KSAA Innovation Office|
| Security duty officer | CISO escalation       |
| Vendor — Anthropic    | provider console      |
| Vendor — OpenAI       | provider console      |

(Concrete handles are kept out of the public repo.)

---

## 9. Related docs

- TOGAF Phase D: `../togaf/03-technology-architecture.md`
- NCA ECC mapping: `../security/nca-ecc-mapping.md`
- HANDOVER: `../../HANDOVER.md`
