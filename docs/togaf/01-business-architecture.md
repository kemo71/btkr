# TOGAF Business Architecture — Btkr Valley (وادي بتكر)

> **Phase B — Business Architecture**
> Architecture Definition Document, Section 1 of 4
> Owner: KSAA Innovation Office · Classification: Internal · Last updated: 2026-05-11

This document captures the **Phase B / Business Architecture** of the TOGAF
ADM cycle for Btkr Valley, the innovation management platform commissioned
by **King Salman Global Academy for Arabic Language (KSAA)**.

It is paired with three downstream documents that complete the
Architecture Definition Document (ADD):

- `02-information-systems-architecture.md` — TOGAF Phase C (Data + Application)
- `03-technology-architecture.md` — TOGAF Phase D (Infra, Containers, Cloud)
- `04-opportunities-and-solutions.md` — TOGAF Phase E (Roadmap)

---

## 1. Architecture Vision (Phase A summary)

**Statement.** Btkr Valley is the canonical innovation lifecycle platform
for KSAA — Arabic-first, NCA-aligned, and DGA-compliant — built to turn
employee ideas into measurable institutional impact.

**Strategic alignment.**
- **Saudi Vision 2030** — knowledge economy, R&D, employee empowerment
- **KSAA mandate** — Arabic language R&D, capacity building, applied innovation
- **DGA Digital Maturity** — accessibility, Arabic-first, unified GX patterns
- **NCA ECC** — confidentiality, integrity, availability of innovation IP

**Vision in one sentence.** *Replace fragmented idea boxes, ad-hoc spreadsheets,
and foreign-only platforms (ITONICS, Brightidea, Wazoku, HYPE, IdeaScale,
Qmarkets, Planbox, Sopheon, Accept Mission, Innosabi, ServiceNow Innovation
Management) with one Arabic-first, sovereign, DGA-styled system.*

---

## 2. Business Drivers

| # | Driver                                                         | Outcome measure                                  |
| - | -------------------------------------------------------------- | ------------------------------------------------ |
| 1 | Employee idea velocity (Vision 2030 KPI)                       | Ideas / employee / quarter                       |
| 2 | Innovation pipeline visibility for executives                  | Funnel conversion rate per stage gate            |
| 3 | Methodology adoption (TRIZ, SIT, JTBD, Six Hats)               | % active ideas tagged with a chosen framework    |
| 4 | Workforce accreditation (GInI, NPDP, IDEO U)                   | # accredited employees / dept                    |
| 5 | Data sovereignty (NCA ECC-1)                                   | 100% data resident in KSA region                 |
| 6 | Vendor independence                                            | Zero foreign SaaS dependency for core lifecycle  |
| 7 | Lower cost-to-action vs. legacy competitors                    | Median clicks idea-submit ≤ 3                    |

---

## 3. Stakeholders & Concerns

| Stakeholder                       | Primary concern                                       | Architectural response                                              |
| --------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| KSAA Executive Leadership         | ROI, alignment with mandate, brand integrity          | Strategic Dashboard, DGA-compliant brand layer                      |
| Innovation Office / PMO           | Pipeline visibility, stage-gate control               | Lifecycle module, gate decision UI, audit trail                     |
| Department Heads (Stakeholder)    | Departmental contribution, accreditation              | Org-scoped dashboards, accreditation tracker                        |
| Employees                         | Frictionless submission, learning, recognition        | 3-click submit, AI coach, gamified leaderboard                      |
| Information Security (NCA)        | Data residency, RBAC, auditability, key custody       | KSA-resident infra, fine-grained RBAC, BYOK vault, immutable audit  |
| Application Auditors              | Evidence of controls, traceability                    | Append-only audit log, ECC control map                              |
| Operations (ITIL 4)               | Maintainability, observability, incident response     | TSDoc, OpenTelemetry, runbooks in `/docs/operations/`               |
| Procurement                       | Vendor lock-in, license cost                          | Open-source stack, container portability                            |
| (Phase 2) External Innovators     | Limited safe access to public challenges              | Public challenge module, isolated guest role                        |

---

## 4. Business Capability Map

