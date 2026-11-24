import { cn } from "@/lib/utils";

/** Report-style definition list: "label ........ value" rows on hairlines. */
export function Ledger({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dl className={cn("divide-y divide-[var(--ledger-rule)] border-y border-[var(--ledger-rule)]", className)}>{children}</dl>;
}

export function LedgerRow({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="leader py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium">{value}</dd>
    </div>
  );
}
