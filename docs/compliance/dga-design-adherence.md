# DGA Design System — Adherence Record

> **Status:** In-progress · **Owner:** UX Lead + Engineering
> **Reference:** [`design.dga.gov.sa`](https://design.dga.gov.sa)

This document records how Btkr Valley aligns with the **Digital Government
Authority (DGA) Design System**, and *where* deviations exist with rationale.

The intent is to be honest about scope: until the official DGA SDK CSS/Figma
tokens are loaded directly into the build, our tokens are **DGA-aligned but
not byte-identical**. Replacing the token layer is a one-file swap
(`app/globals.css` → `@theme` block).

---

## 1. Brand colors

| Token              | Current value                       | DGA reference          | Notes                                       |
| ------------------ | ----------------------------------- | ---------------------- | ------------------------------------------- |
| `--color-primary-600` | `oklch(0.46 0.14 152)` ≈ `#006C35` | Saudi National Green   | Primary CTA, focus rings, active states     |
| `--color-primary-700` | derived darker                      | —                      | Hover                                       |
| Neutral 50–950     | warm-leaning gray scale (OKLCH)     | DGA neutral guidance   | All surfaces, text                          |
| Success            | green family                        | DGA semantic           | "Approved", "Published"                     |
| Warning            | amber                               | DGA semantic           | "Pending review"                            |
| Danger             | red                                 | DGA semantic           | Destructive actions, errors                 |
| Info               | blue                                | DGA semantic           | Informational alerts                        |

**Deviation:** Exact hex values approximate DGA samples; replace with official
DGA hex tokens once provisioned.

---

## 2. Typography

| Language | Family               | Loader                              | DGA recommendation        |
| -------- | -------------------- | ----------------------------------- | ------------------------- |
| Arabic   | IBM Plex Sans Arabic | `next/font/google`                  | IBM Plex Sans Arabic (or 29LT Bukra) |
| Latin    | IBM Plex Sans        | `next/font/google`                  | IBM Plex Sans             |

Type scale is *slightly enlarged from Tailwind defaults* (e.g. `--text-base:
17px`) to improve Arabic legibility per government UX research. Line-height
under `html[lang="ar"]` is 1.75 to give Arabic diacritics breathing room.

**Deviation:** 29LT Bukra (a DGA alternative for headlines) is **not** loaded —
it's a commercial typeface and requires a license; replace via
`next/font/local` once procured.

---

## 3. Spacing, radius, motion

- **Spacing**: Tailwind default 4px base — matches DGA's 4/8/12/16/24 cadence.
- **Radius**: `xs=2 / sm=4 / md=6 / lg=8 / xl=12 / 2xl=16` — DGA leans toward
  small radii for government formality; we follow.
- **Motion**: `--duration-quick` 120ms, `--duration-base` 200ms,
  `--duration-slow` 320ms with `cubic-bezier(0.25, 1, 0.5, 1)` easing.
- **Reduced motion**: respects `prefers-reduced-motion: reduce` globally.

---

## 4. RTL behavior

| Pattern                    | Approach                                  |
| -------------------------- | ----------------------------------------- |
| Container direction        | `<html dir="rtl">` set per locale         |
| Spacing                    | Tailwind logical utilities (`ps-`, `pe-`, `ms-`, `me-`) |
| Icons in inputs            | Will use `start`/`end` slot conventions   |
| Decorative arrows / chevrons | Mirror via `[dir="rtl"] &` selectors    |
| Numbers                    | Western Arabic numerals (per DGA digital UX guidance) |

The locale switcher in the header sets `lang` *and* `dir` on `<html>` so
every CSS logical property flips automatically. No JS-driven flips.

---

## 5. Accessibility (WCAG 2.1 AA)

| Concern                        | Implementation                                      |
| ------------------------------ | --------------------------------------------------- |
| Color contrast                 | Token pairs verified AA on light surfaces           |
| Focus visibility               | `:focus-visible` outline 2px primary-600, offset 2  |
| Keyboard navigation            | Native semantics on all primitives                  |
| Screen reader labels           | `Field` ties label + hint + error via `aria-describedby` |
| Errors                         | `role="alert"` + `aria-invalid` on invalid inputs   |
| Reduced motion                 | `prefers-reduced-motion: reduce` short-circuits transitions |
| Touch targets                  | Minimum 40×40 (size `md` is 40px tall)              |

**Deviation:** Automated contrast verification (axe / Pa11y) is not yet wired
into CI. Add in the testing slice.

---

## 6. DGA primitives mapped to this codebase

| DGA pattern        | Component                       | File                            |
| ------------------ | ------------------------------- | ------------------------------- |
| Button (primary, secondary, tertiary, ghost, danger) | `Button` | `components/dga/button.tsx`     |
| Card (header / body / footer)                       | `Card`   | `components/dga/card.tsx`       |
| Form field (label, hint, error)                     | `Field`  | `components/dga/field.tsx`      |
| Text input                                          | `Input`  | `components/dga/input.tsx`      |
| Multi-line input                                    | `Textarea` | `components/dga/textarea.tsx` |
| Select                                              | `Select` | `components/dga/select.tsx`     |
| Badge (lifecycle stages, audit categories)          | `Badge`  | `components/dga/badge.tsx`      |

Future slices add: `Modal`, `Tabs`, `Toast`, `Combobox`, `Tooltip`,
`Breadcrumb`, `Stepper` (lifecycle progress), `DataTable`.

---

## 7. Replacement plan when official DGA SDK lands

1. Swap `@theme` block in `app/globals.css` to import official DGA tokens.
2. Replace IBM Plex with the DGA-mandated Arabic typeface if different.
3. Re-run visual regression (Phase 2 — Playwright + Percy).
4. Update this document with delta and date.

---

## 8. Open questions for KSAA / DGA liaison

- Official RGB/HEX values for Saudi National Green to confirm `oklch` match
- Whether 29LT Bukra license is provisioned for KSAA
- KSAA secondary palette (if any) layered on top of DGA primary
- Existence of an internal KSAA design system that supersedes DGA defaults
