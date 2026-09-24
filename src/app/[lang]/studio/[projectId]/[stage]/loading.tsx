import { Skeleton } from "@/components/ui/skeleton";

export default function StudioLoading() {
  return (
    <div className="flex min-h-[70svh] flex-col gap-4 p-4" role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="flex items-center gap-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-6 w-20" />
      </div>
      <div className="grid flex-1 gap-4 lg:grid-cols-12">
        <div className="card-elevated rounded-xl border p-4 lg:col-span-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="mt-3 h-12 w-full" />
          ))}
        </div>
        <div className="card-elevated rounded-xl border p-4 lg:col-span-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-4 h-64 w-full" />
          <Skeleton className="mt-4 h-24 w-full" />
        </div>
        <div className="card-elevated rounded-xl border p-4 lg:col-span-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="mt-3 h-20 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
