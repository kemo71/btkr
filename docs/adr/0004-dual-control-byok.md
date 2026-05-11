# ADR 0004 — Dual control for BYOK key rotation

- **Status:** Accepted
- **Date:** 2026-05-11
- **Deciders:** Platform Eng, CISO

## Context

NCA ECC-2-12 (privilege management) calls for dual control on highly
privileged actions. Rotating the AI-provider key is exactly that: a single
admin who could rotate the key unilaterally could swap in a key that
exfiltrates prompts/responses to an attacker-controlled endpoint, or
silently disable the coach. The Phase 1 BYOK module had a single-step
rotate (admin A creates → key is immediately active), which is a single
point of failure.

## Decision

Introduce a two-person rule for activating a BYOK key:

- `byok_keys.status` ∈ `{pending, active, rotated, revoked}` is the source
  of truth; `is_active` is kept as a denormalized convenience
  (= `status === 'active'`).
- **Create** (`byok-key:create`): admin A submits a sealed key →
  `status = 'pending'`. It is *not* usable by the coach.
- **Approve** (`byok-key:rotate`): admin B — who **must differ** from
  `created_by` — approves. In one transaction: the current active key for
  that provider → `'rotated'`; the pending key → `'active'`,
  `approved_by = B`. The dual-control check is enforced server-side in
  `lib/ai/byok-store.ts#approveKey` (throws `DualControlViolation`); the UI
  also disables "Approve" on keys you created, as a hint.
- **Reject** (`byok-key:rotate`): admin B rejects a pending key →
  `'revoked'`.
- **Revoke** (`byok-key:revoke`): an active key → `'revoked'` (unchanged).
- The coach + `withActivePlaintext` now select `status = 'active'` (not the
  old `is_active = true`, though they're equivalent).
- Every transition writes an audit event (`byok.create` / `byok.approve` /
  `byok.reject` / `byok.revoke`) with `outcome` and, for approve,
  `details.demotedKeyId` + `details.dualControl` on failure.

## Consequences

**Positive**
- No single admin can put a live key into the coach path.
- The audit log records *who submitted* and *who approved* each rotation —
  a clean compliance story for ECC-2-12.
- The state machine is small and lives in one module.

**Negative**
- Two admins are now required to rotate — operationally heavier. Mitigated
  by: revocation stays single-control (you can always kill a bad key
  fast), and the org should keep ≥ 2 admins.
- Migration `0004` backfills pre-existing rows: `is_active` → `'active'`,
  `revoked_at` set → `'revoked'`, else `'rotated'`. New rows default to
  `'pending'`.

## Alternatives considered

1. **Keep single-step rotate, rely on the audit log.** Rejected — audit is
   detective, not preventive; ECC-2-12 wants prevention for this class.
2. **Time-delayed activation (key goes live N hours after submit unless
   cancelled).** Rejected — weaker (an attacker with one admin account can
   just wait), and worse UX.
3. **Hardware-token approval / out-of-band confirmation.** Stronger, but
   needs infra we don't have in Phase 2; revisit if regulators require it.

## References

- `db/schema/byok.ts`, migration `0004_byok_dual_control.sql`
- `lib/ai/byok-store.ts` (`createKey` / `approveKey` / `rejectKey` / `revokeKey`)
- `app/[locale]/admin/byok/{page,actions}.tsx`
- `components/admin/byok-pending-actions.tsx`
- NCA ECC mapping §2-12 (`docs/security/nca-ecc-mapping.md`)
