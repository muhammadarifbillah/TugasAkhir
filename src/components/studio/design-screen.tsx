"use client";

import { cn } from "@/lib/utils";

interface DesignScreenProps {
  html: string;
  title: string;
  className?: string;
}

/**
 * Renders an AI-generated UI mockup in a locked-down iframe. `sandbox=""` gives
 * the document an opaque origin and disables scripts entirely, so only static
 * HTML/CSS is shown.
 */
export function DesignScreen({ html, title, className }: DesignScreenProps) {
  return (
    <iframe
      title={title}
      srcDoc={html}
      sandbox=""
      loading="lazy"
      className={cn("h-full w-full border-0 bg-white", className)}
    />
  );
}
