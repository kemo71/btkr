import "server-only";
import type { SsoAdapter, SsoConfig, SsoIdentity } from "./types";

/**
 * SAML 2.0 SSO adapter.
 *
 * This commit (slice 16) wires the constructor + options shape so the
 * provider factory compiles; slice 17 fills in the request-handling logic
 * (AuthnRequest building, SAMLResponse parsing + XML signature validation).
 *
 * Planned:
 *   - `buildLoginUrl` → AuthnRequest (HTTP-Redirect binding): deflate +
 *     base64 + URL-encode, optionally signed.
 *   - `handleCallback` → parse the SAMLResponse (HTTP-POST binding),
 *     validate the XML signature against `idpCertPem`, check
 *     `Conditions`/`NotOnOrAfter`/`AudienceRestriction`, extract NameID +
 *     attribute statements, map to `SsoIdentity`.
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

export class SamlAdapter implements SsoAdapter {
  readonly kind = "saml" as const;

  constructor(
    private readonly opts: SamlOptions,
    private readonly config: SsoConfig,
  ) {}

  /** Assertion Consumer Service URL (where the IdP POSTs the SAMLResponse). */
  get acsUrl(): string {
    return `${this.config.appOrigin.replace(/\/$/, "")}/auth/saml/callback`;
  }

  /** SP entity id (audience the IdP must restrict the assertion to). */
  get spEntityId(): string {
    return this.opts.spEntityId;
  }
  get idpSsoUrl(): string {
    return this.opts.idpSsoUrl;
  }
  get idpCertPem(): string {
    return this.opts.idpCertPem;
  }

  async buildLoginUrl(_args: {
    returnTo: string;
    state: string;
  }): Promise<string> {
    throw new SamlNotImplemented("SAML buildLoginUrl lands in slice 17.");
  }

  async handleCallback(_request: Request): Promise<SsoIdentity> {
    throw new SamlNotImplemented("SAML handleCallback lands in slice 17.");
  }
}

export class SamlNotImplemented extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SamlNotImplemented";
  }
}
