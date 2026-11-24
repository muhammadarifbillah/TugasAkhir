"use client";

import { AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Error/warning shown next to the control that triggered it. */
export function InlineAlert({
  message,
  onDismiss,
  dismissLabel = "Dismiss",
  tone = "danger",
  className,
  children,
}: {
  message: React.ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  tone?: "danger" | "warning";
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2 text-xs animate-in fade-in-0 slide-in-from-top-1 duration-200",
        tone === "danger"
          ? "border-danger/40 bg-danger/10 text-danger"
          : "border-warning/40 bg-warning/10 text-warning",
        className,
      )}
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1 break-words">
        {message}
        {children}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          title={dismissLabel}
          className="-m-0.5 shrink-0 rounded p-0.5 opacity-80 hover:bg-foreground/10 hover:opacity-100"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
