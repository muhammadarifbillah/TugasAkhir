import { Loader2 } from "lucide-react";

/** Route-level loading state so slow server renders keep the app shell visible. */
export default function LangLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-[50svh] flex-col items-center justify-center gap-3"
    >
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
