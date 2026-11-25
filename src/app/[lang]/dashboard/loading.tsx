import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8" role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-7 w-56" />
      <Skeleton className="mt-2 h-4 w-80" />

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card-elevated rounded-xl border p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-7 w-12" />
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-b py-3 md:flex-row md:items-center md:justify-between">
        <Skeleton className="h-10 w-full max-w-xs" />
        <Skeleton className="h-10 w-full md:w-56" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28" />
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card-elevated rounded-xl border p-6">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="mt-3 h-3 w-2/3" />
            <div className="mt-4 flex gap-1.5">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-2 flex-1 rounded-full" />
              ))}
            </div>
            <Skeleton className="mt-2 h-4 w-40" />
            <Skeleton className="mt-3 h-20 w-full rounded-lg" />
            <div className="mt-4 flex justify-end">
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
