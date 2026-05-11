import type { MetadataRoute } from "next";

/**
 * PWA manifest for Btkr Valley.
 *
 * Served at `/manifest.webmanifest`. The W3C manifest spec is locale-agnostic
 * (single document per origin), so the canonical brand is Arabic — matching
 * AP1 (Arabic-first). `lang` and `dir` are set so OS install prompts render
 * the name correctly under RTL.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "وادي بتكر — Btkr Valley",
    short_name: "وادي بتكر",
    description:
      "منصة إدارة الابتكار لأكاديمية الملك سلمان العالمية للغة العربية.",
    lang: "ar",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0a0a0a",
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/maskable-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
