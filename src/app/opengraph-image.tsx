import { ImageResponse } from "next/og";

export const alt = "ShieldForge — AI-Powered Secure Website Generator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg,#0f1115 0%,#1b1b33 60%,#12233a 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <svg width="88" height="88" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="7" fill="#6d5efc" />
          <path
            d="M16 4.4l9.6 3.4v6.6c0 5.7-4.1 10.2-9.6 12.3-5.5-2.1-9.6-6.6-9.6-12.3V7.8L16 4.4z"
            fill="rgba(255,255,255,0.18)"
          />
          <path
            d="M16 10.4l1.5 4.6 4.6 1.5-4.6 1.5L16 22.6l-1.5-4.6L9.9 16.5l4.6-1.5z"
            fill="#ffffff"
          />
        </svg>
        <div style={{ fontSize: 28, color: "#8ab4ff", letterSpacing: 1, marginTop: 12 }}>
          NIST SP 800-218 · ISO 27001:2022
        </div>
        <div style={{ fontSize: 76, fontWeight: 700, marginTop: 18 }}>ShieldForge</div>
        <div style={{ fontSize: 32, color: "#c7c9d9", marginTop: 14 }}>
          Generate secure websites guided by AI
        </div>
      </div>
    ),
    { ...size },
  );
}
