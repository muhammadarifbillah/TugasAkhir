import { cn } from "@/lib/utils";

/** Definition list of "label ........ value" rows. */
export function Ledger({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dl className={cn("divide-y divide-[var(--border)]", className)}>{children}</dl>;
}

export function LedgerRow({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="ledger-row py-3 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium">{value}</dd>
    </div>
  );
}
