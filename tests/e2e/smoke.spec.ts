import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Smoke + a11y tests over the public pages.
 *
 * Public pages (landing, Methodology Wizard) need neither a database nor an
 * IdP — an anonymous request never touches the DB (no session cookie ->
 * `resolveSession()` returns null without a query; `BTKR_DEV_USER` unset ->
 * the dev shim short-circuits). So this suite runs against just
 * `pnpm build && pnpm start`.
 *
 * a11y: fails the test on any `serious` or `critical` axe-core violation
 * (WCAG 2.1 AA — color contrast, missing labels, etc.).
 *
 * @see playwright.config.ts
 */

const PUBLIC_PAGES = [
  { path: "/", expectHeading: /وادي بتكر|Btkr Valley/, dir: "rtl" },
  { path: "/en", expectHeading: /Btkr Valley/, dir: "ltr" },
  { path: "/frameworks", expectHeading: /معالج المنهجيات|Methodology Wizard/, dir: "rtl" },
  { path: "/en/frameworks", expectHeading: /Methodology Wizard/, dir: "ltr" },
] as const;

for (const page of PUBLIC_PAGES) {
  test(`renders ${page.path}`, async ({ page: pw }) => {
    await pw.goto(page.path);
    await expect(pw.locator("html")).toHaveAttribute("dir", page.dir);
    await expect(
      pw.getByRole("heading", { level: 1 }),
    ).toHaveText(page.expectHeading);
  });

  test(`a11y: ${page.path} has no serious/critical violations`, async ({
    page: pw,
  }) => {
    await pw.goto(page.path);
    const results = await new AxeBuilder({ page: pw })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(
      blocking,
      `axe violations on ${page.path}: ${blocking
        .map((v) => `${v.id} (${v.impact})`)
        .join(", ")}`,
    ).toEqual([]);
  });
}

test("manifest is served as JSON", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBeTruthy();
  expect(res.headers()["content-type"]).toContain("application/manifest+json");
  const body = await res.json();
  expect(body.lang).toBe("ar");
  expect(body.dir).toBe("rtl");
});

test("strict CSP header is present with a per-request nonce", async ({
  request,
}) => {
  const r1 = await request.get("/");
  const r2 = await request.get("/");
  const csp1 = r1.headers()["content-security-policy"] ?? "";
  const csp2 = r2.headers()["content-security-policy"] ?? "";
  expect(csp1).toContain("default-src 'self'");
  expect(csp1).toMatch(/'nonce-[a-f0-9]+'/);
  // Each request gets a fresh nonce.
  const n1 = csp1.match(/'nonce-([a-f0-9]+)'/)?.[1];
  const n2 = csp2.match(/'nonce-([a-f0-9]+)'/)?.[1];
  expect(n1).toBeTruthy();
  expect(n1).not.toBe(n2);
});
