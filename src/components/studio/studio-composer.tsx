"use client";

import { m } from "motion/react";
import { Hammer, ListTodo, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fmt } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { tabKeyNav } from "@/components/studio/tab-key-nav";

export type ComposerMode = "plan" | "build";
const MODES: readonly ComposerMode[] = ["plan", "build"];

/** Always-visible prompt composer with the Plan/Build mode switch. */
export function StudioComposer({
  dict,
  value,
  onChange,
  onSend,
  loading,
  mode,
  onModeChange,
  planActions,
}: {
  dict: Dictionary;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  loading: boolean;
  mode: ComposerMode;
  onModeChange: (mode: ComposerMode) => void;
  /** Action count of the active plan, or null when no plan is waiting. */
  planActions: number | null;
}) {
  const w = dict.workspace;
  const placeholder =
    mode === "plan" ? dict.studio.chatPlaceholder : planActions !== null ? w.buildPlaceholder : w.buildNeedsPlan;

  return (
    <div className="border-t px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="mb-1.5 flex items-center gap-2">
        <div
          role="radiogroup"
          aria-label={w.modeLabel}
          className="flex rounded-lg border bg-muted p-0.5"
          onKeyDown={(e) => tabKeyNav(e, MODES, mode, onModeChange)}
        >
          {MODES.map((opt) => {
            const checked = mode === opt;
            const Icon = opt === "plan" ? ListTodo : Hammer;
            return (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={checked}
                tabIndex={checked ? 0 : -1}
                onClick={() => onModeChange(opt)}
                className={cn(
                  "relative isolate flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  checked
                    ? mode === "plan"
                      ? "text-primary-foreground"
                      : "text-success-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {checked && (
                  <m.span
                    layoutId="composer-mode-indicator"
                    className={cn(
                      "absolute inset-0 -z-10 rounded-md shadow-sm transition-colors",
                      mode === "plan" ? "bg-primary" : "bg-success",
                    )}
                    transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    aria-hidden="true"
                  />
                )}
                <Icon className="size-3.5" aria-hidden="true" />
                {opt === "plan" ? w.modePlan : w.modeBuild}
              </button>
            );
          })}
        </div>
        {mode === "build" && (
          <span className={cn("text-[11px] tabular-nums", planActions !== null ? "text-success" : "text-warning")}>
            {planActions !== null ? fmt(w.actionsReady, { count: planActions }) : w.buildNeedsPlan}
          </span>
        )}
      </div>
      <Textarea
        id="chat-input"
        name="chatInput"
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder={placeholder}
        rows={2}
        className="min-h-[3rem] resize-none text-sm"
      />
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] text-muted-foreground">{dict.studio.shortcutHint}</span>
        <Button size="sm" onClick={onSend} disabled={loading || !value.trim()}>
          {loading ? <Loader2 className="animate-spin" /> : <Send className="size-4" />}
          {mode === "plan" ? dict.studio.send : w.modeBuild}
        </Button>
      </div>
    </div>
  );
}
