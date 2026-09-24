"use client";

import { useEffect } from "react";

/** Registers the service worker in production only (avoids dev/HMR conflicts). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration is best-effort.
    });
  }, []);

  return null;
}
