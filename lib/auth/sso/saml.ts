import "server-only";
import { SAML } from "@node-saml/node-saml";
import type { SsoAdapter, SsoConfig, SsoIdentity } from "./types";

/**
 * SAML 2.0 SSO adapter.
 *
 * Wraps `@node-saml/node-saml` to:
 *   - `buildLoginUrl` — build an AuthnRequest (HTTP-Redirect binding) and
 *     return the IdP SSO URL with the `SAMLRequest` query param; the
 *     `returnTo` path travels through as `RelayState`.
 *   - `handleCallback` — parse the SAMLResponse from the HTTP-POST binding,
 *     validate the XML signature against `idpCertPem`, check
 *     `Conditions` / `NotOnOrAfter` / `AudienceRestriction`, and extract
 *     the NameID + attribute statements.
 *
 * Attribute mapping (best-effort across common IdP conventions):
 *   - NameID                                             → subject
 *   - `email` | `mail` | the standard claims URIs        → email
 *   - `displayName` | `cn` | `name` | given+sn           → fullName
 *   - `department` | `ou`                                → department
 *   - `locale` | `preferredLanguage` ("ar*" → "ar")      → preferredLocale
 *   - AuthnContextClassRef ∈ MFA contexts, or an
 *     `amr`/`mfa` attribute that looks truthy            → mfaSatisfied
 *
 * @see lib/auth/sso/types.ts
 * @see lib/auth/sso/provider.ts
 * @see docs/adr/0002-sso-strategy.md
 */

export interface SamlOptions {
  idpEntityId: string;
  spEntityId: string;
  idpSsoUrl: string;
  /** IdP signing certificate in PEM form. */
  idpCertPem: string;
}

const MFA_CONTEXTS = new Set([
  "urn:oasis:names:tc:SAML:2.0:ac:classes:MobileTwoFactorContract",
  "urn:oasis:names:tc:SAML:2.0:ac:classes:TimeSyncToken",
  "urn:oasis:names:tc:SAML:2.0:ac:classes:SmartcardPKI",
  "http://schemas.microsoft.com/claims/multipleauthn",
]);

type SamlProfile = Record<string, unknown> & {
  nameID?: string;
  authnContext?: string | { authnContextClassRef?: string };
  attributes?: Record<string, unknown>;
};

function firstString(...vals: unknown[]): string | undefined {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (Array.isArray(v) && typeof v[0] === "string" && v[0].trim()) {
      return v[0].trim();
    }
  }
  return undefined;
}

export class SamlAdapter implements SsoAdapter {
  readonly kind = "saml" as const;
  private readonly saml: SAML;

  constructor(
    private readonly opts: SamlOptions,
    private readonly config: SsoConfig,
  ) {
    this.saml = new SAML({
      issuer: opts.spEntityId,
      entryPoint: opts.idpSsoUrl,
      idpCert: opts.idpCertPem,
      callbackUrl: this.acsUrl,
      wantAssertionsSigned: true,
      wantAuthnResponseSigned: true,
      identifierFormat: null,
      audience: opts.spEntityId,
    });
  }

  /** Assertion Consumer Service URL — where the IdP POSTs the response. */
  get acsUrl(): string {
    return `${this.config.appOrigin.replace(/\/$/, "")}/auth/saml/callback`;
  }

  /** Build the IdP redirect URL; `returnTo` rides along as RelayState. */
  async buildLoginUrl(args: {
    returnTo: string;
    state: string;
  }): Promise<string> {
    return this.saml.getAuthorizeUrlAsync(args.returnTo, undefined, {});
  }

  /** Handle the IdP's HTTP-POST callback (`SAMLResponse` form field). */
  async handleCallback(request: Request): Promise<SsoIdentity> {
    const form = await request.formData();
    const SAMLResponse = form.get("SAMLResponse");
    if (typeof SAMLResponse !== "string") {
      throw new Error("Missing SAMLResponse in callback POST body.");
    }
    const { profile } = await this.saml.validatePostResponseAsync({
      SAMLResponse,
    });
    if (!profile) throw new Error("SAML response had no assertion/profile.");
    return mapProfile(profile as SamlProfile);
  }
}

function mapProfile(p: SamlProfile): SsoIdentity {
  const attrs = (p.attributes ?? {}) as Record<string, unknown>;
  const subject = firstString(p.nameID, attrs["nameID"], attrs["uid"]);
  if (!subject) throw new Error("SAML assertion missing NameID/subject.");

  const email = firstString(
    attrs["email"],
    attrs["mail"],
    attrs[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
    ],
    attrs["urn:oid:0.9.2342.19200300.100.1.3"],
    p["email"],
  );
  if (!email) throw new Error("SAML assertion missing an email attribute.");

  const given = firstString(
    attrs["givenName"],
    attrs["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname"],
    attrs["urn:oid:2.5.4.42"],
  );
  const sn = firstString(
    attrs["surname"],
    attrs["sn"],
    attrs["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname"],
    attrs["urn:oid:2.5.4.4"],
  );
  const givenSn = [given, sn].filter(Boolean).join(" ").trim();
  const fullName =
    firstString(
      attrs["displayName"],
      attrs["cn"],
      attrs["name"],
      attrs["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"],
    ) ||
    givenSn ||
    email;

  const department = firstString(
    attrs["department"],
    attrs["ou"],
    attrs["http://schemas.xmlsoap.org/claims/Group"],
  );

  const rawLocale = firstString(
    attrs["locale"],
    attrs["preferredLanguage"],
    attrs["urn:oid:2.16.840.1.113730.3.1.39"],
  );
  const preferredLocale: "ar" | "en" | undefined = rawLocale
    ? rawLocale.toLowerCase().startsWith("ar")
      ? "ar"
      : "en"
    : undefined;

  const ctxRef =
    typeof p.authnContext === "string"
      ? p.authnContext
      : (p.authnContext?.authnContextClassRef ?? "");
  const amrAttr = firstString(attrs["amr"], attrs["mfa"]);
  const mfaSatisfied =
    MFA_CONTEXTS.has(ctxRef) ||
    /mfa|2fa|multipleauthn/i.test(ctxRef) ||
    (!!amrAttr && /mfa|otp|true/i.test(amrAttr));

  return {
    subject,
    email,
    fullName,
    department,
    preferredLocale,
    mfaSatisfied,
    rawClaims: { ...p, attributes: attrs },
  };
}