```
Btkr Valley
├── Idea Management
│   ├── Idea Capture            (forms, voice-to-text Arabic, attachments)
│   ├── Idea Triage             (de-duplication, routing, tagging)
│   ├── Idea Evaluation         (scoring rubrics, peer review)
│   └── Stage-Gate Lifecycle    (configurable gates, decision logs)
├── Innovation Methodology
│   ├── Framework Selector      (TRIZ / SIT / JTBD / Six Hats / Design Thinking)
│   ├── Methodology Coaching    (interactive guides, AI coach via BYOK)
│   └── Workshop Templates      (canvas, sprint, hackathon kits)
├── People & Recognition
│   ├── Accreditation Tracking  (GInI, NPDP, IDEO U, internal badges)
│   ├── Gamification            (points, levels, leaderboards, mini-games)
│   └── Recognition Workflow    (manager nominations, executive awards)
├── Strategic Insight
│   ├── Strategic Dashboard     (funnel, ROI, methodology adoption)
│   ├── Reports & Exports       (Arabic & English PDF, CSV)
│   └── Forecasting             (pipeline projections)
├── Platform Capabilities
│   ├── Identity & Access       (RBAC, SSO-ready, MFA)
│   ├── Audit & Compliance      (immutable log, NCA ECC mapping)
│   ├── AI Layer (BYOK)         (Anthropic / OpenAI key vault)
│   ├── Localization (i18n)     (Arabic default, English toggle)
│   └── Notifications           (in-app, email, push)
```

---

## 5. Value Streams

### V1. Idea → Impact (primary)
```
Submit → Triage → Evaluate → Gate 1 → Develop → Gate 2 → Pilot → Gate 3 → Scale → Measure
```
- Stage gates configurable per innovation type (incremental / adjacent / disruptive)
- Each gate writes a decision record (decision, decider, rationale, timestamp)

### V2. Learn → Apply
```
Discover methodology → Coaching session → Framework selected → Applied to idea → Reflection
```

### V3. Recognize → Retain
```
Contribute → Earn points → Level up → Earn badge → Pursue external accreditation
```

### V4. Govern → Audit
```
Configure RBAC → Capture events → Audit log → Compliance report → External audit response
```

---

## 6. Organizational Roles (RBAC Actors)

These map directly to the technical RBAC matrix (see `lib/rbac/`).

| Role          | Scope                          | Representative permissions                                                                          |
| ------------- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| **Admin**     | Global, system-wide            | Manage tenants, users, roles, BYOK keys, branding, audit export                                     |
| **Stakeholder** | Org / department scope        | View dashboards in scope, cast gate decisions, approve recognitions, *cannot* modify system config  |
| **Employee**  | Self + assigned teams          | Submit ideas, vote, comment, attend coaching, view own metrics                                      |
| **Auditor** *(read-only)* | Cross-org, read-only | Read audit logs, dashboards, configuration *snapshots* — no mutation                                |
| **Guest** *(phase 2)* | Public challenges only | Submit to a public challenge; no internal visibility                                                |

Principle: **least privilege by default, explicit grants by exception**.
All sensitive actions (key rotation, role change, gate decision) are
**dual-controlled** where feasible (NCA ECC-2-12 alignment).

---

## 7. Business Processes (top level)

| Process                       | Trigger                         | Outcome                              | RACI summary                  |
| ----------------------------- | ------------------------------- | ------------------------------------ | ----------------------------- |
| Idea Submission               | Employee opens "New Idea"       | Idea persisted, routed for triage    | R: Employee · A: Innovation PMO |
| Stage-Gate Decision           | Idea reaches gate criteria      | Decision record, lifecycle advances  | R: Stakeholder · A: Innovation PMO |
| Methodology Selection         | Employee enters Wizard          | Framework recommended + saved        | R: Employee · A: AI Coach     |
| Coaching Session              | Employee requests coaching      | Coaching transcript + action items   | R: AI Coach / Mentor          |
| BYOK Key Rotation             | Quarterly schedule / incident   | New key in vault, old key revoked    | R: Admin · A: CISO            |
| Accreditation Recognition     | External cert verified          | Badge issued, dashboard updated      | R: Stakeholder · A: HR        |
| Audit Export                  | External audit / quarterly      | Signed audit bundle (CSV + JSON)     | R: Admin · A: CISO            |

---

## 8. Architecture Principles

| #   | Principle                                          | Implication                                                                       |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| AP1 | **Arabic-first, RTL by default**                   | All UI rendered RTL by default; English is a toggle, never the canonical form     |
| AP2 | **Data sovereignty — KSA only**                    | Compute + storage region pinned to KSA; no cross-border data flows for core data  |
| AP3 | **BYOK for all third-party AI**                    | No standing keys in code or env; keys live encrypted in vault, rotated quarterly  |
| AP4 | **Least-privilege RBAC**                           | Every grant is explicit; deny-by-default at policy layer                          |
| AP5 | **Immutable audit by default**                     | Every state transition writes to append-only log; tampering is detectable         |
| AP6 | **Maintainability over cleverness**                | TSDoc on every public API; type-safe; tests precede merge                         |
| AP7 | **Accessibility ≥ WCAG 2.1 AA**                    | DGA tokens chosen for AA contrast; screen reader & keyboard parity                |
| AP8 | **Container-native, portable**                     | Docker for app + Postgres + Redis; no PaaS-only primitives in core                |
| AP9 | **Open standards over vendor formats**             | OIDC for SSO, OpenTelemetry for traces, JSON Schema for exports                   |
| AP10| **Replace, don't extend, on cert events**          | When NCA / DGA standards update, swap modules cleanly — no in-place patching      |

