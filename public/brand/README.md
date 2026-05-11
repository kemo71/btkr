# Brand assets — PLACEHOLDERS

The files here are **temporary placeholders** so the app can be deployed and
demoed before the official assets arrive. They are *not* the real brand and
must be replaced.

| File                    | Used by                                   | Replace with                              |
| ----------------------- | ----------------------------------------- | ----------------------------------------- |
| `logo-placeholder.svg`  | `<BrandMark variant="lockup" />` (headers) | Official KSAA horizontal logo lockup (SVG) |
| `icon-placeholder.svg`  | `<BrandMark variant="icon" />`             | Official KSAA square mark (SVG)            |

The generated PWA icons (`app/icon.tsx`, `app/apple-icon.tsx`,
`app/icons/{192,512,maskable-512}/route.tsx`) are *also* placeholders — a "ب"
letterform on the DGA-approximate green. Swap those `ImageResponse` bodies for
the official mark (keep the maskable variant's safe-zone padding).

## How to swap in the real KSAA assets

1. Drop the official files here (prefer SVG; keep the same filenames, or
   update `components/ui/brand-mark.tsx` if you rename them).
2. If the official lockup has a fixed aspect ratio different from the
   placeholder, adjust the `width`/`height` props where `<BrandMark />` is
   used (currently the landing-page header).
3. Replace the `ImageResponse` JSX in the `app/icon.tsx` / `app/apple-icon.tsx`
   / `app/icons/*` routes with the official mark.
4. Confirm clear-space / minimum-size rules from KSAA's brand guidelines.
5. Run `pnpm build` and eyeball `/` at both locales.

Colors in the placeholders use the DGA-approximate primary green
(`~#006C35`) from `app/dga-tokens.css`; see
`docs/compliance/dga-token-import.md` for the token swap procedure.
