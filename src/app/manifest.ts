import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FUSE — AI code ships only with a witness",
    short_name: "FUSE",
    description:
      "An AI website studio with five server-enforced gates. Every gate is mapped to ISO/IEC 27001:2022, with NIST SP 800-218 as a supplement.",
    start_url: "/en",
    display: "standalone",
    background_color: "#0A1931",
    theme_color: "#0A1931",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