---

## 9. Key Performance Indicators

| KPI                                              | Target (Year 1)   | Source of truth                       |
| ------------------------------------------------ | ----------------- | ------------------------------------- |
| Ideas submitted / employee / quarter             | ≥ 2               | `ideas` table                         |
| % ideas advancing past Gate 1                    | ≥ 30%             | `lifecycle_events` table              |
| Median clicks idea-submit                        | ≤ 3               | UX telemetry                          |
| Median time-to-first-gate                        | ≤ 14 days         | `lifecycle_events` timestamps         |
| Employees with ≥ 1 methodology badge             | ≥ 25%             | `accreditations` table                |
| Coaching session completion rate                 | ≥ 70%             | `coaching_sessions` table             |
| Platform availability                            | ≥ 99.5%           | OpenTelemetry / synthetic probes      |
| Time to rotate AI key (incident)                 | ≤ 1 hour          | Audit log                             |
| Audit export turnaround                          | ≤ 24 hours        | Audit log                             |

---

## 10. Compliance & Standards Anchors

| Domain          | Standard                                                      | Where implemented / documented                         |
| --------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| Design system   | DGA Design System (`design.dga.gov.sa`)                       | `components/dga/`, `app/globals.css`, `docs/compliance/dga-design-adherence.md` |
| Brand           | KSAA brand (`ksaa.gov.sa`)                                    | `public/brand/` (assets), theme tokens                 |
| Cybersecurity   | NCA Essential Cybersecurity Controls (ECC)                    | `docs/security/nca-ecc-mapping.md`, `lib/auth/`, `lib/crypto/`, `lib/audit/` |
| Service mgmt    | ITIL 4 Service Design + Operation                             | `docs/operations/`                                     |
| Architecture    | TOGAF 9.2 ADM                                                 | `docs/togaf/`                                          |
| Accessibility   | WCAG 2.1 AA                                                   | Token system + Storybook a11y checks                   |
| Identity        | OIDC + SAML 2.0 (SSO-ready)                                   | `lib/auth/sso/`                                        |
| Localization    | W3C ITS + Unicode CLDR                                        | `lib/i18n/`, `locales/`                                |

---

## 11. Scope Boundaries

**In scope (Phase 1).**
- Internal innovation lifecycle for KSAA employees
- RBAC across Admin / Stakeholder / Employee / Auditor
- Arabic-first UI with English toggle
- BYOK AI coaching
- Strategic Dashboard, Methodology Wizard, Gamified Lifecycle
- Containerized self-host (Docker + docker-compose)

**Out of scope (deferred).**
- Federation with other Saudi government entities (Phase 2)
- External crowdsourcing / public challenge portal (Phase 2)
- Patent prosecution workflows (Phase 3)
- Mobile native apps — PWA covers iOS/Android home-screen install
- Marketplace of ideas across tenants

---

## 12. Risks & Mitigations (Phase B view)

| Risk                                                      | Likelihood | Impact | Mitigation                                                            |
| --------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------- |
| DGA token spec evolves mid-build                          | Med        | Med    | Token layer isolated in `app/globals.css` — single point of swap      |
| NCA ECC re-interpretation                                 | Low        | High   | Control map versioned in `docs/security/`; quarterly re-attest        |
| Foreign AI provider unavailability / sanctions            | Med        | Med    | BYOK abstraction supports multiple providers; degrade gracefully      |
| Low employee adoption                                     | Med        | High   | Gamification, manager nudges, executive sponsorship visible in UI     |
| Translation drift (ar ↔ en parity)                        | High       | Low    | CI lint that fails on missing keys; native-Arabic reviewer in flow    |
| AI hallucinations in coaching                             | Med        | Med    | Guardrails, RAG-grounded answers, human-in-the-loop for gate inputs   |

---

## 13. Handoffs to Downstream TOGAF Phases

| Goes to              | Hands off                                                                  |
| -------------------- | -------------------------------------------------------------------------- |
| Phase C — Data       | Entity catalog (Idea, Lifecycle Event, User, Role, Accreditation, …)       |
| Phase C — Application | Capability → service mapping; module boundary (`app/(app)/...`)            |
| Phase D — Technology | Container topology, KSA region pinning, BYOK vault, observability stack    |
| Phase E — Roadmap    | Phase 1 → Phase 2 → Phase 3 sequencing                                     |

---

*End of Phase B / Business Architecture.*
