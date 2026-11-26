"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Loader2,
  Maximize2,
  Monitor,
  Plus,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
  Tablet,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HelpTip } from "@/components/ui/help-tip";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { DesignScreen } from "@/components/studio/design-screen";
import { FullscreenViewer } from "@/components/studio/fullscreen-viewer";
import { csrfFetch } from "@/lib/csrf-client";
import {
  MAX_SCREENS,
  mockupDevicesFor,
  normalizePlan,
  planPageKey,
  screenForHref,
  uniqueScreensById,
  type DesignPlan,
  type DesignPlanRole,
  type DesignScreen as DesignScreenType,
} from "@/lib/design";

export interface DesignStudioLabels {
  title: string;
  promptPlaceholder: string;
  generate: string;
  generating: string;
  refine: string;
  refinePlaceholder: string;
  refineHint: string;
  refineBusy: string;
  keep: string;
  keepAll: string;
  discard: string;
  draft: string;
  empty: string;
  savedCount: string;
  error: string;
  retry: string;
  confirmDiscard: string;
  // Role / plan
  roleLabel: string;
  general: string;
  generateAll: string;
  generateAllBusy: string;
  planTitle: string;
  planEdit: string;
  planDone: string;
  planSave: string;
  planRegenerate: string;
  addRole: string;
  addPage: string;
  stale: string;
  revise: string;
  targetsLocked: string;
  startInteractive: string;
  stopInteractive: string;
  noMockupForLink: string;
  help: string;
  helpLabel: string;
  saveDone: string;
  generateDone: string;
  planSaved: string;
}

interface DesignStudioDialogProps {
  projectId: string;
  savedScreens: DesignScreenType[];
  designPlan?: unknown;
  /** Platforms declared at the needs step; viewports outside them stay locked. */
  targets: string[];
  labels: DesignStudioLabels;
  onClose: () => void;
  onSaved?: () => void;
  /** Called when the AI produced/changed designs, so the studio can flag the UI step. */
  onAiFinished?: (steps: string[]) => void;
}

type Device = DesignScreenType["device"];
const GENERAL = "__general__";

interface Request {
  prompt: string;
  base?: DesignScreenType | null;
  multi?: boolean;
  role?: string;
  planKey?: string;
  planPages?: { key: string; name: string }[];
  planVersion?: number;
}

