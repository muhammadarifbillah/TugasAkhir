export type BookId =
  | "sourceZip" | "github" | "manual" | "iso" | "traceability" | "badge"
  | "scanReport" | "mockup" | "threatModel" | "runPreview" | "database" | "snapshots";
export type StageCode = "analysis" | "design" | "development" | "testing" | "handover";
export type ShelfId = "home" | "studio";

export interface ResultBook {
  id: BookId;
  shelf: ShelfId;
  stage: StageCode;
  icon: "files" | "branch" | "manual" | "shield" | "matrix" | "badge" | "radar" | "devices" | "threat" | "play" | "database" | "history";
  /** Each proof is a literal that must still be in its file (books.test.ts), so the shelf cannot claim what the code dropped. */
  sources: readonly { file: string; proof: string }[];
}

export const RESULT_BOOKS: readonly ResultBook[] = [
  { id: "sourceZip", shelf: "home", stage: "development", icon: "files",
    sources: [{ file: "src/app/api/export/zip/route.ts", proof: "No source files yet" }] },
  { id: "github", shelf: "home", stage: "development", icon: "branch",
    sources: [
      { file: "src/app/api/github/push/route.ts", proof: "githubAccessTokenEncrypted" },
      { file: "src/app/api/revisions/route.ts", proof: "Only completed projects can be revised." },
    ] },
  { id: "manual", shelf: "home", stage: "handover", icon: "manual",
    sources: [
      { file: "src/app/api/export/doc/route.ts", proof: "MANUAL-BOOK.pdf" },
      { file: "src/app/api/export/doc/route.ts", proof: "Export is available after all 5 stages are completed." },
    ] },
  { id: "iso", shelf: "home", stage: "handover", icon: "shield",
    sources: [{ file: "src/app/api/export/doc/route.ts", proof: "ISO-27001-COMPLIANCE.pdf" }] },
  { id: "traceability", shelf: "home", stage: "analysis", icon: "matrix",
    sources: [
      { file: "src/app/api/export/doc/route.ts", proof: "Traceability matrix is available as Markdown only." },
      { file: "src/app/api/projects/[id]/traceability/route.ts", proof: '"Implemented"' },
    ] },
  { id: "badge", shelf: "home", stage: "handover", icon: "badge",
    sources: [{ file: "src/app/api/badge/[projectId]/route.ts", proof: "!project.badgePublic" }] },
  { id: "scanReport", shelf: "studio", stage: "testing", icon: "radar",
    sources: [
      { file: "src/app/api/projects/[id]/scan/route.ts", proof: "scanScore" },
      { file: "src/app/api/projects/[id]/scan/route.ts", proof: "Scanning spawns containers" },
    ] },
  { id: "mockup", shelf: "studio", stage: "design", icon: "devices",
    sources: [
      { file: "src/app/api/projects/[id]/design/generate/route.ts", proof: "export async function POST" },
      { file: "src/lib/design.ts", proof: "export function mockupDevicesFor" },
    ] },
  { id: "threatModel", shelf: "studio", stage: "design", icon: "threat",
    sources: [
      { file: "src/components/studio/studio-views.tsx", proof: "export function ThreatModelView" },
      { file: "src/components/studio/studio-workspace.tsx", proof: "MermaidDiagram" },
      { file: "src/lib/stages.ts", proof: '"threatModel": array of' },
    ] },
  { id: "runPreview", shelf: "studio", stage: "development", icon: "play",
    sources: [
      { file: "src/app/api/run/[projectId]/route.ts", proof: "RUNNER_MODE=disabled" },
      { file: "src/components/studio/run-workspace.tsx", proof: "export function RunWorkspace" },
    ] },
  { id: "database", shelf: "studio", stage: "handover", icon: "database",
    sources: [{ file: "src/app/api/projects/[id]/database/route.ts", proof: "finalizedAt" }] },
  { id: "snapshots", shelf: "studio", stage: "development", icon: "history",
    sources: [
      { file: "src/app/api/projects/[id]/snapshots/[snapshotId]/restore/route.ts", proof: "export async function POST" },
      { file: "src/components/studio/studio-workspace.tsx", proof: "/snapshots/${snapshotId}/restore" },
    ] },
];

export function booksOnShelf(shelf: ShelfId): ResultBook[] {
  return RESULT_BOOKS.filter((b) => b.shelf === shelf);
}

/** Design candidates left off the shelves, with the literal that shows why. */
export const EXCLUDED_CANDIDATES: readonly { id: string; file: string; proof: string }[] = [
  // Holds the same code files as the source ZIP, not requirements/STRIDE/diagrams.
  { id: "artifactsZip", file: "src/app/api/export/artifacts/route.ts", proof: "codeArtifacts" },
];

export interface BookState {
  open: BookId | null;
  turned: boolean;
}
export type BookAction = { type: "open"; id: BookId } | { type: "turn" } | { type: "close" };
export const BOOK_INITIAL: BookState = { open: null, turned: false };

export function bookReducer(s: BookState, a: BookAction): BookState {
  switch (a.type) {
    case "open":
      return s.open === a.id ? s : { open: a.id, turned: false };
    case "turn":
      return s.open !== null && !s.turned ? { ...s, turned: true } : s;
    case "close":
      return BOOK_INITIAL;
  }
}
