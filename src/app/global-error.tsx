"use client";

/** Last-resort boundary: renders when the root layout itself throws. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          fontFamily: "system-ui, sans-serif",
          background: "#0f1115",
          color: "#f5f5f5",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h1>
        <p style={{ fontSize: "0.85rem", opacity: 0.7, maxWidth: "32rem", textAlign: "center" }}>
          {error.message || "An unexpected error occurred."}
          {error.digest ? ` (ref: ${error.digest})` : ""}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: "8px",
            padding: "8px 16px",
            borderRadius: "8px",
            border: "1px solid #444",
            background: "#6d5efc",
            color: "white",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
