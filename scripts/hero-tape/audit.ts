// Geometry audit of the hero tape figure with the anatomy skill's kit/audit.mjs, once per pose.
// Run: npx tsx scripts/hero-tape/audit.ts   (--suggest prints a paint order that satisfies every pose)
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { PAINT_ORDER, PARTS, type Shape } from "@/components/landing/hero-tape/figure/parts";
import { SLAB_STEPS } from "@/components/landing/hero-tape/figure/geometry";
import { BRAKE_LIFT, P, WINDOW } from "@/components/landing/hero-tape/figure/view";
import { POSTER_POSE, poseOf, type Pose } from "@/components/landing/hero-tape/model";

/* eslint-disable @typescript-eslint/no-explicit-any -- audit.mjs is untyped JavaScript outside the repo */
type Audit = any;

const kitDir = process.env.ANATOMY_KIT ?? join(homedir(), ".config", "opencode", "skills", "anatomy", "kit");
if (!existsSync(join(kitDir, "audit.mjs"))) {
  console.error(`audit.mjs not found in ${kitDir}; set ANATOMY_KIT to the anatomy skill's kit folder.`);
  process.exit(2);
}

/** The shape as posed: tape riders shifted by tapeX along -y and cut to the window; the brake lifted when open. */
function posed(id: string, shape: Shape, pose: Pose, moves: boolean): Shape | null {
  if (moves && shape.kind === "box") {
    const y0 = Math.max(-WINDOW, shape.min[1] - pose.tapeX);
    const y1 = Math.min(WINDOW, shape.max[1] - pose.tapeX);
    if (y1 - y0 < 0.5) return null;
    return { kind: "box", min: [shape.min[0], y0, shape.min[2]], max: [shape.max[0], y1, shape.max[2]] };
  }
  if ((id === "brake" || id === "brake-spring") && !pose.brake) {
    if (shape.kind === "box") return { kind: "box", min: [shape.min[0], shape.min[1], shape.min[2] + BRAKE_LIFT], max: [shape.max[0], shape.max[1], shape.max[2] + BRAKE_LIFT] };
    if (shape.kind === "cylinder") return { ...shape, z: shape.z + BRAKE_LIFT };
  }
  return shape;
}

function auditShape(A: Audit, shape: Shape, meta: Record<string, unknown>) {
  switch (shape.kind) {
    case "slab":
      return A.slab(shape.plan, shape.z, shape.h, meta, SLAB_STEPS);
    case "extrude":
      return A.extruded(shape.ring, shape.z, shape.h, meta);
    case "cylinder":
      return A.cylinder(shape.cx, shape.cy, shape.r, shape.z, shape.h, meta);
    case "box":
      return A.box(shape.min, shape.max, meta);
  }
}

function record(A: Audit, pose: Pose) {
  const R = A.recorder(P);
  for (const id of PAINT_ORDER) {
    const part = PARTS.find((p) => p.id === id)!;
    const shape = posed(id, part.shape, pose, part.moves === "tape");
    if (!shape) continue; // wholly outside the tape window: nothing is drawn
    const meta = { name: id, ground: id === "table" || id.startsWith("foot-") };
    R.put({ name: id, piece: part.group, key: PAINT_ORDER.indexOf(id), shapes: [R.solid(auditShape(A, shape, meta))] });
  }
  return R;
}

async function main() {
  const A: Audit = await import(pathToFileURL(join(kitDir, "audit.mjs")).href);
  const poses = [poseOf(0), poseOf(0.25), poseOf(0.5), poseOf(0.75), poseOf(1), POSTER_POSE];

  if (process.argv.includes("--suggest")) {
    // Union of "front over back" rules from every pose, then a stable topological sort of PAINT_ORDER.
    const behind = new Map<string, Set<string>>(PAINT_ORDER.map((id) => [id, new Set<string>()]));
    for (const pose of poses) {
      const R = record(A, pose);
      const { pairs, least } = A.overlapsOf(R.items, P, { states: [0], skip: A.sameRun });
      for (const pair of pairs) {
        const aFront = pair.front[0].area >= least;
        const bFront = pair.front[1].area >= least;
        if (aFront === bFront) continue;
        const [front, back] = aFront ? [pair.a, pair.b] : [pair.b, pair.a];
        behind.get(R.items[front].name)!.add(R.items[back].name);
      }
    }
    const out: string[] = [];
    const left = [...PAINT_ORDER];
    while (left.length) {
      const at = left.findIndex((id) => [...behind.get(id)!].every((b) => out.includes(b)));
      if (at < 0) throw new Error(`cycle among: ${left.join(", ")}`);
      out.push(left.splice(at, 1)[0]!);
    }
    console.log(JSON.stringify(out));
    return;
  }

  let failed = false;
  for (const pose of poses) {
    const R = record(A, pose);
    // audit() would call settle(), which rewrites the keys; we prove OUR paint order instead.
    const overlaps = A.overlapsOf(R.items, P, { states: [0], skip: A.sameRun });
    R.settled = { items: R.items, overlaps, solved: { keys: R.items.map((i: { key: number }) => i.key), dropped: [], rules: 0 }, states: [0] };
    console.log("pose", pose.progress, pose.stamp && pose.progress < 0.7 ? "(poster)" : "");
    process.exitCode = 0;
    A.auditOrExit(R, P, { argv: ["--audit"] });
    if (process.exitCode) failed = true;
  }
  process.exitCode = failed ? 1 : 0;
}

void main();
