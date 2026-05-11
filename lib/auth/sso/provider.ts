import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { OidcAdapter, type OidcLoginState } from "./oidc";
import { SamlAdapter } from "./saml";
import type { SsoAdapter, SsoConfig } from "./types";

/**
 * SSO provider factory + short-lived login-state cookie codec.
 *
 * Environment:
 *   SSO_MECHANISM   = "oidc" | "saml"   (default "oidc")
 *   APP_ORIGIN      = https://btkr.ksaa.gov.sa
 *   AUTH_STATE_SECRET = 32+ random bytes (signs the login-state cookie)
 *   # OIDC
 *   OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET
 *   # SAML
 *   SAML_IDP_ENTITY_ID, SAML_SP_ENTITY_ID, SAML_IDP_SSO_URL,
 *   SAML_IDP_CERT (PEM, single line with \n)
 *   # MFA policy
 *   MFA_REQUIRED_ROLES = "admin,stakeholder"  (comma-separated)
 *
 * @see lib/auth/sso/oidc.ts
 * @see lib/auth/sso/saml.ts
 * @see docs/adr/0002-sso-strategy.md
 */

export function ssoConfig(): SsoConfig {
  return {
    appOrigin: process.env.APP_ORIGIN ?? "http://localhost:3000",
    mfaRequiredRoles: (process.env.MFA_REQUIRED_ROLES ?? "admin,stakeholder")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  };
}

/** Return the configured SSO adapter, or null if SSO env is not set. */
export function getSsoAdapter(): SsoAdapter | null {
  const cfg = ssoConfig();
  const mechanism = (process.env.SSO_MECHANISM ?? "oidc").toLowerCase();

  if (mechanism === "saml") {
    const { SAML_IDP_ENTITY_ID, SAML_SP_ENTITY_ID, SAML_IDP_SSO_URL, SAML_IDP_CERT } =
      process.env;
    if (!SAML_IDP_ENTITY_ID || !SAML_SP_ENTITY_ID || !SAML_IDP_SSO_URL || !SAML_IDP_CERT) {
      return null;
    }
    return new SamlAdapter(
      {
        idpEntityId: SAML_IDP_ENTITY_ID,
        spEntityId: SAML_SP_ENTITY_ID,
        idpSsoUrl: SAML_IDP_SSO_URL,
        idpCertPem: SAML_IDP_CERT.replace(/\\n/g, "\n"),
      },
      cfg,
    );
  }

  // Default: OIDC
  const { OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET } = process.env;
  if (!OIDC_ISSUER || !OIDC_CLIENT_ID || !OIDC_CLIENT_SECRET) return null;
  return new OidcAdapter(OIDC_ISSUER, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, cfg);
}

/** Convenience: the OIDC adapter, narrowed (throws if SAML is configured). */
export function getOidcAdapter(): OidcAdapter {
  const a = getSsoAdapter();
  if (!a || a.kind !== "oidc") {
    throw new Error("OIDC is not the configured SSO mechanism.");
  }
  return a as OidcAdapter;
}

// --- Login-state cookie codec ------------------------------------------------

export const LOGIN_STATE_COOKIE = "btkr_login_state";

function stateSecret(): Uint8Array {
  const raw = process.env.AUTH_STATE_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error(
      "AUTH_STATE_SECRET must be set (32+ random bytes) to sign the login-state cookie.",
    );
  }
  return new TextEncoder().encode(raw);
}

/** Sign the OIDC login state into a compact JWT for the cookie value. */
export async function sealLoginState(s: OidcLoginState): Promise<string> {
  return new SignJWT({ ...s })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(stateSecret());
}

/** Verify + decode the login-state cookie. Throws if invalid/expired. */
export async function openLoginState(jwt: string): Promise<OidcLoginState> {
  const { payload } = await jwtVerify(jwt, stateSecret(), {
    algorithms: ["HS256"],
  });
  const { state, nonce, codeVerifier, returnTo } = payload as Record<
    string,
    unknown
  >;
  if (
    typeof state !== "string" ||
    typeof nonce !== "string" ||
    typeof codeVerifier !== "string" ||
    typeof returnTo !== "string"
  ) {
    throw new Error("Malformed login-state cookie.");
  }
  return { state, nonce, codeVerifier, returnTo };
}
