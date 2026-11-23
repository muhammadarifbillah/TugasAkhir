"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowRight,
  Bot,
  CheckCheck,
  CheckCircle2,
  Command,
  Database,
  Download,
  Eye,
  FileCode2,
  GitPullRequestArrow,
  Languages,
  Layout,
  ListChecks,
  Loader2,
  Lock,
  Maximize2,
  MoreHorizontal,
  PanelRightOpen,
  Play,
  RotateCcw,
  ShieldCheck,
  Trash2,
  User,
  Wand2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Markdown } from "@/components/ui/markdown";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { MonacoDiff, inferLanguage } from "@/components/studio/code-editor";
import { CodeWorkspace } from "@/components/studio/code-workspace";
import { CommandPalette, type PaletteCommand } from "@/components/studio/command-palette";
import { DeliverablesPanel } from "@/components/studio/deliverables-panel";
import { DesignScreen } from "@/components/studio/design-screen";
import { DesignStudioDialog } from "@/components/studio/design-studio-dialog";
import { FullscreenViewer } from "@/components/studio/fullscreen-viewer";
import { MermaidDiagram } from "@/components/studio/mermaid-diagram";
import { NextActionBar } from "@/components/studio/next-action-bar";
import { PlanCard, BuildResultCard, type PlanCardLabels } from "@/components/studio/plan-card";
import { RunWorkspace } from "@/components/studio/run-workspace";
import type { ScanFinding } from "@/components/studio/security-scan-panel";
import { StepResultDialog } from "@/components/studio/step-result-dialog";
import { getStepResultContent } from "@/components/studio/step-results";
import { StudioComposer } from "@/components/studio/studio-composer";
import {
  StudioRightPanel,
  panelTabLabel,
  panelTabsFor,
  type PanelTab,
} from "@/components/studio/studio-right-panel";
import {
  DataClassificationTable,
  NumberedList,
  ThreatModelView,
  type RecommendationRow,
} from "@/components/studio/studio-views";
import { tabKeyNav } from "@/components/studio/tab-key-nav";
import { csrfFetch } from "@/lib/csrf-client";
import { normalizeScreens, type DesignScreen as DesignScreenType } from "@/lib/design";
import { fmt } from "@/lib/format";
import type { PlanResult } from "@/lib/ai/result";
import type { Dictionary } from "@/lib/i18n";
import type { ScoreInfo } from "@/lib/project-stats";
import { useSyncedState } from "@/lib/use-synced-state";
import { cn } from "@/lib/utils";

interface StudioStage {
  code: string;
  name: string;
  description: string;
  orderIndex: number;
  nistGroups: string[];
  nistTasks: string[];
  isoControls: string[];
  secureParams: string[];
  steps: { id: string; nistTasks: string[]; isoControls: string[] }[];
  projectStageId: string;
}

interface StudioStageDef {
  code: string;
  name: string;
  orderIndex: number;
  status: string;
  id: number;
}

interface LatestRevision {
  id: string;
  version: string;
  revisionSummary: string;
  githubPrUrl: string | null;
  status: string;
}

interface MessageRow {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface SnapshotRow {
  id: string;
  version: string;
  diffSummary: string | null;
  createdAt: string;
  fileCount: number;
}

interface DatabaseInfo {
  service: string;
  hostPort: number;
  status: string;
}

/** Chat interaction mode: plan first, then execute the approved plan. */
export type ChatMode = "plan" | "build" | "direct";

export interface StudioWorkspaceProps {
  lang: string;
  dict: Dictionary;
  project: {
    id: string;
    name: string;
    version: string;
    outputLanguage: string;
    status: string;
    badgePublic: boolean;
    finalizedAt: string | null;
    database: DatabaseInfo | null;
  };
  stage: StudioStage;
  completionGaps: string[];
  nextStageCode: string | null;
  stages: StudioStageDef[];
  messages: MessageRow[];
  recommendations: RecommendationRow[];
  codeArtifacts: Record<string, string> | null;
  scoreInfo: ScoreInfo;
  latestRevision: LatestRevision | null;
  designDiagrams: string[];
  designArchitecture: string[];
  designThreatModel: Record<string, unknown>[];
  designUiDesign: string[];
  designScreens: unknown;
  designPlan: unknown;
  /** Latest persisted plan for this stage, restored across navigation/reload. */
  initialPlan: PlanResult | null;
  analysisDataClassification: string[];
  snapshots: SnapshotRow[];
  analysisStack: {
    recommendedStack: Record<string, unknown> | null;
    securityRequirements: string[];
    summary: string;
  } | null;
  designDatabaseSchema: string[];
  designErdDiagram: string;
  designAuthFlowDiagram: string;
  testingFindings: Record<string, unknown>[];
  testingFixedArtifacts: Record<string, string> | null;
  handoverManualBook: string;
  handoverComplianceReport: string;
  handoverReleaseChecklist: string[];
}

/** Structured stage result returned by the chat / build / reparse endpoints. */
interface StageResultPayload {
  summary?: string;
  codeArtifacts?: Record<string, string>;
  mermaid?: string[];
  architecture?: string[];
  recommendedStack?: Record<string, unknown>;
  securityRequirements?: string[];
  securityScore?: number;
}

interface ChatResponse {
  reply?: string;
  result?: StageResultPayload | null;
  plan?: PlanResult | null;
  securityScore?: number | null;
  recommendations?: RecommendationRow[];
  changedSteps?: string[];
  truncated?: boolean;
  error?: string;
  message?: string;
}

type ErrorArea = "chat" | "stage" | "files" | "findings";
type CenterTab = "workspace" | "chat";
const CENTER_TABS: readonly CenterTab[] = ["workspace", "chat"];
type MobileTab = "navigate" | "chat" | "security";

/** Hides the structured JSON block produced by the stage engine from the chat view. */
function displayAssistantText(content: string): string {
  let text = content;
  const fence = text.indexOf("```json");
  if (fence >= 0) {
    const close = text.indexOf("```", fence + 6);
    if (close >= 0) text = `${text.slice(0, fence)}${text.slice(close + 3)}`;
  }
  const jsonStart = text.indexOf("\n{");
  if (jsonStart >= 0) text = text.slice(0, jsonStart);
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : content;
}

/**
 * Tiny localStorage-backed store for the "unseen changes" sub-step ids, read via
 * `useSyncExternalStore`. The server snapshot is always empty, so the initial
 * client render matches the server HTML (no hydration mismatch) and the stored
 * value is applied right after hydration.
 */
function makePendingStepsStore(key: string) {
  let cached = "[]";
  const listeners = new Set<() => void>();
  const read = () => {
    try {
      return window.localStorage.getItem(key) ?? "[]";
    } catch {
      return "[]";
    }
  };
  return {
    subscribe(cb: () => void) {
      listeners.add(cb);
      const onStorage = (e: StorageEvent) => {
        if (!e.key || e.key === key) {
          cached = read();
          cb();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(cb);
        window.removeEventListener("storage", onStorage);
      };
    },
    getSnapshot() {
      const value = read();
      if (value !== cached) cached = value;
      return cached;
    },
    getServerSnapshot() {
      return "[]";
    },
    set(ids: string[]) {
      const value = JSON.stringify(ids);
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // storage may be unavailable
      }
      cached = value;
      listeners.forEach((l) => l());
    },
  };
}

function focusComposerInput() {
  requestAnimationFrame(() => document.getElementById("chat-input")?.focus());
}

export function StudioWorkspace(props: StudioWorkspaceProps) {
  return (
    <ToastProvider>
      <StudioWorkspaceInner {...props} />
    </ToastProvider>
  );
}

function StudioWorkspaceInner(props: StudioWorkspaceProps) {
  const { dict, lang, project, stage, stages, latestRevision, scoreInfo, completionGaps } = props;
  const w = dict.workspace;
  const router = useRouter();
  const { addToast } = useToast();

  const isDesign = stage.code === "design";
  const isAnalysis = stage.code === "analysis";
  const isCodeStage = stage.code === "development" || stage.code === "testing";
  const isHandover = stage.code === "handover";
  const stageAlreadyCompleted = stages.find((s) => s.code === stage.code)?.status === "completed";

  // Server-derived data that the client also updates optimistically. Each one
  // resets to the fresh prop after `router.refresh()`.
  const [messages, setMessages] = useSyncedState(props.messages);
  const [recommendations, setRecommendations] = useSyncedState(props.recommendations);
  const [codeArtifacts, setCodeArtifacts] = useSyncedState(props.codeArtifacts);
  const [diagrams, setDiagrams] = useSyncedState(props.designDiagrams);
  const [architecture, setArchitecture] = useSyncedState(props.designArchitecture);
  const [analysisInfo, setAnalysisInfo] = useSyncedState(props.analysisStack);
  const [finalizedAt, setFinalizedAt] = useSyncedState(props.project.finalizedAt);
  const [database, setDatabase] = useSyncedState(props.project.database);
  const threatModel = props.designThreatModel;
  const uiDesign = props.designUiDesign;
  const snapshots = props.snapshots;

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [reparsing, setReparsing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<ErrorArea, string>>>({});
  const [structuredWarning, setStructuredWarning] = useState(false);
  const [truncatedWarning, setTruncatedWarning] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [outputLanguage, setOutputLanguage] = useState(props.project.outputLanguage);

  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [reveal, setReveal] = useState<{ file: string; line: number; nonce: number } | null>(null);
  const [activeFix, setActiveFix] = useState<RecommendationRow | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingFiles, setSavingFiles] = useState(false);
  const [showRun, setShowRun] = useState(false);
  const [showDesignCanvas, setShowDesignCanvas] = useState(false);
  const [designFullscreen, setDesignFullscreen] = useState<DesignScreenType | null>(null);
  const [designFsMax, setDesignFsMax] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<SnapshotRow | null>(null);
  const [confirmDeleteDb, setConfirmDeleteDb] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [dbBusy, setDbBusy] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("plan");
  const [activePlan, setActivePlan] = useState<PlanResult | null>(props.initialPlan);
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildResult, setBuildResult] = useState<{
    actionsExecuted: number;
    filesCreated: string[];
    filesModified: string[];
    recommendationsCount: number;
    securityScore: number | null;
  } | null>(null);

