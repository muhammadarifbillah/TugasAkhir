"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { CopyButton } from "@/components/ui/copy-button";
import { cn } from "@/lib/utils";

interface JsonTreeLabels {
  items: string;
  keys: string;
  copy: string;
  copied: string;
}

const DEFAULT_LABELS: JsonTreeLabels = {
  items: "{count} items",
  keys: "{count} keys",
  copy: "Copy",
  copied: "Copied",
};

/** Collapsible, read-only JSON viewer for the "Raw data" tab. */
export function JsonTree({
  data,
  labels = DEFAULT_LABELS,
  className,
}: {
  data: unknown;
  labels?: JsonTreeLabels;
  className?: string;
}) {
  const json = JSON.stringify(data ?? null, null, 2) ?? "null";
  return (
    <div className={cn("relative rounded-md border bg-muted/40 p-3 font-mono text-xs", className)}>
      <div className="absolute end-2 top-2">
        <CopyButton value={json} label={labels.copy} copiedLabel={labels.copied} />
      </div>
      <div className="overflow-x-auto pe-6">
        <JsonNode value={data ?? null} depth={0} labels={labels} />
      </div>
    </div>
  );
}

function JsonNode({
  name,
  value,
  depth,
  labels,
}: {
  name?: string;
  value: unknown;
  depth: number;
  labels: JsonTreeLabels;
}) {
  const [open, setOpen] = useState(depth < 2);
  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === "object";

  const keyLabel = name !== undefined && <span className="text-info">{JSON.stringify(name)}: </span>;

  if (!isObject) {
    return (
      <div className="whitespace-pre-wrap break-words py-px">
        {keyLabel}
        <Primitive value={value} />
      </div>
    );
  }

  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);
  const count = entries.length;
  const summary = (isArray ? labels.items : labels.keys).replace("{count}", String(count));

  if (count === 0) {
    return (
      <div className="py-px">
        {keyLabel}
        <span className="text-muted-foreground">{isArray ? "[]" : "{}"}</span>
      </div>
    );
  }

  return (
    <div className="py-px">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="-ms-1 inline-flex items-center gap-0.5 rounded px-1 text-start hover:bg-muted"
      >
        <ChevronRight className={cn("size-3 shrink-0 transition-transform", open && "rotate-90")} />
        {keyLabel}
        <span className="text-muted-foreground">
          {isArray ? "[" : "{"}
          {!open && ` … ${isArray ? "]" : "}"} `}
        </span>
        {!open && <span className="text-[11px] text-muted-foreground">{summary}</span>}
      </button>
      {open && (
        <>
          <div className="ms-2 border-s ps-3">
            {entries.map(([k, v]) => (
              <JsonNode key={k} name={isArray ? undefined : k} value={v} depth={depth + 1} labels={labels} />
            ))}
          </div>
          <span className="text-muted-foreground">{isArray ? "]" : "}"}</span>
        </>
      )}
    </div>
  );
}

function Primitive({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span className="text-muted-foreground">null</span>;
  if (typeof value === "string") return <span className="text-success">{JSON.stringify(value)}</span>;
  if (typeof value === "number") return <span className="text-warning tabular-nums">{String(value)}</span>;
  if (typeof value === "boolean") return <span className="text-primary">{String(value)}</span>;
  return <span>{String(value)}</span>;
}
