import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShieldForge — AI-Powered Secure Website Generator",
    short_name: "ShieldForge",
    description:
      "Generate secure websites with an AI-guided 5-stage Secure SDLC, grounded in NIST SP 800-218 and ISO 27001:2022.",
    start_url: "/en",
    display: "standalone",
    background_color: "#0f1115",
    theme_color: "#6d5efc",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
