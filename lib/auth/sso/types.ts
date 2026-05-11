/**
 * Federated SSO — provider-agnostic interfaces.
 *
 * Btkr Valley supports two SSO mechanisms in production: OIDC (preferred)
 * and SAML 2.0 (for entities still on legacy IdPs). Both produce the same
 * normalized `SsoIdentity` so the rest of the app — session creation,
 * RBAC resolution — is provider-blind.
 *
 * Phase 1.5 implements the concrete adapters; this file pins the contract
 * so the rest of the codebase can be wired against it now.
 *
 * @see lib/auth/sso/oidc.ts (concrete OIDC adapter, Phase 1.5)
 * @see lib/auth/sso/saml.ts (concrete SAML adapter, Phase 1.5)
 * @see docs/adr/0002-sso-strategy.md
 */

/** Normalized identity returned by either SSO mechanism. */
export interface SsoIdentity {
  /** Stable subject identifier from the IdP (OIDC `sub` / SAML NameID). */
  subject: string;
  email: string;
  fullName: string;
  /** IdP-asserted department / org unit, if present. */
  department?: string;
  /** Preferred UI locale, if the IdP asserts one. */
  preferredLocale?: "ar" | "en";
  /** Whether the IdP asserted that MFA was satisfied during this login. */
  mfaSatisfied: boolean;
  /** Raw provider claims for audit / debugging (never persisted verbatim). */
  rawClaims: Record<string, unknown>;
}

export interface SsoAdapter {
  readonly kind: "oidc" | "saml";
  /**
   * Build the URL (OIDC authorization endpoint / SAML SSO redirect) the
   * browser should be sent to in order to authenticate.
   */
  buildLoginUrl(args: { returnTo: string; state: string }): Promise<string>;
  /**
   * Handle the IdP callback (OIDC code exchange / SAML assertion POST) and
   * return a normalized identity. Throws on invalid signature, expired
   * assertion, audience mismatch, etc.
   */
  handleCallback(request: Request): Promise<SsoIdentity>;
}

/** Configuration shared by both adapters, loaded from env / secret store. */
export interface SsoConfig {
  /** Public origin of this app, e.g. https://btkr.ksaa.gov.sa */
  appOrigin: string;
  /** Require MFA at the IdP for these role slugs. */
  mfaRequiredRoles: readonly string[];
}
