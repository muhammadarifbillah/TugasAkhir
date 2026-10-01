<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Local dev vs. production build

`npm run build` and `npm run dev` share the same `.next` directory. Running a build in
this working copy while `next dev` is active leaves two conflicting outputs in `.next`
(a production build and the dev artifacts), which corrupts the dev server's routing: some
routes then return 404 even though they exist (e.g. `/api/auth/*`, `/en/studio/...`,
`/en/projects/new`).

Rules:
- Do NOT run `npm run build` (or `next build`) in this directory while using `next dev`.
- Run production builds in CI or a separate clone/worktree.
- If dev routes start 404ing: stop the dev server, delete `.next`, then start `npm run dev` again.

