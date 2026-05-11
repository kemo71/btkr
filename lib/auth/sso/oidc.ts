import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { SsoAdapter, SsoConfig, SsoIdentity } from "./types";

/**
 * OIDC SSO adapter — Authorization Code flow with PKCE.
 *
 * Flow:
 *   1. `beginLogin(returnTo)` — discover the IdP config, generate a PKCE
 *      verifier/challenge + `state` + `nonce`, return the authorization
 *      URL plus the `OidcLoginState` the caller must stash in a short-lived
 *      signed cookie (see app/auth/login).
 *   2. `exchangeCallback(request, loginState)` — verify `state`, exchange
 *      the `code` at the token endpoint with the PKCE verifier, validate
 *      the `id_token` signature against the IdP JWKS, check `iss` / `aud` /
 *      `exp` / `nonce`, map claims to a normalized `SsoIdentity`.
 *
 * Claim mapping:
 *   - `sub`                              → subject
 *   - `email`                            → email
 *   - `name` (or `preferred_username`)   → fullName
 *   - `department` / `dept`              → department (best-effort)
 *   - `locale` ("ar-SA" → "ar")          → preferredLocale
 *   - `amr` ∋ {mfa,otp,hwk,swk,sms} or `acr` ~ /mfa|2fa|loa[23]|aal[23]/
 *                                         → mfaSatisfied
 *
 * @see lib/auth/sso/types.ts
 * @see docs/adr/0002-sso-strategy.md
 */

interface DiscoveryDoc {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
}

export interface OidcLoginState {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function pkceChallenge(verifier: string): string {
  return b64url(createHash("sha256").update(verifier).digest());
}

export class OidcAdapter implements SsoAdapter {
  readonly kind = "oidc" as const;
  private cache: {
    doc: DiscoveryDoc;
    jwks: ReturnType<typeof createRemoteJWKSet>;
    at: number;
  } | null = null;

  constructor(
    private readonly issuer: string,
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly config: SsoConfig,
  ) {}

  private get redirectUri(): string {
    return `${this.config.appOrigin.replace(/\/$/, "")}/auth/callback`;
  }

  private async discovery(): Promise<{
    doc: DiscoveryDoc;
    jwks: ReturnType<typeof createRemoteJWKSet>;
  }> {
    const FRESH_MS = 60 * 60 * 1000; // 1h
    if (this.cache && Date.now() - this.cache.at < FRESH_MS) return this.cache;
    const url = `${this.issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`OIDC discovery failed: HTTP ${res.status}`);
    const doc = (await res.json()) as DiscoveryDoc;
    if (doc.issuer !== this.issuer) {
      throw new Error(
        `OIDC issuer mismatch: expected ${this.issuer}, got ${doc.issuer}`,
      );
    }
    const jwks = createRemoteJWKSet(new URL(doc.jwks_uri));
    this.cache = { doc, jwks, at: Date.now() };
    return this.cache;
  }

  /** Build the authorization URL; caller stashes `loginState` in a cookie. */
  async beginLogin(returnTo: string): Promise<{
    url: string;
    loginState: OidcLoginState;
  }> {
    const { doc } = await this.discovery();
    const state = b64url(randomBytes(24));
    const nonce = b64url(randomBytes(24));
    const codeVerifier = b64url(randomBytes(48));
    const params = new URLSearchParams({
      response_type: "code",
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: "openid email profile",
      state,
      nonce,
      code_challenge: pkceChallenge(codeVerifier),
      code_challenge_method: "S256",
    });
    return {
      url: `${doc.authorization_endpoint}?${params.toString()}`,
      loginState: { state, nonce, codeVerifier, returnTo },
    };
  }

  /** SsoAdapter interface — thin wrapper around `beginLogin`. */
  async buildLoginUrl(args: {
    returnTo: string;
    state: string;
  }): Promise<string> {
    const { url } = await this.beginLogin(args.returnTo);
    return url;
  }

  /** Handle the IdP redirect to `/auth/callback`. */
  async exchangeCallback(
    request: Request,
    loginState: OidcLoginState,
  ): Promise<SsoIdentity> {
    const url = new URL(request.url);
    const err = url.searchParams.get("error");
    if (err) throw new Error(`IdP returned error: ${err}`);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");
    if (!code) throw new Error("Missing authorization code.");
    if (!returnedState || returnedState !== loginState.state) {
      throw new Error("OIDC state mismatch — possible CSRF.");
    }

    const { doc, jwks } = await this.discovery();

    const tokenRes = await fetch(doc.token_endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code_verifier: loginState.codeVerifier,
      }),
    });
    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: HTTP ${tokenRes.status}`);
    }
    const tokens = (await tokenRes.json()) as { id_token?: string };
    if (!tokens.id_token) throw new Error("Token response missing id_token.");

    const { payload } = await jwtVerify(tokens.id_token, jwks, {
      issuer: this.issuer,
      audience: this.clientId,
    });
    if (payload.nonce !== loginState.nonce) {
      throw new Error("OIDC nonce mismatch — possible replay.");
    }
    return mapClaims(payload);
  }

  // PKCE keeps the verifier + nonce in the caller's cookie, so the route
  // uses exchangeCallback(). This stub keeps SsoAdapter satisfied.
  async handleCallback(_request: Request): Promise<SsoIdentity> {
    throw new Error(
      "Use OidcAdapter.exchangeCallback(request, loginState) — handleCallback is not applicable to PKCE.",
    );
  }
}

function mapClaims(payload: JWTPayload): SsoIdentity {
  const sub = payload.sub;
  if (!sub) throw new Error("id_token missing sub claim.");
  const email = (payload.email as string | undefined) ?? "";
  if (!email) throw new Error("id_token missing email claim.");
  const fullName =
    (payload.name as string | undefined) ??
    (payload.preferred_username as string | undefined) ??
    email;
  const department =
    (payload.department as string | undefined) ??
    (payload.dept as string | undefined);
  const rawLocale = payload.locale as string | undefined;
  const preferredLocale: "ar" | "en" | undefined = rawLocale
    ? rawLocale.toLowerCase().startsWith("ar")
      ? "ar"
      : "en"
    : undefined;
  const amr = Array.isArray(payload.amr) ? (payload.amr as string[]) : [];
  const acr = typeof payload.acr === "string" ? payload.acr : "";
  const mfaSatisfied =
    amr.some((m) => ["mfa", "otp", "hwk", "swk", "sms"].includes(m)) ||
    /mfa|2fa|loa[23]|aal[23]/i.test(acr);

  return {
    subject: sub,
    email,
    fullName,
    department,
    preferredLocale,
    mfaSatisfied,
    rawClaims: payload as Record<string, unknown>,
  };
}

export class NotImplemented extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotImplemented";
  }
}
