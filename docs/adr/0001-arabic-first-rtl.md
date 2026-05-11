# ADR 0001 — Arabic-first, RTL by default

- **Status:** Accepted
- **Date:** 2026-05-11
- **Deciders:** Platform Eng, UX, Innovation Office

## Context

Btkr Valley serves a primarily Arabic-speaking user base in a Saudi
government context. DGA guidance and KSAA's mandate both center the
Arabic language. Legacy global innovation platforms (ITONICS, Brightidea,
Wazoku, Qmarkets, etc.) treat Arabic as a secondary translation, which
shows in awkward typography, broken RTL layouts, and non-native idioms.

## Decision

- Arabic (`ar`) is the **canonical** locale of the application.
- The default locale is served at the root URL (`/`); English is served at
  `/en`.
- The HTML `dir` attribute is set per locale (`rtl` for Arabic).
- All UI uses CSS logical properties (`ps-`, `pe-`, `ms-`, `me-`) so layouts
  mirror automatically.
- Arabic messages in `locales/ar/*.json` are the **reference**; English keys
  must mirror Arabic, not the other way around.
- The PWA manifest carries `lang: "ar"` and `dir: "rtl"`.
- Typography: IBM Plex Sans Arabic (Arabic) + IBM Plex Sans (Latin).

## Consequences

**Positive**
- The product *feels* native to Arabic-speaking users, not translated.
- No layout-mirroring bugs at i18n switch time.
- KPI: clicks-to-action ≤ 3 is reachable because the wizard reads naturally.

**Negative**
- English-speaking devs must accept that the canonical strings are Arabic;
  glossary discipline is needed.
- Some upstream component libraries (Radix, Headless UI) assume LTR by
  default — we ship our own DGA primitives instead of fighting them.
- Manifest is single-locale (W3C spec limitation); we resolve by carrying
  dual names in the `name` field rather than per-locale manifests.

## Alternatives considered

1. **English-first with Arabic translation toggle.** Rejected — fails the
   "Arabic-first" architecture principle and reads as a foreign product.
2. **Per-locale subdomain (`ar.btkr` / `en.btkr`).** Rejected — adds DNS /
   TLS surface for marginal benefit over path prefixing; harder to share
   links with the right locale.
3. **`localePrefix: "always"` (both `/ar` and `/en` always prefixed).**
   Rejected — Arabic users get longer URLs for no value. The current
   `as-needed` strategy serves the canonical locale at `/`.

## References

- TOGAF Phase B `01-business-architecture.md` — Architecture Principle AP1
- `i18n/routing.ts`, `app/[locale]/layout.tsx`, `middleware.ts`
- `docs/compliance/dga-design-adherence.md`
