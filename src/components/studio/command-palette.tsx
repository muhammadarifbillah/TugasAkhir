"use client";

import { useId, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface PaletteCommand {
  id: string;
  group: string;
  label: string;
  hint?: string;
  run: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  commands,
  labels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commands: PaletteCommand[];
  labels: { title: string; placeholder: string; empty: string; footer: string };
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogTitle className="sr-only">{labels.title}</DialogTitle>
        <DialogDescription className="sr-only">{labels.footer}</DialogDescription>
        {/* Remounted on every open so the query and selection start fresh. */}
        {open && <PaletteBody commands={commands} labels={labels} onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function PaletteBody({
  commands,
  labels,
  onClose,
}: {
  commands: PaletteCommand[];
  labels: { placeholder: string; empty: string; footer: string };
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const listId = useId();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => `${c.label} ${c.group}`.toLowerCase().includes(q));
  }, [commands, query]);
  const active = Math.min(index, Math.max(0, filtered.length - 1));

  const run = (cmd: PaletteCommand | undefined) => {
    if (!cmd) return;
    onClose();
    // Let the dialog close (and restore focus) before the command moves focus.
    setTimeout(cmd.run, 0);
  };

  return (
    <div className="flex max-h-[70vh] flex-col">
      <div className="flex items-center gap-2 border-b px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={filtered[active] ? `${listId}-${filtered[active].id}` : undefined}
          aria-label={labels.placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((active + 1) % Math.max(1, filtered.length));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((active - 1 + filtered.length) % Math.max(1, filtered.length));
            } else if (e.key === "Enter") {
              e.preventDefault();
              run(filtered[active]);
            }
          }}
          placeholder={labels.placeholder}
          className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      <ul id={listId} role="listbox" className="min-h-0 flex-1 overflow-y-auto p-1">
        {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">{labels.empty}</li>}
        {filtered.map((cmd, i) => {
          const header = i === 0 || filtered[i - 1].group !== cmd.group ? cmd.group : null;
          return (
            <li key={cmd.id} role="presentation">
              {header && (
                <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground" aria-hidden="true">
                  {header}
                </p>
              )}
              <div
                id={`${listId}-${cmd.id}`}
                role="option"
                aria-selected={i === active}
                onMouseMove={() => setIndex(i)}
                onClick={() => run(cmd)}
                className={cn(
                  "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm",
                  i === active ? "bg-accent text-accent-foreground" : "text-foreground",
                )}
              >
                <span className="truncate">{cmd.label}</span>
                {cmd.hint && <kbd className="shrink-0 font-sans text-[11px] text-muted-foreground">{cmd.hint}</kbd>}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">{labels.footer}</p>
    </div>
  );
}
