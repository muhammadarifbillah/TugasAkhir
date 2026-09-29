"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  Loader2,
  Rocket,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { csrfFetch } from "@/lib/csrf-client";
import type { Dictionary } from "@/lib/i18n";

export function DeliverablesPanel({
  projectId,
  version,
  codeArtifacts,
  latestRevision,
  badgePublic,
  projectStatus,
  completedStages,
  totalStages,
  dict,
  lang,
}: {
  projectId: string;
  version: string;
  codeArtifacts: Record<string, string> | null;
  latestRevision: {
    id: string;
    version: string;
    revisionSummary: string;
    githubPrUrl: string | null;
    status: string;
  } | null;
  badgePublic: boolean;
  projectStatus: string;
  completedStages: number;
  totalStages: number;
  dict: Dictionary;
  lang: string;
}) {
  const router = useRouter();
  const [repoName, setRepoName] = useState("");
  const [existingRepoUrl, setExistingRepoUrl] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [commitMessage, setCommitMessage] = useState("");
  const [pat, setPat] = useState("");
  const [pushing, setPushing] = useState(false);
  const [pushed, setPushed] = useState<{ repoUrl: string } | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [revSummary, setRevSummary] = useState("");
  const [startingRevision, setStartingRevision] = useState(false);
  const [revisionPr, setRevisionPr] = useState<string | null>(null);
  const [revisionGithubWarning, setRevisionGithubWarning] = useState<string | null>(null);

  const [revisionStatus, setRevisionStatus] = useState(latestRevision?.status ?? null);
  const [updatingRevision, setUpdatingRevision] = useState(false);

  const [badgeCopied, setBadgeCopied] = useState(false);
  const [badgeOn, setBadgeOn] = useState(badgePublic);
  const [badgeSaving, setBadgeSaving] = useState(false);

  const fileCount = codeArtifacts ? Object.keys(codeArtifacts).length : 0;
  const projectDone = projectStatus === "completed";

  const badgeUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/badge/${projectId}`;
  const badgeMarkdown = `[![ShieldForge](https://img.shields.io/badge/ShieldForge-NIST%20SP%20800--218-brightgreen)](${badgeUrl})`;

  async function push() {
    const usingExisting = existingRepoUrl.trim().length > 0;
    if (!usingExisting && !repoName.trim()) return;
    setPushing(true);
    setError(null);
    setPushed(null);
    try {
      const res = await csrfFetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          repoName: repoName.trim() || "shieldforge-website",
          visibility,
          commitMessage,
          pat: pat.trim() || undefined,
          existingRepoUrl: usingExisting ? existingRepoUrl.trim() : undefined,
        }),
      });
      const data = (await res.json()) as { repoUrl?: string; error?: string };
      if (!res.ok) {
        setError(
          data.error ??
            dict.deliverables.errPushPat,
        );
      } else if (data.repoUrl) {
        setPushed({ repoUrl: data.repoUrl });
      }
    } catch {
      setError(dict.deliverables.errPush);
    } finally {
      setPushing(false);
    }
  }

  async function startRevision() {
    setStartingRevision(true);
    setError(null);
    setRevisionPr(null);
    setRevisionGithubWarning(null);
    try {
      const res = await csrfFetch("/api/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, summary: revSummary.trim() }),
      });
      const data = (await res.json()) as {
        prUrl?: string;
        nextVersion?: string;
        error?: string;
        githubWarning?: string | null;
      };
      if (!res.ok) {
        setError(data.error ?? dict.deliverables.errStartRevision);
        return;
      }
      setRevisionPr(data.prUrl ?? null);
      if (data.githubWarning) setRevisionGithubWarning(data.githubWarning);
      setRevSummary("");
      router.push(`/${lang}/studio/${projectId}/analysis`);
    } catch {
      setError(dict.deliverables.errStartRevision);
    } finally {
      setStartingRevision(false);
    }
  }

  async function updateRevision(status: "merged" | "cancelled") {
    if (!latestRevision) return;
    setUpdatingRevision(true);
    setError(null);
    try {
      const res = await csrfFetch(`/api/revisions/${latestRevision.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? dict.deliverables.errUpdateRevision);
        return;
      }
      setRevisionStatus(status);
    } catch {
      setError(dict.deliverables.errUpdateRevision);
    } finally {
      setUpdatingRevision(false);
    }
  }

  async function downloadBlob(url: string, filename: string, key: string) {
    setDownloading(key);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? dict.deliverables.errPush);
        return;
      }
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      setError(dict.deliverables.errPush);
    } finally {
      setDownloading(null);
    }
  }

  function downloadZip() {
    if (fileCount === 0) return;
    void downloadBlob(`/api/export/zip?projectId=${projectId}`, `shieldforge-${projectId}.zip`, "zip");
  }

  function download(kind: "manual" | "iso" | "traceability", format: "pdf" | "md") {
    const name =
      kind === "manual"
        ? "MANUAL-BOOK"
        : kind === "iso"
          ? "ISO-27001-COMPLIANCE"
          : "TRACEABILITY-MATRIX";
    void downloadBlob(
      `/api/export/doc?projectId=${projectId}&type=${kind}&format=${format}`,
      `${name}.${format}`,
      `${kind}-${format}`,
    );
  }

  async function toggleBadge() {
    const next = !badgeOn;
    setBadgeSaving(true);
    setError(null);
    try {
      const res = await csrfFetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ badgePublic: next }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? dict.studio.requestFailed);
        return;
      }
      setBadgeOn(next);
    } catch {
      setError(dict.studio.networkError);
    } finally {
      setBadgeSaving(false);
    }
  }

  async function copyBadge() {
    try {
      await navigator.clipboard.writeText(badgeMarkdown);
      setBadgeCopied(true);
      setTimeout(() => setBadgeCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="space-y-4 p-4">
      {projectDone ? (
        <div className="rounded-lg border bg-success/5 p-4 text-sm">
          <p className="font-medium">{dict.deliverables.congrats}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {dict.deliverables.filesReady.replace("{count}", String(fileCount)).replace("{version}", version)}
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/5 p-4 text-xs text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p>
            {dict.deliverables.incompleteNotice.replace("{completed}", String(completedStages)).replace("{total}", String(totalStages))}
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Rocket className="size-4 text-primary" /> {dict.deliverables.pushGithub}
          </CardTitle>
          <CardDescription>{dict.deliverables.pushGithub}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-2 rounded-md border bg-muted/30 p-3">
            <div className="grid gap-2">
              <Label htmlFor="repo" className="text-xs">{dict.deliverables.repoName}</Label>
              <Input id="repo" value={repoName} onChange={(e) => setRepoName(e.target.value)} placeholder={dict.deliverables.phRepoName} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="existingRepo" className="text-xs">{dict.deliverables.existingRepo}</Label>
              <Input
                id="existingRepo"
                value={existingRepoUrl}
                onChange={(e) => setExistingRepoUrl(e.target.value)}
                placeholder={dict.deliverables.phExistingRepo}
              />
              <p className="text-[11px] text-muted-foreground">{dict.deliverables.existingRepoHint}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="visibility">{dict.deliverables.visibility}</Label>
              <Select name="visibility" value={visibility} onValueChange={(v) => setVisibility(v as "private" | "public")}>
                <SelectTrigger id="visibility"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">{dict.deliverables.private}</SelectItem>
                  <SelectItem value="public">{dict.deliverables.public}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="msg">{dict.deliverables.commitMessage}</Label>
              <Input id="msg" value={commitMessage} onChange={(e) => setCommitMessage(e.target.value)} placeholder={dict.deliverables.phCommit} />
            </div>
          </div>

          <div className="grid gap-2 rounded-md border bg-muted/30 p-3">
            <Label htmlFor="pat" className="text-xs">{dict.deliverables.githubPat}</Label>
            <Input
              id="pat"
              type="password"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
              placeholder={dict.deliverables.phPat}
            />
            <p className="text-[11px] text-muted-foreground">{dict.deliverables.githubPatHint}</p>
          </div>

          {pushed && (
            <div className="flex items-center gap-2 rounded-md border bg-success/10 px-3 py-2 text-xs text-success">
              <Check className="size-4" />
              <a href={pushed.repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
                {pushed.repoUrl} <ExternalLink className="size-3" />
              </a>
            </div>
          )}
          {error && <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}

          <Button onClick={push} disabled={pushing || (!existingRepoUrl.trim() && !repoName.trim())} className="w-full">
            {pushing ? <Loader2 className="animate-spin" /> : <GitBranch className="size-4" />}
            {dict.deliverables.push}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-primary" /> {dict.deliverables.newRevision}
          </CardTitle>
          <CardDescription>{dict.deliverables.revisionSummary}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            id="revSummary"
            name="revSummary"
            aria-label={dict.deliverables.revisionSummary}
            value={revSummary}
            onChange={(e) => setRevSummary(e.target.value)}
            placeholder={dict.deliverables.phRevSummary}
            rows={2}
            className="resize-none text-xs"
          />
          {revisionPr && (
            <a
              href={revisionPr}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border bg-success/10 px-3 py-2 text-xs text-success underline underline-offset-2"
            >
              <GitPullRequest className="size-3.5" /> {revisionPr} <ExternalLink className="size-3" />
            </a>
          )}
          {revisionGithubWarning && (
            <p className="flex items-start gap-2 rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-xs text-warning">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {revisionGithubWarning}
            </p>
          )}

          {latestRevision && revisionStatus && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">{latestRevision.version}</span>
                <Badge variant={revisionStatus === "merged" ? "success" : revisionStatus === "cancelled" ? "muted" : "warning"}>
                  {revisionStatus === "merged" ? dict.deliverables.merged : revisionStatus === "cancelled" ? dict.deliverables.cancelled : dict.deliverables.inProgressRev}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{latestRevision.revisionSummary}</p>
              {revisionStatus === "in_progress" && (
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => updateRevision("merged")} disabled={updatingRevision}>
                    {updatingRevision ? <Loader2 className="animate-spin" /> : <Check className="size-3.5 text-success" />}
                    {dict.deliverables.mergeRevision}
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => updateRevision("cancelled")} disabled={updatingRevision}>
                    {dict.deliverables.cancelRevision}
                  </Button>
                </div>
              )}
            </div>
          )}

          <Button onClick={startRevision} disabled={startingRevision || !revSummary.trim()} variant="secondary" className="w-full">
            {startingRevision ? <Loader2 className="animate-spin" /> : <GitPullRequest className="size-4" />}
            {dict.deliverables.startRevision}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.deliverables.downloadsTitle}</CardTitle>
          <CardDescription>{dict.deliverables.downloadsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Button variant="outline" className="justify-between" onClick={() => downloadZip()} disabled={downloading !== null || fileCount === 0}>
            <span className="flex items-center gap-2">
              {downloading === "zip" ? <Loader2 className="animate-spin" /> : <Download className="size-4" />}
              {dict.deliverables.downloadZip} <Badge variant="secondary">.zip</Badge>
            </span>
          </Button>
          <Button variant="outline" className="justify-between" onClick={() => download("manual", "pdf")} disabled={downloading !== null || fileCount === 0}>
            <span className="flex items-center gap-2">
              {downloading === "manual-pdf" ? <Loader2 className="animate-spin" /> : <Download className="size-4" />}
              {dict.deliverables.downloadManual} <Badge variant="secondary">{dict.deliverables.asPdf}</Badge>
            </span>
          </Button>
          <Button variant="outline" className="justify-between" onClick={() => download("manual", "md")} disabled={downloading !== null || fileCount === 0}>
            <span className="flex items-center gap-2">
              {downloading === "manual-md" ? <Loader2 className="animate-spin" /> : <Download className="size-4" />}
              {dict.deliverables.downloadManual} <Badge variant="secondary">{dict.deliverables.asMarkdown}</Badge>
            </span>
          </Button>
          <Button variant="outline" className="justify-between" onClick={() => download("iso", "pdf")} disabled={downloading !== null || fileCount === 0}>
            <span className="flex items-center gap-2">
              {downloading === "iso-pdf" ? <Loader2 className="animate-spin" /> : <Download className="size-4" />}
              {dict.deliverables.downloadIso} <Badge variant="secondary">{dict.deliverables.asPdf}</Badge>
            </span>
          </Button>
          <Button variant="outline" className="justify-between" onClick={() => download("iso", "md")} disabled={downloading !== null || fileCount === 0}>
            <span className="flex items-center gap-2">
              {downloading === "iso-md" ? <Loader2 className="animate-spin" /> : <Download className="size-4" />}
              {dict.deliverables.downloadIso} <Badge variant="secondary">{dict.deliverables.asMarkdown}</Badge>
            </span>
          </Button>
          <Button variant="outline" className="justify-between" onClick={() => download("traceability", "md")} disabled={downloading !== null || fileCount === 0}>
            <span className="flex items-center gap-2">
              {downloading === "traceability-md" ? <Loader2 className="animate-spin" /> : <Download className="size-4" />}
              {dict.deliverables.downloadTraceability} <Badge variant="secondary">{dict.deliverables.asMarkdown}</Badge>
            </span>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.deliverables.badge}</CardTitle>
          <CardDescription>{dict.deliverables.badgeHint}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
            <label className="flex flex-1 cursor-pointer items-center gap-2 text-xs">
              <input
                id="badgePublic"
                name="badgePublic"
                aria-label={dict.deliverables.badge}
                type="checkbox"
                checked={badgeOn}
                onChange={toggleBadge}
                disabled={badgeSaving || !projectDone}
                className="size-3.5 accent-primary"
              />
              {dict.deliverables.badgePublic}
            </label>
            {badgeSaving && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
          </div>
          {badgeOn && projectDone && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
              <code className="min-w-0 flex-1 overflow-x-auto font-mono text-[11px]">{badgeMarkdown}</code>
              <Button size="sm" variant="outline" onClick={copyBadge}>
                {badgeCopied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
                {badgeCopied ? dict.deliverables.ok : dict.deliverables.copy}
              </Button>
            </div>
          )}
          {!projectDone && (
            <p className="text-[11px] text-muted-foreground">{dict.deliverables.badgeLocked}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
