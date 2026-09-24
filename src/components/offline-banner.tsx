"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Shows a slim banner while the browser reports no network connection. */
export function OfflineBanner({ label }: { label: string }) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-[80] flex items-center justify-center gap-2 bg-warning/15 px-3 py-1.5 text-xs font-medium text-warning"
    >
      <WifiOff className="size-3.5" aria-hidden="true" /> {label}
    </div>
  );
}
