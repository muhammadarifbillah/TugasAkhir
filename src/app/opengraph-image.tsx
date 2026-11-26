import { ImageResponse } from "next/og";

export const alt = "Saksi: every stage is checked before any code ships";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Forge Ledger OG image: report paper, the five temper colours with their
// temperatures and hallmark shapes, in the finished (all gates passed) state.
const GATES = [
  { name: "Analysis", c: 205, color: "#d9b45e", shape: "M12 3 21 12 12 21 3 12Z" },
  { name: "Design", c: 260, color: "#d08a4e", shape: "M12 3.5a8.5 8.5 0 1 0 0.01 0Z" },
  { name: "Development", c: 282, color: "#b394db", shape: "M12 3.5 21 19.5 3 19.5Z" },
  { name: "Testing", c: 310, color: "#86ace0", shape: "M4.5 4.5h15v15h-15Z" },
  { name: "Handover", c: 371, color: "#9cadbd", shape: "M12 3 19.8 7.5 19.8 16.5 12 21 4.2 16.5 4.2 7.5Z" },
];

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "radial-gradient(900px 500px at 50% -10%, rgba(124,58,237,0.45), #0b0d1a 70%)",
          color: "#eef0ff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: "#b9a6ff" }}>Saksi</div>
          <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.05, marginTop: 20, maxWidth: 980, letterSpacing: -1.5 }}>
            Every stage is checked before any code ships.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {GATES.map((g) => (
            <div key={g.name} style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="30" height="30" viewBox="0 0 24 24">
                  <path d={g.shape} fill="none" stroke={g.color} strokeWidth="2" strokeLinejoin="round" />
                </svg>
                <div style={{ fontSize: 24, color: "#a6abd6" }}>{`${g.c}°C`}</div>
              </div>
              <div style={{ height: 14, background: g.color, borderRadius: 999, marginTop: 14, boxShadow: "0 0 18px " + g.color }} />
              <div style={{ fontSize: 24, marginTop: 12 }}>{g.name}</div>
              <div style={{ fontSize: 20, color: "#6ee7b7", marginTop: 4 }}>Passed</div>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 22, color: "#a6abd6", borderTop: "1px solid #2a2f57", paddingTop: 18, display: "flex" }}>
          Mapped to NIST SP 800-218 v1.1 and ISO/IEC 27001:2022 Annex A
        </div>
      </div>
    ),
    { ...size },
  );
}
