# ADR 0002 — Federated SSO strategy: OIDC-first, SAML for legacy

- **Status:** Accepted
- **Date:** 2026-05-11
- **Deciders:** Platform Eng, CISO, KSAA IT

## Context

Btkr Valley must integrate with KSAA's identity infrastructure (NCA
ECC-2-2: unique identity, least privilege, MFA for privileged roles).
Some Saudi government entities are on modern OIDC IdPs; others are still
on SAML 2.0. The application's session + RBAC layers must not care which
mechanism a given deployment uses.

A dev-mode shim (`BTKR_DEV_USER` env / `btkr_dev_user` cookie) exists today
so protected routes can be built and exercised before SSO lands.

## Decision

- **OIDC is the preferred mechanism.** Authorization Code + PKCE flow,
  `id_token` validated against the IdP JWKS, claims mapped to a normalized
  `SsoIdentity`.
- **SAML 2.0 is offered as a fallback** for entities on legacy IdPs.
  HTTP-Redirect binding for the AuthnRequest, HTTP-POST binding for the
  SAMLResponse, XML signature validated against the IdP certificate.
- **One normalized identity contract** (`lib/auth/sso/types.ts` →
  `SsoIdentity`) so session creation and `resolveActor()` are
  provider-blind.
- **MFA**: if the IdP asserts `mfaSatisfied`, accept it. Otherwise, for
  roles in `mfaRequiredRoles` (admin, stakeholder), require a TOTP second
  factor (`lib/auth/mfa.ts`) before issuing the session.
- The dev shim is **disabled in production** — `getCurrentActor()` throws
  if `BTKR_DEV_USER` is set there.

## Consequences

**Positive**
- Works against whatever IdP a deployment has, without code changes.
- The session + RBAC layers were built against `SsoAdapter` from day one,
  so Phase 1.5 just plugs the concrete adapters in.
- MFA enforcement is centralized, not scattered.

**Negative**
- Two adapters to maintain (OIDC + SAML). SAML XML signing is fiddly; we
  accept the cost because some entities require it.
- Until Phase 1.5, production cannot run — the dev shim is the only actor
  source. This is acceptable: Phase 1 is a stakeholder-preview milestone
  on Vercel previews, not a production cutover.

## Alternatives considered

1. **OIDC only.** Rejected — would exclude entities still on SAML IdPs.
2. **A third-party auth SaaS (Auth0/Clerk/WorkOS).** Rejected — conflicts
   with AP2 (data sovereignty); identity data would transit / reside
   outside KSA.
3. **Roll our own password auth.** Rejected — duplicates the IdP's job,
   adds credential-storage risk, fails the "unique federated identity"
   expectation.

## References

- `lib/auth/sso/{types,oidc,saml}.ts`
- `lib/auth/mfa.ts`
- `lib/auth/current-actor.ts`
- NCA ECC mapping §2-2 (`docs/security/nca-ecc-mapping.md`)
