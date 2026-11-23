"use client";

import { usePathname } from "next/navigation";

/**
 * Global footer. Hidden inside the studio workspace, where vertical space is
 * precious and the page is already a full-height tool surface.
 */
export function SiteFooter({ label }: { label: string }) {
  const pathname = usePathname();
  if (pathname?.includes("/studio/")) return null;
  return (
    <footer className="mt-auto border-t px-4 py-6 text-center text-xs text-muted-foreground">
      {label}
    </footer>
  );
}
