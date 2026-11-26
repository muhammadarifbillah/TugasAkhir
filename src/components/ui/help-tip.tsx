"use client";

import { useId, useState } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small "what does this do?" affordance next to a control. A click popover
 * (not a hover tooltip) so it also works on touch and with a keyboard.
 */
export function HelpTip({
  text,
  label,
  className,
}: {
  text: string;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <HelpCircle className="size-3.5" aria-hidden="true" />
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />
          <span
            id={id}
            role="tooltip"
            className="absolute top-full z-50 mt-1 w-56 rounded-md border bg-popover p-2 text-xs font-normal leading-relaxed text-popover-foreground shadow-md"
          >
            {text}
          </span>
        </>
      )}
    </span>
  );
}
