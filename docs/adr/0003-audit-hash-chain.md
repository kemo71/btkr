# ADR 0003 — Tamper-evident audit log via hash chain

- **Status:** Accepted
- **Date:** 2026-05-11
- **Deciders:** Platform Eng, CISO

## Context

NCA ECC-2-8-3 calls for tamper detection on the audit log. Postgres
INSERT-only grants stop the *application* from rewriting history, but a
DBA or a compromised superuser could still alter rows. We need a way to
*detect* such alteration even when the attacker has write access to the
table.

## Decision

- Every `audit_log` row carries `prev_hash` and `entry_hash`.
- `entry_hash = SHA-256( canonical_payload || prev_hash )` where
  `canonical_payload` is a key-sorted JSON encoding of the forensically
  relevant columns (id, actor, role, category, action, target, ip, UA,
  details, outcome, occurredAt).
- `prev_hash` of row N = `entry_hash` of row N-1; the genesis row uses
  64 zero hex chars.
- The writer (`lib/audit/writer.ts`) computes the chain inside a
  transaction that takes `SHARE ROW EXCLUSIVE` on the table so concurrent
  inserts can't race the (read-latest, hash, insert) sequence.
- `lib/audit/chain.ts#verifyChain()` re-derives the expected hashes for an
  ASC-ordered row set; the admin Audit Explorer exposes a one-click
  verify that itself writes an audit event.
- **Checkpoints (implemented, Phase 2)**: `audit_checkpoints` records
  periodic `(rowCount N, entryHash H)` snapshots of the chain head. The
  Audit Explorer can take a checkpoint and verify the chain against the
  latest one — the prefix up to N is provably unaltered iff the chain
  verifies AND the N-th row still carries `H`. This closes the
  *truncation* gap: deleting a suffix shrinks `rowCount` below a known
  checkpoint, which `verifyAgainstCheckpoint()` flags. In production every
  checkpoint row is also mirrored to a WORM (write-once) object store with
  Object Lock (`audit_checkpoints.worm_ref` points at it) — that immutable
  copy is the real anchor even against a full-DB compromise.

## Consequences

**Positive**
- Any insert/update/delete in the middle of the log is detectable — the
  chain breaks from that point forward, and `verifyChain` reports the
  first bad row id.
- No new infrastructure for Phase 1; just two columns and a transaction.

**Negative**
- The table lock serializes audit writes. Impact is bounded (held for one
  statement) and audit volume is low relative to app traffic; acceptable.
- The chain alone doesn't stop *truncation* (deleting a suffix of rows) —
  the checkpoint mechanism (now implemented) does, by recording a known
  `rowCount`; a shrunk log fails `verifyAgainstCheckpoint()`.
- Re-ordering by clock skew: we order by `occurred_at` and reserve the
  timestamp before hashing, so the persisted row matches the hashed
  payload. Two rows with identical `occurred_at` would be ambiguous; in
  practice the in-process write path is serialized by the table lock, so
  this can't happen for app-originated events.

## Alternatives considered

1. **External SIEM only.** Useful, but doesn't make the *source* table
   tamper-evident; combine, don't replace.
2. **Per-row digital signatures.** Stronger but needs key management and
   is overkill for Phase 1; revisit if regulators require non-repudiation.
3. **Append-only via Postgres rules/triggers blocking UPDATE/DELETE.**
   We do this too (grants), but a superuser bypasses it — the hash chain
   is the detection layer that survives that.

## References

- `db/schema/audit.ts`, migration `0001_audit_chain.sql`
- `lib/audit/chain.ts`, `lib/audit/writer.ts`
- `app/[locale]/admin/audit/page.tsx`
- NCA ECC mapping §2-8 (`docs/security/nca-ecc-mapping.md`)
