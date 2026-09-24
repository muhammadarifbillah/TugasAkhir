"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Monitor, Save, Smartphone, Sparkles, Tablet, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DesignScreen } from "@/components/studio/design-screen";
import { csrfFetch } from "@/lib/csrf-client";
import type { DesignScreen as DesignScreenType } from "@/lib/design";

export interface DesignStudioLabels {
  title: string;
  promptPlaceholder: string;
  generate: string;
  generating: string;
  refine: string;
  refinePlaceholder: string;
  keep: string;
  discard: string;
  saved: string;
  draft: string;
  empty: string;
  savedCount: string;
}

interface DesignStudioDialogProps {
  projectId: string;
  savedScreens: DesignScreenType[];
  labels: DesignStudioLabels;
  onClose: () => void;
  onSaved?: () => void;
}

type Device = DesignScreenType["device"];

export function DesignStudioDialog({
  projectId,
  savedScreens,
  labels,
  onClose,
  onSaved,
}: DesignStudioDialogProps) {
  const [saved, setSaved] = useState<DesignScreenType[]>(savedScreens);
  const [draft, setDraft] = useState<DesignScreenType | null>(null);
  // When a draft was refined from a kept screen, Keep overwrites that screen.
  const [draftBaseId, setDraftBaseId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    savedScreens[0]?.id ?? null,
  );
  const [prompt, setPrompt] = useState("");
  const [refinePrompt, setRefinePrompt] = useState("");
  const [device, setDevice] = useState<Device>("desktop");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const all = useMemo(() => (draft ? [...saved, draft] : saved), [saved, draft]);
  const selected = all.find((s) => s.id === selectedId) ?? null;

  const generate = useCallback(
    async (opts: { prompt: string; base?: DesignScreenType | null }) => {
      const text = opts.prompt.trim();
      if (!text) return;
      setLoading(true);
      setError(null);
      try {
        const res = await csrfFetch(`/api/projects/${projectId}/design/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: text,
            device,
            html: opts.base?.html,
          }),
        });
        const data = (await res.json()) as { screen?: DesignScreenType; error?: string; message?: string };
        if (!res.ok || !data.screen) {
          setError(data.message ?? data.error ?? labels.generate);
          return;
        }
        setDraft(data.screen);
        setSelectedId(data.screen.id);
        if (opts.base) {
          // Refining a kept screen → Keep will replace it; refining the current
          // draft keeps the original base.
          const baseIsSaved = saved.some((s) => s.id === opts.base!.id);
          if (baseIsSaved) setDraftBaseId(opts.base.id);
        } else {
          setDraftBaseId(null);
        }
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    },
    [projectId, device, labels.generate, saved],
  );

  async function persist(next: DesignScreenType[]) {
    setSaving(true);
    setError(null);
    try {
      const res = await csrfFetch(`/api/projects/${projectId}/design`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designScreens: next }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? labels.generate);
        return false;
      }
      setSaved(next);
      onSaved?.();
      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function keepDraft() {
    if (!draft) return;
    const next = draftBaseId
      ? saved.map((s) => (s.id === draftBaseId ? draft : s))
      : [...saved, draft];
    if (await persist(next)) {
      setSelectedId(draft.id);
      setDraft(null);
      setDraftBaseId(null);
    }
  }

  async function removeScreen(id: string) {
    const next = saved.filter((s) => s.id !== id);
    if (await persist(next)) {
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
    }
  }

  const deviceBtn = (value: Device, Icon: typeof Monitor) => (
    <button
      type="button"
      onClick={() => setDevice(value)}
      className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
        device === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
      }`}
    >
      <Icon className="size-3.5" /> {value}
    </button>
  );

  return (
    <div className="fixed inset-0 z-[70] flex h-dvh flex-col bg-background">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-sm font-semibold">{labels.title}</h2>
          <Badge variant="secondary">
            {saved.length} {labels.savedCount}
          </Badge>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close">
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Prompt panel */}
        <aside className="flex w-full shrink-0 flex-col gap-3 overflow-y-auto border-b p-3 lg:w-80 lg:border-b-0 lg:border-r">
          <div className="flex rounded-lg border bg-muted p-0.5">
            {deviceBtn("desktop", Monitor)}
            {deviceBtn("tablet", Tablet)}
            {deviceBtn("mobile", Smartphone)}
          </div>

          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={labels.promptPlaceholder}
            rows={4}
            className="text-sm"
          />
          <Button onClick={() => generate({ prompt })} disabled={loading || !prompt.trim()}>
            {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {loading ? labels.generating : labels.generate}
          </Button>

          {selected && (
            <div className="mt-2 border-t pt-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {labels.refine}
              </p>
              <Textarea
                value={refinePrompt}
                onChange={(e) => setRefinePrompt(e.target.value)}
                placeholder={labels.refinePlaceholder}
                rows={3}
                className="text-sm"
              />
              <Button
                className="mt-2 w-full"
                variant="outline"
                disabled={loading || !refinePrompt.trim()}
                onClick={async () => {
                  await generate({ prompt: refinePrompt, base: selected });
                  setRefinePrompt("");
                }}
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                {labels.refine}
              </Button>
            </div>
          )}

          {error && (
            <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </aside>

        {/* Gallery */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {all.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
              {labels.empty}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {all.map((screen) => {
                const isDraft = draft?.id === screen.id;
                const active = selectedId === screen.id;
                return (
                  <div
                    key={screen.id}
                    className={`overflow-hidden rounded-lg border bg-card ${active ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate font-medium">{screen.name}</span>
                        {isDraft && <Badge variant="warning">{labels.draft}</Badge>}
                      </span>
                      <div className="flex items-center gap-1">
                        {isDraft ? (
                          <Button size="sm" className="h-6 px-2 text-[11px]" onClick={keepDraft} disabled={saving}>
                            {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                            {labels.keep}
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-6"
                            onClick={() => removeScreen(screen.id)}
                            disabled={saving}
                            aria-label={labels.discard}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedId(screen.id)}
                      className={`block h-48 w-full ${active ? "" : "opacity-90 hover:opacity-100"}`}
                    >
                      <DesignScreen html={screen.html} title={screen.name} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