export function DesignStudioDialog({
  projectId,
  savedScreens,
  designPlan,
  targets,
  labels,
  onClose,
  onSaved,
  onAiFinished,
}: DesignStudioDialogProps) {
  const headingId = useId();
  const { addToast } = useToast();
  const allowedDevices = useMemo(() => mockupDevicesFor(targets), [targets]);
  const [saved, setSaved] = useState<DesignScreenType[]>(savedScreens);
  const [drafts, setDrafts] = useState<DesignScreenType[]>([]);
  const [plan, setPlan] = useState<DesignPlan>(() => normalizePlan(designPlan));
  const [planDraft, setPlanDraft] = useState<DesignPlan>(() => normalizePlan(designPlan));
  const [planEditing, setPlanEditing] = useState(false);
  const [activeRoleId, setActiveRoleId] = useState<string>(
    () => normalizePlan(designPlan).roles[0]?.id ?? GENERAL,
  );
  const [selectedId, setSelectedId] = useState<string | null>(savedScreens[0]?.id ?? null);
  const [prompt, setPrompt] = useState("");
  const [refinePrompt, setRefinePrompt] = useState("");
  const [device, setDevice] = useState<Device>(() => allowedDevices[0] ?? "desktop");
  const [loading, setLoading] = useState(false);
  const [busyKind, setBusyKind] = useState<"generate" | "refine" | "generate-all" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<Request | null>(null);
  const [fullscreen, setFullscreen] = useState<DesignScreenType | null>(null);
  const [fsMaximized, setFsMaximized] = useState(false);
  // Keep the latest callback without rebuilding the generate() callback.
  const onAiFinishedRef = useRef(onAiFinished);
  useEffect(() => {
    onAiFinishedRef.current = onAiFinished;
  }, [onAiFinished]);

  const activeRole: DesignPlanRole | null =
    plan.roles.find((r) => r.id === activeRoleId) ?? null;
  const activeRoleName = activeRole?.name;

  const all = useMemo(() => uniqueScreensById([...saved, ...drafts]), [saved, drafts]);
  const selected = all.find((s) => s.id === selectedId) ?? null;

  // General shows every design across all roles; a specific role filters to it.
  const visible = useMemo(
    () => (activeRoleId === GENERAL ? all : all.filter((s) => s.role === activeRoleName)),
    [all, activeRoleId, activeRoleName],
  );

  const staleCount = useMemo(
    () =>
      activeRole
        ? all.filter((s) => s.role === activeRole.name && (s.planVersion ?? 0) < plan.version)
            .length
        : 0,
    [all, activeRole, plan.version],
  );

  const designedCount = useMemo(
    () =>
      activeRole
        ? activeRole.pages.filter((p) =>
            all.some((s) => s.planKey === planPageKey(activeRole.id, p.id)),
          ).length
        : 0,
    [all, activeRole],
  );

  const requestClose = useCallback(() => {
    if (drafts.length > 0 && !window.confirm(labels.confirmDiscard)) return;
    onClose();
  }, [drafts.length, labels.confirmDiscard, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [requestClose]);

  const persist = useCallback(
    async (next: DesignScreenType[]) => {
      setSaving(true);
      setError(null);
      try {
      const unique = uniqueScreensById(next);
      const res = await csrfFetch(`/api/projects/${projectId}/design`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designScreens: unique }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? labels.error);
        return false;
      }
      setSaved(unique);
        addToast("success", labels.saveDone);
        onSaved?.();
        return true;
      } catch {
        setError(labels.error);
        return false;
      } finally {
        setSaving(false);
      }
    },
    [projectId, labels.error, labels.saveDone, addToast, onSaved],
  );

  const generate = useCallback(
    async (req: Request) => {
      const text = req.prompt.trim();
      if (!text && !req.planPages?.length) return;
      setLoading(true);
      setBusyKind(req.base ? "refine" : req.multi ? "generate-all" : "generate");
      setError(null);
      setLastRequest(req);
      const baseIsSaved = Boolean(req.base && saved.some((s) => s.id === req.base!.id));
      try {
        const res = await csrfFetch(`/api/projects/${projectId}/design/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: text || "Generate the planned pages.",
            device,
            ...(baseIsSaved ? { screenId: req.base!.id } : {}),
            ...(req.base && !baseIsSaved ? { html: req.base.html } : {}),
            ...(req.base ? { name: req.base.name } : {}),
            multi: req.base ? false : Boolean(req.multi),
            role: req.base ? req.base.role : req.role,
            planKey: req.base ? req.base.planKey : req.planKey,
            planVersion: req.base ? req.base.planVersion : (req.planVersion ?? plan.version),
            ...(req.planPages ? { planPages: req.planPages } : {}),
          }),
        });
        const data = (await res.json()) as {
          screens?: DesignScreenType[];
          screen?: DesignScreenType;
          error?: string;
          message?: string;
        };
        const list = data.screens ?? (data.screen ? [data.screen] : []);
        if (!res.ok || list.length === 0) {
          setError(data.message ?? data.error ?? labels.error);
          return;
        }
        onAiFinishedRef.current?.(["ui"]);
        const first = list[0];
        if (req.base) {
          if (!baseIsSaved) {
            setDrafts((prev) => prev.map((d) => (d.id === req.base!.id ? first : d)));
            setSelectedId(first.id);
            return;
          }
          const next = saved.map((s) => (s.id === req.base!.id ? first : s));
          if (await persist(next)) setSelectedId(first.id);
        } else {
          setDrafts((prev) => {
            const have = new Set([...saved.map((s) => s.id), ...prev.map((d) => d.id)]);
            return [...prev, ...list.filter((s) => !have.has(s.id))];
          });
          setSelectedId(first.id);
          addToast("success", labels.generateDone);
        }
      } catch {
        setError(labels.error);
      } finally {
        setLoading(false);
        setBusyKind(null);
      }
    },
    [projectId, device, labels.error, labels.generateDone, addToast, saved, persist, plan.version],
  );

  const generateAllForRole = useCallback(
    (role: DesignPlanRole) => {
      void generate({
        prompt: `Generate every page for the "${role.name}" role from the design plan.`,
        multi: true,
        role: role.name,
        planVersion: plan.version,
        planPages: role.pages.map((p) => ({
          key: planPageKey(role.id, p.id),
          name: p.name,
        })),
      });
    },
    [generate, plan.version],
  );

  /** Replace a saved screen with the same planKey/name, else append. */
  function mergedWith(list: DesignScreenType[], screen: DesignScreenType): DesignScreenType[] {
    // Same id already present (e.g. a kept screen re-added as a draft) → replace.
    const sameId = list.findIndex((s) => s.id === screen.id);
    if (sameId >= 0) return list.map((s, i) => (i === sameId ? screen : s));
    const idx = screen.planKey
      ? list.findIndex((s) => s.planKey === screen.planKey)
      : list.findIndex((s) => (s.role ?? GENERAL) === (screen.role ?? GENERAL) && s.name === screen.name);
    if (idx >= 0) return uniqueScreensById(list.map((s, i) => (i === idx ? screen : s)));
    if (list.length >= MAX_SCREENS) return list;
    return uniqueScreensById([...list, screen]);
  }

  async function keepDraft(screen: DesignScreenType) {
    if (await persist(mergedWith(saved, screen))) {
      setDrafts((prev) => prev.filter((d) => d.id !== screen.id));
    }
  }

  async function keepAll() {
    let next = saved.slice();
    const kept = new Set<string>();
    for (const d of drafts) {
      const merged = mergedWith(next, d);
      if (merged === next) continue; // full and no replacement
      next = merged;
      kept.add(d.id);
    }
    if (await persist(next)) setDrafts((prev) => prev.filter((d) => !kept.has(d.id)));
  }

  function discardDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  async function removeScreen(id: string) {
    const next = saved.filter((s) => s.id !== id);
    if (await persist(next)) {
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
    }
  }

  // ── Plan editing ─────────────────────────────────────────────
  function startPlanEdit() {
    setPlanDraft({ ...plan, roles: plan.roles.map((r) => ({ ...r, pages: [...r.pages] })) });
    setPlanEditing(true);
  }

  function addRole() {
    setPlanDraft((p) => ({
      ...p,
      roles: [...p.roles, { id: `role_${Math.random().toString(36).slice(2, 7)}`, name: "New role", pages: [] }],
    }));
  }

  function removeRole(id: string) {
    setPlanDraft((p) => ({ ...p, roles: p.roles.filter((r) => r.id !== id) }));
  }

  function renameRole(id: string, name: string) {
    setPlanDraft((p) => ({ ...p, roles: p.roles.map((r) => (r.id === id ? { ...r, name } : r)) }));
  }

  function addPage(roleId: string) {
    setPlanDraft((p) => ({
      ...p,
      roles: p.roles.map((r) =>
        r.id === roleId
          ? {
              ...r,
              pages: [
                ...r.pages,
                { id: `pg_${Math.random().toString(36).slice(2, 7)}`, name: "New page" },
              ],
            }
          : r,
      ),
    }));
  }

  function removePage(roleId: string, pageId: string) {
    setPlanDraft((p) => ({
      ...p,
      roles: p.roles.map((r) =>
        r.id === roleId ? { ...r, pages: r.pages.filter((pg) => pg.id !== pageId) } : r,
      ),
    }));
  }

  function renamePage(roleId: string, pageId: string, name: string) {
    setPlanDraft((p) => ({
      ...p,
      roles: p.roles.map((r) =>
        r.id === roleId
          ? { ...r, pages: r.pages.map((pg) => (pg.id === pageId ? { ...pg, name } : pg)) }
          : r,
      ),
    }));
  }

  async function savePlan() {
    setSaving(true);
    setError(null);
    try {
      const res = await csrfFetch(`/api/projects/${projectId}/design/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planDraft }),
      });
      const data = (await res.json()) as { plan?: DesignPlan; error?: string };
      if (!res.ok || !data.plan) {
        setError(data.error ?? labels.error);
        return;
      }
      setPlan(normalizePlan(data.plan));
      setPlanEditing(false);
      addToast("success", labels.planSaved);
      onAiFinishedRef.current?.(["ui"]);
      onSaved?.();
    } catch {
      setError(labels.error);
    } finally {
      setSaving(false);
    }
  }

  async function regeneratePlan() {
    setLoading(true);
    setBusyKind("generate-all");
    setError(null);
    try {
      const res = await csrfFetch(`/api/projects/${projectId}/design/plan`, { method: "POST" });
      const data = (await res.json()) as { plan?: DesignPlan; error?: string; message?: string };
      if (!res.ok || !data.plan) {
        setError(data.message ?? data.error ?? labels.error);
        return;
      }
      const next = normalizePlan(data.plan);
      setPlan(next);
      setActiveRoleId((id) => (next.roles.some((r) => r.id === id) ? id : next.roles[0]?.id ?? GENERAL));
      addToast("success", labels.planSaved);
      onAiFinishedRef.current?.(["ui"]);
    } catch {
      setError(labels.error);
    } finally {
      setLoading(false);
      setBusyKind(null);
    }
  }

  const deviceBtn = (value: Device, Icon: typeof Monitor) => {
    const allowed = allowedDevices.includes(value);
    return (
      <button
        type="button"
        onClick={() => setDevice(value)}
        aria-pressed={device === value}
        disabled={!allowed}
        title={allowed ? undefined : labels.targetsLocked}
        className={`flex flex-1 items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
          device === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
        }`}
      >
        <Icon className="size-3.5" /> {value}
      </button>
    );
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby={headingId} className="fixed inset-0 z-[70] flex h-dvh flex-col bg-background">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id={headingId} className="truncate text-sm font-semibold">{labels.title}</h2>
          <HelpTip text={labels.help} label={labels.helpLabel} />
          <Badge variant="secondary">
            {saved.length} / {MAX_SCREENS} {labels.savedCount}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          {drafts.length > 1 && (
            <Button size="sm" className="h-7" onClick={keepAll} disabled={saving}>
              {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
              {labels.keepAll}
            </Button>
          )}
          <Button size="icon" variant="ghost" onClick={requestClose} aria-label="Close">
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <aside className="flex w-full min-w-0 shrink-0 flex-col gap-3 border-b p-3 lg:w-80 lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="flex rounded-lg border bg-muted p-0.5">
            {deviceBtn("desktop", Monitor)}
            {deviceBtn("tablet", Tablet)}
            {deviceBtn("mobile", Smartphone)}
          </div>
          {allowedDevices.length < 3 && (
            <p className="-mt-1 text-[11px] leading-snug text-muted-foreground">
              {labels.targetsLocked}
            </p>
          )}

          {/* Regular (free-form) generate */}
          <label htmlFor="design-prompt" className="sr-only">
            {labels.promptPlaceholder}
          </label>
          <Textarea
            id="design-prompt"
            name="designPrompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={labels.promptPlaceholder}
            rows={4}
            className="text-sm"
          />
          <Button onClick={() => generate({ prompt })} disabled={loading || !prompt.trim()}>
            {loading && busyKind === "generate" ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {loading && busyKind === "generate" ? labels.generating : labels.generate}
          </Button>

          {selected && (
            <div className="mt-2 border-t pt-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {labels.refine}: <span className="normal-case text-foreground">{selected.name}</span>
              </p>
              <label htmlFor="design-refine" className="sr-only">
                {labels.refinePlaceholder}
              </label>
              <Textarea
                id="design-refine"
                name="designRefine"
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
                {loading && busyKind === "refine" ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                {loading && busyKind === "refine" ? labels.refineBusy : labels.refine}
              </Button>
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{labels.refineHint}</p>
            </div>
          )}

          {/* Design plan */}
          <div className="mt-2 border-t pt-3">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {labels.planTitle}
              </p>
              <button
                type="button"
                onClick={() => (planEditing ? setPlanEditing(false) : startPlanEdit())}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                {planEditing ? labels.planDone : labels.planEdit}
              </button>
            </div>

            {planEditing ? (
              <div className="space-y-2">
                {planDraft.roles.map((role) => (
                  <div key={role.id} className="rounded-md border p-2">
                    <div className="flex items-center gap-1">
                      <Input
                        value={role.name}
                        onChange={(e) => renameRole(role.id, e.target.value)}
                        className="h-7 text-xs"
                        aria-label={labels.roleLabel}
                      />
                      <Button size="icon" variant="ghost" className="size-7" onClick={() => removeRole(role.id)} aria-label={labels.discard}>
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                    <div className="mt-1 space-y-1">
                      {role.pages.map((page) => (
                        <div key={page.id} className="flex items-center gap-1 ps-2">
                          <Input
                            value={page.name}
                            onChange={(e) => renamePage(role.id, page.id, e.target.value)}
                            className="h-6 text-[11px]"
                            aria-label="Page"
                          />
                          <Button size="icon" variant="ghost" className="size-6" onClick={() => removePage(role.id, page.id)} aria-label={labels.discard}>
                            <X className="size-3" />
                          </Button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addPage(role.id)}
                        className="flex items-center gap-1 ps-2 text-[11px] text-primary hover:underline"
                      >
                        <Plus className="size-3" /> {labels.addPage}
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={addRole}>
                    <Plus className="size-3" /> {labels.addRole}
                  </Button>
                  <Button size="sm" className="h-7 text-[11px]" onClick={savePlan} disabled={saving}>
                    {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                    {labels.planSave}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={regeneratePlan} disabled={loading}>
                    <RotateCcw className="size-3" /> {labels.planRegenerate}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {plan.roles.length === 0 ? (
                  <Button size="sm" variant="outline" className="h-7 w-full text-[11px]" onClick={regeneratePlan} disabled={loading}>
                    {loading && busyKind === "generate-all" ? <Loader2 className="size-3 animate-spin" /> : <Sparkles className="size-3" />}
                    {labels.planRegenerate}
                  </Button>
                ) : (
                  plan.roles.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setActiveRoleId(r.id)}
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-xs ${
                        activeRoleId === r.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="truncate">{r.name}</span>
                      <span className="font-mono text-[11px]">{r.pages.length}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {saved.length >= MAX_SCREENS && (
            <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[11px] text-warning">
              {labels.savedCount}: {MAX_SCREENS}. {labels.discard}.
            </p>
          )}

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <p>{error}</p>
              {lastRequest && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7"
                  onClick={() => generate(lastRequest)}
                  disabled={loading}
                >
                  <RotateCcw className="size-3" /> {labels.retry}
                </Button>
              )}
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-col lg:min-h-0 lg:flex-1">
          {/* Role selector bar (sticky on mobile so it stays visible while scrolling) */}
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2">
            <label htmlFor="design-role" className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {labels.roleLabel}
            </label>
            <div className="relative">
              <select
                id="design-role"
                name="designRole"
                value={activeRoleId}
                onChange={(e) => setActiveRoleId(e.target.value)}
                className="h-8 appearance-none rounded-md border bg-background pe-7 ps-2 text-xs font-medium"
              >
                <option value={GENERAL}>{labels.general}</option>
                {plan.roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute end-1.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>

            {activeRole && (
              <>
                <Badge variant="secondary">
                  {designedCount}/{activeRole.pages.length}
                </Badge>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => generateAllForRole(activeRole)}
                  disabled={loading}
                >
                  {loading && busyKind === "generate-all" ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  {loading && busyKind === "generate-all" ? labels.generateAllBusy : labels.generateAll}
                </Button>
              </>
            )}

            {staleCount > 0 && (
              <button
                type="button"
                onClick={() => activeRole && generateAllForRole(activeRole)}
                disabled={loading}
                title={labels.stale}
                className="ms-auto flex items-center gap-1 rounded-md border border-warning/50 bg-warning/10 px-2 py-1 text-[11px] font-medium text-warning hover:bg-warning/20"
              >
                <RotateCcw className="size-3" /> {labels.stale} ({staleCount}) · {labels.revise}
              </button>
            )}
          </div>

          <div className="p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {visible.length === 0 ? (
              <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
                {labels.empty}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visible.map((screen) => {
                  const isDraft = drafts.some((d) => d.id === screen.id);
                  const active = selectedId === screen.id;
                  const stale = Boolean(activeRole) && (screen.planVersion ?? 0) < plan.version;
                  return (
                    <div
                      key={screen.id}
                      className={`overflow-hidden rounded-lg border bg-card ${active ? "ring-2 ring-primary" : ""}`}
                    >
                      <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5 text-xs">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <span className="truncate font-medium">{screen.name}</span>
                          {isDraft && <Badge variant="warning">{labels.draft}</Badge>}
                          {stale && <Badge variant="outline">{labels.revise}</Badge>}
                        </span>
                        <div className="flex items-center gap-1">
                          {isDraft ? (
                            <>
                              <Button
                                size="sm"
                                className="h-6 px-2 text-[11px]"
                                onClick={() => keepDraft(screen)}
                                disabled={saving}
                              >
                                {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                                {labels.keep}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-6"
                                onClick={() => discardDraft(screen.id)}
                                disabled={saving}
                                aria-label={labels.discard}
                              >
                                <Trash2 className="size-3.5 text-destructive" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-6"
                                aria-label={`${labels.title}: ${screen.name}`}
                                onClick={() => {
                                  setFsMaximized(false);
                                  setFullscreen(screen);
                                }}
                              >
                                <Maximize2 className="size-3.5" />
                              </Button>
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
                            </>
                          )}
                        </div>
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        aria-pressed={active}
                        onClick={() => setSelectedId(screen.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedId(screen.id);
                          }
                        }}
                        className={`block w-full cursor-pointer ${active ? "" : "opacity-90 hover:opacity-100"}`}
                      >
                        <DesignScreen
                          html={screen.html}
                          title={screen.name}
                          device={screen.device}
                          viewportHeight={220}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {fullscreen && (
        <FullscreenViewer
          key={fullscreen.id}
          title={fullscreen.name}
          onClose={() => setFullscreen(null)}
          maximized={fsMaximized}
          onToggleMaximize={() => setFsMaximized((v) => !v)}
        >
          <DesignScreen
            html={fullscreen.html}
            title={fullscreen.name}
            device={fullscreen.device}
            scaleToFit={false}
            allowInteractive
            labels={{
              start: labels.startInteractive,
              stop: labels.stopInteractive,
            }}
            onNavigate={(href) => {
              const target = screenForHref(href, all, plan);
              if (target) setFullscreen(target);
              else addToast("info", labels.noMockupForLink);
            }}
          />
        </FullscreenViewer>
      )}
    </div>
  );
}