  const designScreens = useMemo(() => normalizeScreens(props.designScreens), [props.designScreens]);
  const hasCode = !!codeArtifacts && Object.keys(codeArtifacts).length > 0;
  const stageHasResults = isAnalysis
    ? !!props.analysisStack?.recommendedStack
    : isDesign
      ? props.designDiagrams.length > 0 || props.designThreatModel.length > 0 || designScreens.length > 0
      : !!props.codeArtifacts && Object.keys(props.codeArtifacts).length > 0;

  const [centerTab, setCenterTab] = useState<CenterTab>(stageHasResults ? "workspace" : "chat");
  const [mobileTab, setMobileTab] = useState<MobileTab>("chat");
  const [panelTab, setPanelTab] = useState<PanelTab>("score");
  const [panelOpen, setPanelOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [activeStepResult, setActiveStepResult] = useState<string | null>(null);

  // Sub-steps with unseen changes (dot on the eye icon). Persisted per project+stage.
  const changesKey = `sf.stepChanges.${props.project.id}.${props.stage.code}`;
  const pendingStore = useMemo(() => makePendingStepsStore(changesKey), [changesKey]);
  const pendingRaw = useSyncExternalStore(
    pendingStore.subscribe,
    pendingStore.getSnapshot,
    pendingStore.getServerSnapshot,
  );
  const pendingSteps = useMemo(() => {
    try {
      const parsed = JSON.parse(pendingRaw) as unknown;
      return new Set(
        Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [],
      );
    } catch {
      return new Set<string>();
    }
  }, [pendingRaw]);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [morePos, setMorePos] = useState<{ top: number; right: number } | null>(null);
  const moreBtnRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const setAreaError = useCallback((area: ErrorArea, message: string | null) => {
    setErrors((prev) => {
      if (!message && !(area in prev)) return prev;
      const next = { ...prev };
      if (message) next[area] = message;
      else delete next[area];
      return next;
    });
  }, []);

  const toggleMoreMenu = useCallback(() => {
    if (moreOpen) {
      setMoreOpen(false);
      return;
    }
    const rect = moreBtnRef.current?.getBoundingClientRect();
    if (rect) setMorePos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMoreOpen(true);
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!moreBtnRef.current?.contains(t) && !moreMenuRef.current?.contains(t)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  // Stable identity: StepResultDialog syncs this in an effect, so an inline
  // callback would re-run it on every render and immediately undo maximize.
  const handleFullscreenChange = useCallback((open: boolean) => {
    setFullscreenOpen(open);
    // Always reset: closing a maximized popup must not leave the underlying
    // step-result dialog fullscreen, and reopening must start minimized.
    setMaximized(false);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (centerTab === "chat") messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, centerTab]);

  const stageDict = dict.stages[stage.code as keyof Dictionary["stages"]];
  const stepMeta = (id: string) => {
    const steps =
      stageDict && typeof stageDict === "object" && "steps" in stageDict
        ? (stageDict as { steps: Record<string, { label: string; detail: string }> }).steps
        : null;
    return steps?.[id] ?? { label: id, detail: "" };
  };
  const stageName = (code: string) => dict.stages[code as keyof Dictionary["stages"]]?.name ?? code;
  const stageSecureParams: string[] =
    stageDict && "secureParams" in stageDict ? (stageDict.secureParams as string[]) : [];
  const stageDesc = stageDict && "desc" in stageDict ? (stageDict.desc as string) : stage.description;

  // Sub-step checklist: met steps are done, the first unmet one is current and
  // every later unmet step stays locked until it is reached.
  const gapSet = new Set(completionGaps);
  const firstUnmetIndex = stage.steps.findIndex((s) => gapSet.has(s.id));
  const stepRows = stage.steps.map((s, i) => {
    const met = !gapSet.has(s.id);
    if (met) return { ...s, met: true, locked: false, current: false };
    const current = i === firstUnmetIndex;
    return { ...s, met: false, locked: !current, current };
  });
  const currentStep = firstUnmetIndex >= 0 ? stage.steps[firstUnmetIndex] : null;

  const stageLinks = stages.map((s) => {
    const active = s.code === stage.code;
    const completed = s.status === "completed";
    const reachable = stages.filter((x) => x.orderIndex < s.orderIndex).every((x) => x.status === "completed");
    return {
      ...s,
      active,
      completed,
      locked: !completed && !active && !reachable,
      href: `/${lang}/studio/${project.id}/${s.code}`,
    };
  });

  const fileKeys = codeArtifacts ? Object.keys(codeArtifacts) : [];
  const currentFile =
    activeFile && codeArtifacts && Object.hasOwn(codeArtifacts, activeFile) ? activeFile : fileKeys[0] ?? null;

  // ---- navigation helpers -------------------------------------------------

  function markStepsChanged(steps: string[]) {
    if (steps.length === 0) return;
    const next = new Set(pendingSteps);
    steps.forEach((s) => next.add(s));
    pendingStore.set([...next]);
  }

  function openStepResult(id: string) {
    setActiveStepResult(id);
    if (pendingSteps.has(id)) {
      const next = new Set(pendingSteps);
      next.delete(id);
      pendingStore.set([...next]);
    }
  }

  /** Tell the user the AI finished and where to look; flag those sub-steps. */
  function notifyChangedSteps(steps?: string[]) {
    if (!steps || steps.length === 0) return;
    markStepsChanged(steps);
    const labels = steps.map((s) => stepMeta(s).label).join(", ");
    addToast("success", dict.studio.aiFinished.replace("{steps}", labels), 9000, {
      label: dict.studio.aiFinishedView,
      onClick: () => openStepResult(steps[0]),
    });
  }

  /** Opens a file (optionally at a line) in the center editor from anywhere. */
  function openFile(file: string, line?: number | null) {
    setActiveFile(file);
    setActiveFix(null);
    setCenterTab("workspace");
    setMobileTab("chat");
    setPanelOpen(false);
    setActiveStepResult(null);
    setReveal((r) => (line != null && line > 0 ? { file, line, nonce: (r?.nonce ?? 0) + 1 } : null));
  }

  function focusComposer() {
    setCenterTab("chat");
    setMobileTab("chat");
    setPanelOpen(false);
    focusComposerInput();
  }

  function askAiForStep(stepId: string) {
    const meta = stepMeta(stepId);
    setInput(fmt(w.stepPrompt, { step: meta.label, detail: meta.detail }).trim());
    setChatMode("plan");
    focusComposer();
  }

  function fixWithAi(f: ScanFinding) {
    const location = f.filePath ? `${f.filePath}${f.line != null ? `:${f.line}` : ""}` : "-";
    setInput(fmt(w.fixPrompt, { tool: f.tool, severity: f.severity, title: f.title, location }));
    setChatMode("plan");
    focusComposer();
  }

  function startAutoFix(rec: RecommendationRow) {
    setActiveFix(rec);
    if (rec.filePath) setActiveFile(rec.filePath);
    setCenterTab("workspace");
    setMobileTab("chat");
    setPanelOpen(false);
  }

  function showPanelTab(tab: PanelTab) {
    setPanelTab(tab);
    setMobileTab("security");
    setPanelOpen(true);
  }

  // ---- data actions -------------------------------------------------------

  /** Merges a structured stage result into local state (build / direct / reparse). */
  function applyStageResult(result: StageResultPayload | null | undefined) {
    if (!result) return;
    const artifacts = result.codeArtifacts;
    if (artifacts) setCodeArtifacts((prev) => ({ ...(prev ?? {}), ...artifacts }));
    if (result.mermaid?.length) setDiagrams(result.mermaid);
    if (result.architecture?.length) setArchitecture(result.architecture);
    if (result.recommendedStack || result.securityRequirements) {
      setAnalysisInfo((prev) => ({
        recommendedStack: result.recommendedStack ?? prev?.recommendedStack ?? null,
        securityRequirements: result.securityRequirements ?? prev?.securityRequirements ?? [],
        summary: result.summary ?? prev?.summary ?? "",
      }));
    }
  }

  /**
   * Sends a prompt. `mode` MUST be passed explicitly by any programmatic caller
   * (e.g. the Approve & Build button): reading `chatMode` from state inside this
   * function would capture the value from the render that created the callback,
   * so approving a plan would re-run plan mode instead of build mode.
   */
  async function sendPrompt(text?: string, mode?: ChatMode) {
    const activeMode = mode ?? chatMode;
    const prompt = (text ?? input).trim();
    if (!prompt || loading) return;
    setAreaError("chat", null);
    setStructuredWarning(false);
    setTruncatedWarning(false);
    // Build mode needs an approved plan; don't silently fall back to a plain chat turn.
    if (activeMode === "build" && !activePlan) {
      setAreaError("chat", dict.studio.noApprovedPlan);
      return;
    }

    const plan = activeMode === "build" ? activePlan : null;
    setInput("");
    setLoading(true);
    setBuildLoading(!!plan);
    setBuildResult(null);
    setCenterTab("chat");

    const userMsg: MessageRow = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    // On failure the prompt goes back into the composer unless the user already typed a new one.
    const fail = (message: string) => {
      setAreaError("chat", message);
      setMessages((m) => m.filter((x) => x.id !== userMsg.id));
      setInput((cur) => (cur.trim() ? cur : prompt));
    };

    try {
      const endpoint = activeMode === "plan" ? "/api/chat/plan" : plan ? "/api/chat/build" : "/api/chat";
      const res = await csrfFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          projectStageId: stage.projectStageId,
          prompt,
          ...(plan ? { approvedPlan: plan } : {}),
        }),
      });
      const data = (await res.json()) as ChatResponse;
      if (!res.ok) {
        fail(data.message ?? data.error ?? dict.studio.requestFailed);
        return;
      }

      setMessages((m) => [
        ...m,
        { id: crypto.randomUUID(), role: "assistant", content: data.reply ?? "", createdAt: new Date().toISOString() },
      ]);
      if (data.truncated) setTruncatedWarning(true);

      if (activeMode === "plan") {
        if (data.plan) {
          setActivePlan(data.plan);
          addToast("info", fmt(w.planGenerated, { count: data.plan.actions.length }));
        } else {
          setStructuredWarning(true);
        }
        return;
      }

      applyStageResult(data.result);
      if (data.recommendations?.length) setRecommendations(data.recommendations);

      if (plan) {
        const changed = Object.keys(data.result?.codeArtifacts ?? {});
        const before = codeArtifacts ?? {};
        const filesCreated = changed.filter((f) => !Object.hasOwn(before, f));
        const filesModified = changed.filter((f) => Object.hasOwn(before, f));
        setBuildResult({
          actionsExecuted: plan.actions.length,
          filesCreated,
          filesModified,
          recommendationsCount: data.recommendations?.length ?? 0,
          securityScore: data.securityScore ?? null,
        });
        addToast(
          "success",
          fmt(w.buildComplete, { created: filesCreated.length, modified: filesModified.length }),
        );
        setActivePlan(null);
        setChatMode("plan");
      } else {
        setStructuredWarning(!data.result);
      }
      notifyChangedSteps(data.changedSteps);
      router.refresh();
    } catch {
      fail(dict.studio.networkError);
    } finally {
      setLoading(false);
      setBuildLoading(false);
    }
  }

  function approvePlan() {
    if (!activePlan || loading) return;
    setChatMode("build");
    void sendPrompt(`Execute the approved plan: ${activePlan.summary}`, "build");
  }

  async function reparse() {
    setReparsing(true);
    setAreaError("chat", null);
    try {
      const res = await csrfFetch("/api/chat/reparse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectStageId: stage.projectStageId }),
      });
      const data = (await res.json()) as ChatResponse & { ok?: boolean };
      if (!res.ok || !data.ok) {
        setAreaError("chat", data.error ?? dict.studio.requestFailed);
        return;
      }
      applyStageResult(data.result);
      if (data.plan) setActivePlan(data.plan);
      if (data.recommendations?.length) setRecommendations(data.recommendations);
      setStructuredWarning(false);
      router.refresh();
    } catch {
      setAreaError("chat", dict.studio.networkError);
    } finally {
      setReparsing(false);
    }
  }

  async function completeStage() {
    setCompleting(true);
    setAreaError("stage", null);
    try {
      const res = await csrfFetch("/api/stages/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectStageId: stage.projectStageId }),
      });
      const data = (await res.json()) as { error?: string; gaps?: string[] };
      if (!res.ok) {
        setAreaError(
          "stage",
          data.gaps?.length
            ? fmt(w.completeFailedGaps, { gaps: data.gaps.map((g) => stepMeta(g).label).join(", ") })
            : data.error ?? dict.studio.requestFailed,
        );
        return;
      }
      addToast("success", fmt(w.stageCompletedToast, { stage: stageName(stage.code) }));
      if (props.nextStageCode && !isHandover) router.push(`/${lang}/studio/${project.id}/${props.nextStageCode}`);
      else router.refresh();
    } catch {
      setAreaError("stage", dict.studio.networkError);
    } finally {
      setCompleting(false);
    }
  }

  function downloadArtifacts() {
    const link = document.createElement("a");
    link.href = `/api/export/artifacts?projectId=${project.id}`;
    link.click();
  }

  async function toggleApplied(rec: RecommendationRow) {
    const next = !rec.isApplied;
    setAreaError("findings", null);
    try {
      const res = await csrfFetch(`/api/recommendations/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApplied: next }),
      });
      if (!res.ok) {
        setAreaError("findings", dict.studio.requestFailed);
        return;
      }
      setRecommendations((rs) => rs.map((r) => (r.id === rec.id ? { ...r, isApplied: next } : r)));
    } catch {
      setAreaError("findings", dict.studio.networkError);
    }
  }

  async function applyFix(rec: RecommendationRow) {
    if (!rec.suggestedCode || !rec.filePath) return;
    const file = rec.filePath;
    const content = rec.suggestedCode;
    setAreaError("files", null);
    try {
      const res = await csrfFetch("/api/artifacts/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectStageId: stage.projectStageId, file, content }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setAreaError("files", data.error ?? dict.studio.requestFailed);
        return;
      }
      setCodeArtifacts((prev) => ({ ...(prev ?? {}), [file]: content }));
      setActiveFile(file);
      setActiveFix(null);
      if (!rec.isApplied) await toggleApplied({ ...rec, isApplied: false });
      router.refresh();
    } catch {
      setAreaError("files", dict.studio.networkError);
    }
  }

  const dirtyFiles = useMemo(
    () => new Set(Object.keys(drafts).filter((f) => drafts[f] !== codeArtifacts?.[f])),
    [drafts, codeArtifacts],
  );

  function handleFileChange(file: string, value: string) {
    setDrafts((prev) => ({ ...prev, [file]: value }));
  }

  async function saveFiles(files: string[]) {
    if (files.length === 0) return;
    const payload: Record<string, string> = {};
    for (const file of files) payload[file] = drafts[file] ?? codeArtifacts?.[file] ?? "";
    setSavingFiles(true);
    setAreaError("files", null);
    try {
      const res = await csrfFetch(`/api/projects/${project.id}/artifacts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectStageId: stage.projectStageId, files: payload }),
      });
      const data = (await res.json()) as { error?: string; problems?: string[] };
      if (!res.ok) {
        setAreaError("files", data.problems?.join("; ") ?? data.error ?? dict.studio.requestFailed);
        return;
      }
      setCodeArtifacts((prev) => ({ ...(prev ?? {}), ...payload }));
      setDrafts((prev) => {
        const next = { ...prev };
        for (const file of files) delete next[file];
        return next;
      });
      addToast("success", dict.studio.filesSaved);
      router.refresh();
    } catch {
      setAreaError("files", dict.studio.networkError);
    } finally {
      setSavingFiles(false);
    }
  }

  async function restoreSnapshot(snapshotId: string) {
    setRestoringId(snapshotId);
    setAreaError("stage", null);
    try {
      const res = await csrfFetch(`/api/projects/${project.id}/snapshots/${snapshotId}/restore`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setAreaError("stage", data.error ?? dict.studio.requestFailed);
        return;
      }
      setDrafts({});
      addToast("success", dict.studio.snapshotRestored);
      router.refresh();
    } catch {
      setAreaError("stage", dict.studio.networkError);
    } finally {
      setRestoringId(null);
    }
  }

  async function toggleFinalize() {
    setDbBusy(true);
    setAreaError("stage", null);
    try {
      const res = await csrfFetch(`/api/projects/${project.id}/finalize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalized: !finalizedAt }),
      });
      const data = (await res.json()) as { error?: string; finalizedAt?: string | null };
      if (!res.ok) {
        setAreaError("stage", data.error ?? dict.studio.requestFailed);
        return;
      }
      setFinalizedAt(data.finalizedAt ?? null);
      addToast("success", data.finalizedAt ? dict.studio.markedFixed : dict.studio.unmarkedFixed);
      router.refresh();
    } catch {
      setAreaError("stage", dict.studio.networkError);
    } finally {
      setDbBusy(false);
    }
  }

  async function createDatabase() {
    setDbBusy(true);
    setAreaError("stage", null);
    try {
      const res = await csrfFetch(`/api/projects/${project.id}/database`, { method: "POST" });
      const data = (await res.json()) as { error?: string; database?: DatabaseInfo };
      if (!res.ok) {
        setAreaError("stage", data.error ?? dict.studio.requestFailed);
        return;
      }
      const db = data.database;
      setDatabase(db ? { service: db.service, hostPort: db.hostPort, status: db.status } : null);
      addToast("success", dict.studio.databaseCreated);
      router.refresh();
    } catch {
      setAreaError("stage", dict.studio.networkError);
    } finally {
      setDbBusy(false);
    }
  }

  async function deleteDatabase() {
    setDbBusy(true);
    setAreaError("stage", null);
    try {
      const res = await csrfFetch(`/api/projects/${project.id}/database`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setAreaError("stage", data.error ?? dict.studio.requestFailed);
        return;
      }
      setDatabase(null);
      addToast("success", dict.studio.databaseDeleted);
      router.refresh();
    } catch {
      setAreaError("stage", dict.studio.networkError);
    } finally {
      setDbBusy(false);
    }
  }

  async function changeOutputLanguage(next: string) {
    setOutputLanguage(next);
    setSavingLanguage(true);
    setAreaError("stage", null);
    try {
      const res = await csrfFetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputLanguage: next }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setAreaError("stage", data.error ?? dict.studio.requestFailed);
        setOutputLanguage(props.project.outputLanguage);
        return;
      }
      router.refresh();
    } catch {
      setAreaError("stage", dict.studio.networkError);
      setOutputLanguage(props.project.outputLanguage);
    } finally {
      setSavingLanguage(false);
    }
  }

  // ---- keyboard shortcuts & command palette ------------------------------

  // Re-registered every render so the handler always sees the latest state.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (mod && e.shiftKey && e.key === "Enter") {
        if (activePlan && !loading) {
          e.preventDefault();
          approvePlan();
        }
        return;
      }
      // `code` (not `key`) so Alt+digit works on macOS, where Option changes the character.
      if (e.altKey && !mod && /^Digit[1-9]$/.test(e.code)) {
        const target = stageLinks[Number(e.code.slice(5)) - 1];
        if (target && !target.locked && !target.active) {
          e.preventDefault();
          router.push(target.href);
        }
        return;
      }
      if (e.key === "Escape" && panelOpen) setPanelOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const panelTabs = panelTabsFor(stage.code);
  const canComplete = completionGaps.length === 0 && !stageAlreadyCompleted;
  const completeLabel = isHandover ? dict.studio.finishProject : dict.studio.completeStage;
  const commands: PaletteCommand[] = [
    ...stageLinks
      .filter((s) => !s.locked && !s.active)
      .map((s) => ({
        id: `stage-${s.code}`,
        group: w.groupNavigation,
        label: fmt(w.cmdGoStage, { stage: stageName(s.code) }),
        hint: `Alt+${s.orderIndex + 1}`,
        run: () => router.push(s.href),
      })),
    ...stage.steps.map((s) => ({
      id: `step-${s.id}`,
      group: w.groupSteps,
      label: fmt(w.viewStepResult, { step: stepMeta(s.id).label }),
      run: () => openStepResult(s.id),
    })),
    { id: "focus-chat", group: w.groupActions, label: w.cmdFocusChat, run: focusComposer },
    {
      id: "show-workspace",
      group: w.groupActions,
      label: w.cmdShowWorkspace,
      run: () => {
        setCenterTab("workspace");
        setMobileTab("chat");
      },
    },
    {
      id: "show-chat",
      group: w.groupActions,
      label: w.cmdShowChat,
      run: () => {
        setCenterTab("chat");
        setMobileTab("chat");
      },
    },
    ...panelTabs.map((t) => ({
      id: `panel-${t}`,
      group: w.groupActions,
      label: fmt(w.cmdPanel, { tab: panelTabLabel(t, dict) }),
      run: () => showPanelTab(t),
    })),
    ...(canComplete
      ? [{ id: "complete", group: w.groupActions, label: completeLabel, run: () => setConfirmComplete(true) }]
      : []),
    ...(activePlan
      ? [{ id: "approve", group: w.groupActions, label: w.approveBuild, hint: w.approveShortcut, run: approvePlan }]
      : []),
  ];

  const planLabels: PlanCardLabels = {
    planTitle: w.planTitle,
    planMeta: w.planMeta,
    approveBuild: w.approveBuild,
    approveShortcut: w.approveShortcut,
    building: w.building,
    discardPlan: w.discardPlan,
    buildDone: w.buildDone,
    actionsExecuted: w.actionsExecuted,
    filesCreated: w.filesCreated,
    filesModified: w.filesModified,
    newRecommendations: w.newRecommendations,
    viewChanges: w.viewChanges,
    scoreLabel: dict.studio.score,
  };

  const stepResult = activeStepResult
    ? getStepResultContent(activeStepResult, {
        dict,
        stageCode: stage.code,
        label: stepMeta(activeStepResult).label || activeStepResult,
        analysisInfo,
        dataClassification: props.analysisDataClassification,
        recommendations,
        designScreens,
        uiDesign,
        architecture,
        threatModel,
        diagrams,
        databaseSchema: props.designDatabaseSchema,
        erdDiagram: props.designErdDiagram,
        authFlowDiagram: props.designAuthFlowDiagram,
        codeArtifacts,
        testingFindings: props.testingFindings,
        testingFixedArtifacts: props.testingFixedArtifacts,
        score: scoreInfo.score,
        handoverManualBook: props.handoverManualBook,
        handoverComplianceReport: props.handoverComplianceReport,
        handoverReleaseChecklist: props.handoverReleaseChecklist,
        onOpenFile: (p) => openFile(p),
      })
    : null;

  const mobileTabs: readonly MobileTab[] = ["navigate", "chat", "security"];
  const mobilePanelId: Record<MobileTab, string> = {
    navigate: "studio-steps",
    chat: "studio-center",
    security: "studio-security-panel",
  };
  const nextStage = props.nextStageCode
    ? { name: stageName(props.nextStageCode), href: `/${lang}/studio/${project.id}/${props.nextStageCode}` }
    : null;
  const showMoreMenu = (stage.code === "development" && designScreens.length > 0) || (isCodeStage && hasCode);

  return (
    <div className="flex h-auto min-h-0 flex-col md:h-[calc(100dvh-3.5rem)]">
      {/* Top bar + stepper + next action */}
      <div className="sticky top-0 z-30 border-b bg-background">
        <div className="flex flex-col gap-2 px-4 py-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Link href={`/${lang}/dashboard`} className="shrink-0 text-muted-foreground hover:text-foreground">
              {dict.studio.back}
            </Link>
            <ArrowRight className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate font-medium">{project.name}</span>
            <Badge variant="secondary">{project.version}</Badge>
            <ArrowRight className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="truncate text-muted-foreground" title={stageDesc}>
              {stageName(stage.code)}
            </span>
            {project.outputLanguage !== "en" && <Badge variant="outline">{project.outputLanguage.toUpperCase()}</Badge>}
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <nav aria-label={w.stepperLabel} className="min-w-0 overflow-x-auto scrollbar-none">
              <ol className="flex items-center gap-1">
                {stageLinks.map((s) => {
                  const linkClass = cn(
                    "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                    s.active
                      ? "bg-primary text-primary-foreground"
                      : s.completed
                        ? "text-success hover:bg-accent"
                        : s.locked
                          ? "cursor-not-allowed text-muted-foreground/50"
                          : "text-muted-foreground hover:bg-accent",
                  );
                  return (
                    <li key={s.code}>
                      {s.locked ? (
                        <span className={linkClass} title={dict.studio.lockHint} aria-disabled="true">
                          <Lock className="size-3.5" aria-hidden="true" />
                          <span className="sr-only">{dict.studio.lockHint}: </span>
                          {s.orderIndex + 1}. {stageName(s.code)}
                        </span>
                      ) : (
                        <Link
                          href={s.href}
                          className={linkClass}
                          aria-current={s.active ? "step" : undefined}
                          aria-keyshortcuts={`Alt+${s.orderIndex + 1}`}
                        >
                          {s.completed && !s.active && <CheckCircle2 className="size-3.5" aria-hidden="true" />}
                          {s.orderIndex + 1}. {stageName(s.code)}
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>
            <Button
              size="sm"
              variant="ghost"
              className="shrink-0 px-2"
              onClick={() => setPaletteOpen(true)}
              title={`${w.paletteTitle} (${w.paletteHint})`}
              aria-keyshortcuts="Control+K Meta+K"
            >
              <Command className="size-4" aria-hidden="true" />
              <span className="sr-only">{w.paletteTitle}</span>
              <kbd className="hidden font-sans text-[11px] text-muted-foreground xl:inline">{w.paletteHint}</kbd>
            </Button>
            <Button
              size="sm"
              variant={panelOpen ? "secondary" : "outline"}
              className="hidden shrink-0 md:inline-flex lg:hidden"
              onClick={() => setPanelOpen((o) => !o)}
              aria-controls="studio-security-panel"
              aria-expanded={panelOpen}
            >
              <PanelRightOpen className="size-4" aria-hidden="true" />
              {w.openSecurityPanel}
            </Button>
          </div>
        </div>

        <NextActionBar
          dict={dict}
          stageCompleted={stageAlreadyCompleted}
          isHandover={isHandover}
          gaps={completionGaps.map((g) => ({ id: g, label: stepMeta(g).label }))}
          currentStep={currentStep ? { id: currentStep.id, label: stepMeta(currentStep.id).label } : null}
          nextStage={nextStage}
          completing={completing}
          onComplete={() => setConfirmComplete(true)}
          onAskAi={askAiForStep}
          onViewResult={openStepResult}
        />
        {errors.stage && (
          <InlineAlert
            className="mx-4 mb-2"
            message={errors.stage}
            onDismiss={() => setAreaError("stage", null)}
            dismissLabel={w.dismiss}
          />
        )}

        {/* Mobile tab bar */}
        <div
          role="tablist"
          aria-label={w.studioPanels}
          className="flex border-t md:hidden"
          onKeyDown={(e) => tabKeyNav(e, mobileTabs, mobileTab, setMobileTab)}
        >
          {mobileTabs.map((tab) => {
            const Icon = tab === "navigate" ? ListChecks : tab === "chat" ? Bot : ShieldCheck;
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={mobileTab === tab}
                aria-controls={mobilePanelId[tab]}
                tabIndex={mobileTab === tab ? 0 : -1}
                onClick={() => setMobileTab(tab)}
                className={cn(
                  "flex min-h-11 flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors",
                  mobileTab === tab
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
                {tab === "navigate"
                  ? dict.studio.subSteps
                  : tab === "chat"
                    ? dict.studio.chatTitle
                    : dict.studio.securityPanel}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3-column body */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-12">
        {/* Left: sub-steps & deliverables */}
        <aside
          id="studio-steps"
          className={cn(
            "flex min-h-0 min-w-0 flex-col border-b md:col-span-4 md:border-b-0 md:border-e lg:col-span-3",
            mobileTab !== "navigate" && "max-md:hidden",
          )}
        >
          <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="flex items-center gap-2">
              <ListChecks className="size-4" aria-hidden="true" /> {dict.studio.subSteps}
            </span>
            <Badge variant="secondary" className="text-[11px] tabular-nums">
              {stepRows.filter((s) => s.met).length}/{stepRows.length}
            </Badge>
          </div>
          <p className="border-b px-4 py-1 text-[11px] text-muted-foreground">{dict.studio.subStepsHint}</p>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <ol className="space-y-1.5">
              {stepRows.map((s) => {
                const meta = stepMeta(s.id);
                const changed = pendingSteps.has(s.id);
                return (
                  <li
                    key={s.id}
                    className={cn("flex items-start gap-2 rounded-md p-1", s.current && "bg-warning/5")}
                    aria-current={s.current ? "step" : undefined}
                  >
                    {s.met ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    ) : s.locked ? (
                      <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" aria-hidden="true" />
                    ) : (
                      <X className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "text-xs font-medium",
                          s.locked ? "text-muted-foreground/60" : "text-foreground",
                        )}
                      >
                        {meta.label}
                        {s.current && (
                          <span className="ms-1 text-[11px] font-semibold text-warning">
                            ({dict.studio.advanceCriteria})
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => openStepResult(s.id)}
                          className="relative ms-1 inline-flex rounded p-0.5 align-middle text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          title={
                            changed
                              ? `${dict.studio.stepChanged}: ${meta.label}`
                              : fmt(w.viewStepResult, { step: meta.label })
                          }
                          aria-label={
                            changed
                              ? `${dict.studio.stepChanged}: ${meta.label}`
                              : fmt(w.viewStepResult, { step: meta.label })
                          }
                        >
                          <Eye className="size-3" aria-hidden="true" />
                          {changed && (
                            <span
                              className="absolute -end-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-background"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      </p>
                      {meta.detail && (
                        <p className="hidden text-[11px] text-muted-foreground md:block">{meta.detail}</p>
                      )}
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {s.nistTasks.map((t) => (
                          <Badge key={t} variant="secondary" className="font-mono text-[11px]">
                            {t}
                          </Badge>
                        ))}
                        {s.isoControls.map((iso) => (
                          <Badge key={iso} variant="outline" className="font-mono text-[11px]">
                            {iso}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            {isHandover && (
              <div className="mt-4 border-t pt-4">
                <DeliverablesPanel
                  projectId={project.id}
                  version={project.version}
                  codeArtifacts={codeArtifacts}
                  latestRevision={latestRevision}
                  badgePublic={project.badgePublic}
                  projectStatus={project.status}
                  completedStages={stages.filter((s) => s.status === "completed").length}
                  totalStages={stages.length}
                  dict={dict}
                  lang={lang}
                />
              </div>
            )}
          </div>
        </aside>

        {/* Center: results & editor / chat, composer always visible */}
        <section
          id="studio-center"
          className={cn(
            "relative flex min-h-0 min-w-0 flex-col md:col-span-8 lg:col-span-6",
            mobileTab !== "chat" && "max-md:hidden",
          )}
        >
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-1.5">
            <div
              role="tablist"
              aria-label={w.centerTabs}
              className="flex rounded-lg border bg-muted p-0.5"
              onKeyDown={(e) => tabKeyNav(e, CENTER_TABS, centerTab, setCenterTab)}
            >
              {CENTER_TABS.map((t) => {
                const selected = centerTab === t;
                const Icon = t === "workspace" ? FileCode2 : Bot;
                return (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    id={`center-tab-${t}`}
                    aria-selected={selected}
                    aria-controls={`center-panel-${t}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setCenterTab(t)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      selected ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" aria-hidden="true" />
                    {t === "workspace" ? w.tabWorkspace : w.tabChat}
                    {t === "chat" && messages.length > 0 && (
                      <span className="text-[11px] tabular-nums opacity-70">{messages.length}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="ms-auto flex flex-wrap items-center gap-2">
              {stage.code === "development" && hasCode && (
                <Button size="sm" onClick={() => setShowRun(true)}>
                  <Play className="size-3.5" /> {dict.studio.runApp}
                </Button>
              )}
              {stage.code === "development" && (
                <>
                  <Button
                    size="sm"
                    variant={finalizedAt ? "secondary" : "outline"}
                    onClick={toggleFinalize}
                    disabled={dbBusy}
                    title={finalizedAt ? dict.studio.unmarkFixed : dict.studio.markFixed}
                    aria-pressed={!!finalizedAt}
                  >
                    <CheckCircle2 className="size-3.5" />
                    {finalizedAt ? dict.studio.fixed : dict.studio.markFixed}
                  </Button>
                  {finalizedAt && !database && (
                    <Button size="sm" onClick={createDatabase} disabled={dbBusy}>
                      {dbBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Database className="size-3.5" />}
                      {dict.studio.createDatabase}
                    </Button>
                  )}
                  {database && (
                    <span className="flex items-center gap-1">
                      <Badge variant="success" className="tabular-nums">
                        <Database className="size-3" aria-hidden="true" /> {database.service} :{database.hostPort}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        onClick={() => setConfirmDeleteDb(true)}
                        disabled={dbBusy}
                        title={dict.studio.deleteDatabase}
                        aria-label={dict.studio.deleteDatabase}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </span>
                  )}
                </>
              )}
              {isDesign && (
                <Button size="sm" variant="outline" onClick={() => setShowDesignCanvas(true)}>
                  <Layout className="size-3.5" /> {dict.studio.designStudioOpen}
                  {designScreens.length > 0 && (
                    <Badge variant="secondary" className="ms-1 tabular-nums">
                      {designScreens.length}
                    </Badge>
                  )}
                </Button>
              )}
              {showMoreMenu && (
                <div className="relative" ref={moreBtnRef}>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="size-8"
                    aria-label={w.moreActions}
                    aria-haspopup="menu"
                    aria-expanded={moreOpen}
                    title={w.moreActions}
                    onClick={toggleMoreMenu}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                  {moreOpen &&
                    morePos &&
                    createPortal(
                      <div
                        ref={moreMenuRef}
                        role="menu"
                        style={{ top: morePos.top, right: morePos.right }}
                        className="fixed z-[90] w-64 rounded-md border bg-card p-1 text-xs shadow-lg"
                      >
                        {stage.code === "development" && designScreens.length > 0 && (
                          <button
                            type="button"
                            role="menuitem"
                            disabled={loading}
                            onClick={() => {
                              setMoreOpen(false);
                              void sendPrompt(
                                "Implement the approved Design Studio designs as real pages/routes in the generated source code. Create one page/component per approved screen and match its layout, sections, colors, typography, and visible copy exactly. Return the full structured stage_result JSON with codeArtifacts.",
                                "direct",
                              );
                            }}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-start hover:bg-muted disabled:opacity-50"
                          >
                            <Layout className="size-3.5 shrink-0" />
                            <span className="flex-1">{dict.studio.implementDesigns}</span>
                            <Badge variant="secondary" className="tabular-nums">
                              {designScreens.length}
                            </Badge>
                          </button>
                        )}
                        {isCodeStage && hasCode && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setMoreOpen(false);
                              downloadArtifacts();
                            }}
                            className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-start hover:bg-muted"
                          >
                            <Download className="size-3.5 shrink-0" />
                            <span className="flex-1">{dict.studio.downloadArtifacts}</span>
                          </button>
                        )}
                      </div>,
                      document.body,
                    )}
                </div>
              )}
              {project.status === "in_revision" && (
                <Badge variant="warning">
                  <GitPullRequestArrow className="size-3" /> {dict.studio.revisionBadge}
                </Badge>
              )}
            </div>
          </div>

          {/* Results & editor panel (kept mounted so the editor keeps its state) */}
          <div
            role="tabpanel"
            id="center-panel-workspace"
            aria-labelledby="center-tab-workspace"
            className={cn(
              "min-h-0 min-w-0 flex-1",
              (isCodeStage || isHandover) && hasCode ? "flex flex-col max-md:h-[70dvh] max-md:flex-none" : "overflow-y-auto",
              centerTab !== "workspace" && "hidden",
            )}
          >
            {isAnalysis && (
              <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Languages className="size-4 text-primary" aria-hidden="true" /> {dict.studio.outputLanguage}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      name="outputLanguage"
                      value={outputLanguage}
                      onValueChange={changeOutputLanguage}
                      disabled={savingLanguage}
                    >
                      <SelectTrigger
                        id="studioOutputLanguage"
                        aria-label={dict.studio.outputLanguage}
                        className="h-8 w-full max-w-[160px] text-xs"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(dict.dashboard.languages).map(([code, label]) => (
                          <SelectItem key={code} value={code}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {savingLanguage && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 text-sm font-semibold">{dict.studio.stackTitle}</h3>
                  {analysisInfo?.recommendedStack ? (
                    <dl className="space-y-1 font-mono text-xs">
                      {Object.entries(analysisInfo.recommendedStack).map(([k, v]) => (
                        <div key={k}>
                          <dt className="inline text-muted-foreground">{k}:</dt>{" "}
                          <dd className="inline">{Array.isArray(v) ? v.join(", ") : String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground">{dict.studio.askAnalyze}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="self-start"
                        onClick={() =>
                          sendPrompt(
                            "Run the stage analysis for this project and output the full structured JSON result (recommendedStack, securityRequirements, recommendations).",
                          )
                        }
                        disabled={loading}
                      >
                        <Wand2 className="size-3" /> {dict.studio.startStage}
                      </Button>
                    </div>
                  )}
                </div>
                {analysisInfo?.securityRequirements && analysisInfo.securityRequirements.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-semibold">{dict.studio.securityRequirementsTitle}</h3>
                    <NumberedList items={analysisInfo.securityRequirements} tone="success" />
                  </div>
                )}
                {props.analysisDataClassification.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-semibold">{w.dataTitle}</h3>
                    <DataClassificationTable items={props.analysisDataClassification} dict={dict} />
                  </div>
                )}
              </div>
            )}

            {isDesign && (
              <div className="space-y-4 p-4">
                {designScreens.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">{dict.studio.designStudioTitle}</h3>
                      <Button size="sm" variant="outline" onClick={() => setShowDesignCanvas(true)}>
                        <Layout className="size-3.5" /> {dict.studio.designStudioOpen}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {designScreens.map((s) => (
                        <div key={s.id} className="overflow-hidden rounded-lg border bg-card">
                          <div className="flex items-center justify-between gap-2 border-b px-2 py-1 text-[11px]">
                            <span className="truncate font-medium">{s.name}</span>
                            <button
                              type="button"
                              aria-label={`${dict.studio.designStudioOpen}: ${s.name}`}
                              title={dict.studio.designStudioOpen}
                              onClick={() => {
                                setDesignFsMax(false);
                                setDesignFullscreen(s);
                              }}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Maximize2 className="size-3.5" />
                            </button>
                          </div>
                          <DesignScreen html={s.html} title={s.name} device={s.device} viewportHeight={180} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {uiDesign.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-semibold">{dict.studio.uiDesignTitle}</h3>
                    <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                      {uiDesign.map((u, i) => (
                        <li key={i}>{u}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {architecture.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-semibold">{dict.studio.architectureTitle}</h3>
                    <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                      {architecture.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {threatModel.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-semibold">{dict.studio.threatModelTitle}</h3>
                    <ThreatModelView threats={threatModel} dict={dict} />
                  </div>
                )}
                {diagrams.map((d, i) => (
                  <div key={i} className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-semibold">
                      {dict.studio.diagram} {i + 1}
                    </h3>
                    <MermaidDiagram code={d} id={`${stage.code}-${i}`} />
                  </div>
                ))}
                {diagrams.length === 0 && threatModel.length === 0 && (
                  <EmptyState
                    icon={Wand2}
                    description={dict.studio.askThreatModel}
                    className="py-8"
                    action={
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          sendPrompt(
                            "Produce the STRIDE threat model and architecture design with Mermaid diagrams, and output the full structured JSON result (architecture, threatModel, mermaid, recommendations).",
                          )
                        }
                        disabled={loading}
                      >
                        <Wand2 className="size-3" /> {dict.studio.startStage}
                      </Button>
                    }
                  />
                )}
              </div>
            )}

            {(isCodeStage || isHandover) &&
              (codeArtifacts && hasCode ? (
                <>
                  {errors.files && (
                    <InlineAlert
                      className="m-2"
                      message={errors.files}
                      onDismiss={() => setAreaError("files", null)}
                      dismissLabel={w.dismiss}
                    />
                  )}
                  {snapshots.length > 0 && (
                    <details className="shrink-0 border-b px-4 py-2">
                      <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground">
                        {dict.studio.snapshots} ({snapshots.length})
                      </summary>
                      <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pe-2">
                        {snapshots.map((s) => (
                          <li
                            key={s.id}
                            className="flex items-center justify-between gap-3 border-b py-1 text-[11px] last:border-0"
                          >
                            <span className="font-mono text-muted-foreground">{s.version}</span>
                            <span className="line-clamp-1 flex-1 text-muted-foreground">{s.diffSummary}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {s.fileCount} {dict.studio.files}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 shrink-0 px-2 text-[11px]"
                              onClick={() => setConfirmRestore(s)}
                              disabled={restoringId === s.id}
                            >
                              {restoringId === s.id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                <RotateCcw className="size-3" />
                              )}
                              {dict.studio.restore}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <div className="min-h-0 flex-1">
                    <CodeWorkspace
                      files={codeArtifacts}
                      activeFile={currentFile}
                      onSelectFile={(f) => {
                        setActiveFile(f);
                        setActiveFix(null);
                      }}
                      dirty={dirtyFiles}
                      onChange={handleFileChange}
                      onSave={(f) => saveFiles([f])}
                      onSaveAll={() => saveFiles([...dirtyFiles])}
                      saving={savingFiles}
                      variant="studio"
                      emptyLabel={dict.studio.emptyFiller}
                      loadingLabel={dict.studio.loadingEditor}
                      revealLine={reveal && reveal.file === currentFile ? reveal.line : null}
                      revealKey={reveal?.nonce}
                      editorOverride={
                        activeFix?.suggestedCode && activeFix.filePath ? (
                          <div className="flex h-full flex-col">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-success/5 px-4 py-2">
                              <span className="text-xs font-semibold text-success">
                                {dict.studio.suggestedFixTitle}
                                {activeFix.nistControl?.taskCode ?? "NIST"} · {activeFix.filePath}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <Button size="sm" variant="outline" onClick={() => setActiveFix(null)}>
                                  <X className="size-3" /> {dict.studio.rejectFix}
                                </Button>
                                <Button size="sm" onClick={() => applyFix(activeFix)}>
                                  <CheckCheck className="size-3" /> {dict.studio.applyFix}
                                </Button>
                              </div>
                            </div>
                            <div className="min-h-0 flex-1">
                              <MonacoDiff
                                original={codeArtifacts[activeFix.filePath] ?? ""}
                                modified={activeFix.suggestedCode}
                                language={inferLanguage(activeFix.filePath)}
                              />
                            </div>
                          </div>
                        ) : undefined
                      }
                      labels={{
                        unsaved: dict.studio.unsavedFiles,
                        save: dict.studio.save,
                        saveAll: dict.studio.saveAll,
                        terminal: dict.studio.terminal,
                        explorer: dict.studio.explorer,
                        preview: dict.studio.preview,
                        saved: dict.studio.allSaved,
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="p-4">
                  <EmptyState
                    icon={FileCode2}
                    description={isHandover ? dict.studio.handoverEmpty : dict.studio.codeEmpty}
                    action={
                      <Button size="sm" variant="outline" onClick={focusComposer}>
                        <Wand2 className="size-3" /> {dict.studio.startStage}
                      </Button>
                    }
                  />
                </div>
              ))}
          </div>

          {/* Chat panel */}
          <div
            role="tabpanel"
            id="center-panel-chat"
            aria-labelledby="center-tab-chat"
            className={cn("min-h-0 min-w-0 flex-1 overflow-y-auto", centerTab !== "chat" && "hidden")}
          >
            <div className="min-w-0 space-y-3 p-4">
              {messages.length === 0 && (
                <EmptyState
                  icon={Wand2}
                  description={
                    isAnalysis
                      ? dict.studio.analysisEmpty
                      : isDesign
                        ? dict.studio.designEmpty
                        : isCodeStage
                          ? dict.studio.codeEmpty
                          : dict.studio.handoverEmpty
                  }
                  className="py-8"
                />
              )}
              {messages.map((m) => (
                <div key={m.id} className={cn("flex min-w-0 gap-2", m.role === "user" && "justify-end")}>
                  {m.role === "assistant" && (
                    <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <Bot className="size-3.5" aria-hidden="true" />
                    </span>
                  )}
                  {m.role === "assistant" ? (
                    <div className="min-w-0 rounded-lg border bg-card px-3 py-2 text-sm [overflow-wrap:anywhere]">
                      <Markdown source={displayAssistantText(m.content)} />
                    </div>
                  ) : (
                    <div className="min-w-0 whitespace-pre-wrap break-words rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground [overflow-wrap:anywhere]">
                      {m.content}
                    </div>
                  )}
                  {m.role === "user" && (
                    <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted">
                      <User className="size-3.5" aria-hidden="true" />
                    </span>
                  )}
                </div>
              ))}

              {activePlan && (
                <PlanCard
                  plan={activePlan}
                  labels={planLabels}
                  onApprove={approvePlan}
                  onCancel={() => {
                    setActivePlan(null);
                    setChatMode("plan");
                  }}
                  loading={buildLoading}
                />
              )}
              {buildResult && (
                <BuildResultCard result={buildResult} labels={planLabels} onOpenFile={(f) => openFile(f)} />
              )}
              {loading && (
                <div role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  <Bot className="size-4" aria-hidden="true" /> {dict.studio.thinking}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="shrink-0 space-y-2 px-4 empty:hidden [&>*:last-child]:mb-2">
            {errors.chat && (
              <InlineAlert
                message={errors.chat}
                onDismiss={() => setAreaError("chat", null)}
                dismissLabel={w.dismiss}
              />
            )}
            {structuredWarning && (
              <InlineAlert
                tone="warning"
                message={dict.studio.structuredFailed}
                onDismiss={() => setStructuredWarning(false)}
                dismissLabel={w.dismiss}
              >
                <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={reparse} disabled={reparsing}>
                  {reparsing ? <Loader2 className="animate-spin" /> : <RotateCcw className="size-3" />}
                  {dict.studio.reparse}
                </Button>
              </InlineAlert>
            )}
            {truncatedWarning && (
              <InlineAlert
                tone="warning"
                message={dict.studio.truncatedWarning}
                onDismiss={() => setTruncatedWarning(false)}
                dismissLabel={w.dismiss}
              />
            )}
          </div>

          <StudioComposer
            dict={dict}
            value={input}
            onChange={setInput}
            onSend={() => void sendPrompt()}
            loading={loading}
            mode={chatMode === "build" ? "build" : "plan"}
            onModeChange={setChatMode}
            planActions={activePlan ? activePlan.actions.length : null}
          />
        </section>

        {/* Right: security & compliance (column on lg, drawer on md, tab on mobile) */}
        {panelOpen && (
          <div
            className="fixed inset-0 z-40 hidden bg-black/40 md:block lg:hidden"
            onClick={() => setPanelOpen(false)}
            aria-hidden="true"
          />
        )}
        <aside
          id="studio-security-panel"
          aria-label={dict.studio.securityPanel}
          className={cn(
            "flex min-h-0 min-w-0 flex-col bg-background lg:col-span-3 lg:border-s",
            mobileTab !== "security" && "max-md:hidden",
            "md:max-lg:fixed md:max-lg:inset-y-0 md:max-lg:end-0 md:max-lg:z-50 md:max-lg:w-[min(380px,90vw)] md:max-lg:border-s md:max-lg:shadow-xl",
            !panelOpen && "md:max-lg:hidden",
          )}
        >
          <StudioRightPanel
            dict={dict}
            lang={lang}
            projectId={project.id}
            stage={stage}
            secureParams={stageSecureParams}
            scoreInfo={scoreInfo}
            recommendations={recommendations}
            hasCode={hasCode}
            isCodeStage={isCodeStage}
            tab={panelTab}
            onTabChange={setPanelTab}
            error={errors.findings ?? null}
            onDismissError={() => setAreaError("findings", null)}
            onToggleApplied={toggleApplied}
            onAutoFix={startAutoFix}
            onOpenFile={openFile}
            onFixWithAi={fixWithAi}
            onScanComplete={() => router.refresh()}
            onClose={() => setPanelOpen(false)}
          />
        </aside>
      </div>

      <Dialog
        open={activeStepResult !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveStepResult(null);
            setMaximized(false);
          }
        }}
      >
        <DialogContent
          hideClose={fullscreenOpen}
          className={
            maximized
              ? "inset-0 left-0 top-0 h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 p-0 sm:rounded-none"
              : "max-h-[90vh] overflow-y-auto sm:max-w-5xl"
          }
          onEscapeKeyDown={(e) => {
            if (fullscreenOpen) e.preventDefault();
          }}
        >
          {!fullscreenOpen && (
            <DialogHeader>
              <DialogTitle>{stepResult?.title ?? ""}</DialogTitle>
              <DialogDescription>
                {stageName(stage.code)} — {dict.studio.subSteps}
              </DialogDescription>
            </DialogHeader>
          )}
          <div className={fullscreenOpen ? "h-full min-h-0" : "mt-2"}>
            {stepResult && (
              <StepResultDialog
                title={stepResult.title}
                stageName={stageName(stage.code)}
                overview={stepResult.overview}
                visual={stepResult.visual}
                visualCards={stepResult.visualCards}
                raw={stepResult.raw}
                maximized={maximized}
                onToggleMaximize={() => setMaximized((v) => !v)}
                onFullscreenStateChange={handleFullscreenChange}
                labels={{ overview: w.tabOverview, visual: w.tabVisual, raw: w.tabRaw }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmComplete}
        onOpenChange={setConfirmComplete}
        title={fmt(w.confirmCompleteTitle, { stage: stageName(stage.code) })}
        description={
          isHandover || !nextStage ? w.confirmFinishDesc : fmt(w.confirmCompleteDesc, { next: nextStage.name })
        }
        confirmLabel={completeLabel}
        cancelLabel={w.cancel}
        busy={completing}
        onConfirm={completeStage}
      />
      <ConfirmDialog
        open={confirmDeleteDb}
        onOpenChange={setConfirmDeleteDb}
        title={w.confirmDeleteDbTitle}
        description={w.confirmDeleteDbDesc}
        confirmLabel={w.delete}
        cancelLabel={w.cancel}
        variant="destructive"
        busy={dbBusy}
        onConfirm={deleteDatabase}
      />
      <ConfirmDialog
        open={confirmRestore !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmRestore(null);
        }}
        title={fmt(w.confirmRestoreTitle, { version: confirmRestore?.version ?? "" })}
        description={w.confirmRestoreDesc}
        confirmLabel={dict.studio.restore}
        cancelLabel={w.cancel}
        busy={restoringId !== null}
        onConfirm={async () => {
          if (confirmRestore) await restoreSnapshot(confirmRestore.id);
        }}
      />

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        commands={commands}
        labels={{
          title: w.paletteTitle,
          placeholder: w.palettePlaceholder,
          empty: w.paletteEmpty,
          footer: w.shortcutsHint,
        }}
      />

      {showDesignCanvas && (
        <DesignStudioDialog
          projectId={project.id}
          savedScreens={designScreens}
          designPlan={props.designPlan}
          onClose={() => setShowDesignCanvas(false)}
          onSaved={() => router.refresh()}
          onAiFinished={notifyChangedSteps}
          labels={{
            title: dict.studio.designStudioTitle,
            promptPlaceholder: dict.studio.designPromptPlaceholder,
            generate: dict.studio.designGenerate,
            generating: dict.studio.designGenerating,
            refine: dict.studio.designRefine,
            refinePlaceholder: dict.studio.designRefinePlaceholder,
            refineHint: dict.studio.designRefineHint,
            refineBusy: dict.studio.designRefineBusy,
            roleLabel: dict.studio.designRole,
            general: dict.studio.designGeneral,
            generateAll: dict.studio.designGenerateAll,
            generateAllBusy: dict.studio.designGenerateAllBusy,
            planTitle: dict.studio.designPlanTitle,
            planEdit: dict.studio.designPlanEdit,
            planDone: dict.studio.designPlanDone,
            planSave: dict.studio.designPlanSave,
            planRegenerate: dict.studio.designPlanRegenerate,
            addRole: dict.studio.designAddRole,
            addPage: dict.studio.designAddPage,
            stale: dict.studio.designStale,
            revise: dict.studio.designRevise,
            keep: dict.studio.designKeep,
            keepAll: dict.studio.designKeepAll,
            discard: dict.studio.designDiscard,
            draft: dict.studio.designDraft,
            empty: dict.studio.designEmpty,
            savedCount: dict.studio.designPages,
            error: dict.studio.designError,
            retry: dict.studio.designRetry,
            confirmDiscard: dict.studio.confirmDiscard,
          }}
        />
      )}

      {designFullscreen && (
        <FullscreenViewer
          key={designFullscreen.id}
          title={designFullscreen.name}
          onClose={() => setDesignFullscreen(null)}
          maximized={designFsMax}
          onToggleMaximize={() => setDesignFsMax((v) => !v)}
        >
          <DesignScreen
            html={designFullscreen.html}
            title={designFullscreen.name}
            device={designFullscreen.device}
            scaleToFit={false}
          />
        </FullscreenViewer>
      )}

      {showRun && codeArtifacts && (
        <RunWorkspace
          projectId={project.id}
          projectName={project.name}
          files={codeArtifacts}
          activeFile={currentFile}
          onSelectFile={(f) => {
            setActiveFile(f);
            setActiveFix(null);
          }}
          dirty={dirtyFiles}
          onChange={handleFileChange}
          onSave={(f) => saveFiles([f])}
          onSaveAll={() => saveFiles([...dirtyFiles])}
          saving={savingFiles}
          onClose={() => setShowRun(false)}
          labels={{
            run: dict.studio.runApp,
            stop: dict.studio.stopApp,
            starting: dict.studio.runStarting,
            running: dict.studio.runRunning,
            error: dict.studio.runError,
            stopped: dict.studio.runStopped,
            notRunning: dict.studio.runNotRunning,
            noLogs: dict.studio.runNoLogs,
            logs: dict.studio.runLogs,
            demoAccount: dict.studio.runDemoAccount,
            openInNewTab: dict.studio.runOpenInNewTab,
            edgeRuntimeHint: dict.studio.runEdgeRuntimeHint,
            codeErrorHint: dict.studio.runCodeErrorHint,
            terminal: dict.studio.terminal,
            explorer: dict.studio.explorer,
            preview: dict.studio.preview,
            save: dict.studio.save,
            saveAll: dict.studio.saveAll,
            saved: dict.studio.allSaved,
            unsaved: dict.studio.unsavedFiles,
            confirmDiscard: dict.studio.confirmDiscard,
            phaseLabel: w.phaseLabel,
            phaseContainer: w.phaseContainer,
            phaseInstall: w.phaseInstall,
            phaseStart: w.phaseStart,
            phaseReady: w.phaseReady,
            logSearch: w.logSearch,
            logPause: w.logPause,
            logResume: w.logResume,
            logClear: w.logClear,
            logMatches: w.logMatches,
            copy: w.copy,
            copied: w.copied,
            reload: w.reload,
            deviceDesktop: w.deviceDesktop,
            deviceTablet: w.deviceTablet,
            deviceMobile: w.deviceMobile,
            appPreview: w.appPreview,
            close: dict.studio.close,
            loadingEditor: dict.studio.loadingEditor,
          }}
        />
      )}
    </div>
  );
}
