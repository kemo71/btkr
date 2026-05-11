# Importing the official DGA Design System tokens

When KSAA / DGA provisions the official Design System SDK, this is how to
swap our approximate tokens for the real ones — a **single-file change**.

## The swap target

`app/dga-tokens.css` is the *only* file that defines design tokens. It
exports a Tailwind v4 `@theme { … }` block with these token families:

| Family            | Names                                            | Consumed by                          |
| ----------------- | ------------------------------------------------ | ------------------------------------ |
| Primary palette   | `--color-primary-50 … --color-primary-950`       | Buttons, focus ring, active states   |
| Neutrals          | `--color-neutral-50 … --color-neutral-950`       | Surfaces, text, borders              |
| Semantic          | `--color-{success,warning,danger,info}-{500,600}`| Badges, alerts, lifecycle tones      |
| Type scale        | `--text-xs … --text-5xl`                         | All typography                       |
| Radius            | `--radius-xs … --radius-2xl`, `--radius-full`     | All rounded corners                  |
| Motion            | `--duration-{quick,base,slow}`, `--ease-out-quart`| Transitions                          |
| Font stacks       | `--font-sans-ar`, `--font-sans-en`               | `app/globals.css` locale font binding|

## Procedure

1. **Keep the names, change the values.** Replace the OKLCH/`rem` values in
   `app/dga-tokens.css` with the official DGA values. If the DGA SDK ships
   hex, convert to OKLCH (or leave as hex — Tailwind v4 accepts both) and
   keep the `--color-primary-600 ≈ #006C35` comment accurate.
2. **Fonts.** If DGA mandates a typeface other than IBM Plex Sans Arabic
   (e.g. 29LT Bukra), load it via `next/font/local` in
   `app/[locale]/layout.tsx` and update `--font-sans-ar` to point at the
   new CSS variable. Do NOT commit licensed font files unless the license
   permits it.
3. **Extra tokens.** If the DGA SDK introduces token families we don't have
   (e.g. elevation/shadow scales), add them to `app/dga-tokens.css` and use
   them via Tailwind utilities (`shadow-dga-1`, etc.). Update the table
   above and `docs/STRUCTURE.md` if a new file is introduced.
4. **Don't touch anything else.** No component should reference a raw
   hex/value — they all go through `bg-primary-600`, `text-2xl`,
   `rounded-lg`, `duration-[var(--duration-base)]`, etc. If you find a
   hard-coded value in a component, that's a bug — fix it to use a token.
5. **Verify.**
   - `pnpm typecheck && pnpm build` — must stay clean.
   - `pnpm test:e2e` — the axe smoke test must report no `critical`/`serious`
     a11y violations (contrast pairs in particular).
   - Eyeball `/`, `/ideas`, `/dashboard` at both locales.
6. **Record the delta.** Update `docs/compliance/dga-design-adherence.md`
   §1–3 with the new values and the date, and note in §7 that the swap is
   done.

## Why a single file?

Tailwind v4 processes `@theme` blocks in `@import`ed CSS, so
`app/globals.css` does `@import "./dga-tokens.css";` and never needs to
change. Components only ever name tokens, never values. That keeps the
compliance surface to one auditable file.
