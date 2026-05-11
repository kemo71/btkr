import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Standalone output for the Docker production image (see infra/Dockerfile).
  // Vercel ignores this flag — its build pipeline produces its own bundle.
  output: "standalone",
};

export default withSerwist(withNextIntl(nextConfig));
