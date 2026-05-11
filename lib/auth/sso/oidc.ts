import "server-only";
import type { SsoAdapter, SsoConfig, SsoIdentity } from "./types";

/**
 * OIDC SSO adapter — scaffold.
 *
 * Phase 1.5 fills in the concrete implementation using the standard
 * Authorization Code + PKCE flow:
 *   1. Discover the IdP config from `${issuer}/.well-known/openid-configuration`.
 *   2. `buildLoginUrl` → authorization endpoint with `code_challenge`.
 *   3. `handleCallback` → exchange the code at the token endpoint,
 *      validate the `id_token` signature against the IdP JWKS, check
 *      `iss` / `aud` / `exp` / `nonce`, then map claims to `SsoIdentity`.
 *
 * Until then, the methods throw `NotImplemented` so accidental wiring is
 * loud, not silent. The interface is final — code that depends on
 * `SsoAdapter` is safe to write now.
 *
 * @see lib/auth/sso/types.ts
 * @see docs/adr/0002-sso-strategy.md
 */
export class OidcAdapter implements SsoAdapter {
  readonly kind = "oidc" as const;

  constructor(
    private readonly issuer: string,
    private readonly clientId: string,
    private readonly config: SsoConfig,
  ) {}

  async buildLoginUrl(_args: {
    returnTo: string;
    state: string;
  }): Promise<string> {
    throw new NotImplemented(
      "OIDC adapter is scaffolded; implement in Phase 1.5.",
    );
  }

  async handleCallback(_request: Request): Promise<SsoIdentity> {
    throw new NotImplemented(
      "OIDC adapter is scaffolded; implement in Phase 1.5.",
    );
  }
}

export class NotImplemented extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotImplemented";
  }
}
