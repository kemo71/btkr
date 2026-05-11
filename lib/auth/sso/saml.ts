import "server-only";
import type { SsoAdapter, SsoConfig, SsoIdentity } from "./types";
import { NotImplemented } from "./oidc";

/**
 * SAML 2.0 SSO adapter — scaffold.
 *
 * Phase 1.5 fills in:
 *   1. `buildLoginUrl` → AuthnRequest (HTTP-Redirect binding), deflated +
 *      base64-encoded, signed if the IdP requires it.
 *   2. `handleCallback` → parse the SAMLResponse (HTTP-POST binding),
 *      validate the XML signature against the IdP's certificate, check
 *      `Conditions`/`NotOnOrAfter`/`AudienceRestriction`, extract NameID
 *      + attribute statements, map to `SsoIdentity`.
 *
 * SAML is offered only for entities still on legacy IdPs; OIDC is preferred.
 *
 * @see lib/auth/sso/types.ts
 * @see lib/auth/sso/oidc.ts (NotImplemented)
 * @see docs/adr/0002-sso-strategy.md
 */
export class SamlAdapter implements SsoAdapter {
  readonly kind = "saml" as const;

  constructor(
    private readonly idpEntityId: string,
    private readonly spEntityId: string,
    private readonly config: SsoConfig,
  ) {}

  async buildLoginUrl(_args: {
    returnTo: string;
    state: string;
  }): Promise<string> {
    throw new NotImplemented(
      "SAML adapter is scaffolded; implement in Phase 1.5.",
    );
  }

  async handleCallback(_request: Request): Promise<SsoIdentity> {
    throw new NotImplemented(
      "SAML adapter is scaffolded; implement in Phase 1.5.",
    );
  }
}
