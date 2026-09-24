import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8" role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-2 h-4 w-72" />

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card-elevated rounded-xl border p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-4 h-10 w-full" />
            <Skeleton className="mt-2 h-10 w-2/3" />
          </div>
        ))}
      </div>

      <div className="mt-6 card-elevated rounded-xl border p-6">
        <Skeleton className="h-6 w-52" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="mt-3 h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
