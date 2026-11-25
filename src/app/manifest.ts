import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Saksi — AI code ships only with a witness",
    short_name: "Saksi",
    description:
      "An AI website studio with five server-enforced gates. Every gate is mapped to ISO/IEC 27001:2022, with NIST SP 800-218 as a supplement.",
    start_url: "/en",
    display: "standalone",
    background_color: "#0f1115",
    theme_color: "#6d5efc",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
