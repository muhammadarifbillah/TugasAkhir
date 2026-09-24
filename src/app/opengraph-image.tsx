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
        <div style={{ fontSize: 28, color: "#8ab4ff", letterSpacing: 1 }}>
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
