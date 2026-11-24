import { test } from "vitest";
import assert from "node:assert/strict";
import type { Octokit } from "octokit";

import { ensureBranch, pushFiles, resolveTarget } from "./github-push";

const fail = (status: number, message: string) => Object.assign(new Error(message), { status });

/**
 * Mimics the GitHub rules that matter here: the Git database API answers 409 while a
 * repository is empty or still being created, and updateRef needs an existing ref.
 */
function fakeGitHub(opts: { unavailableReads?: number } = {}) {
  const refs = new Map<string, string>();
  const parents: string[][] = [];
  let unavailable = 0;
  let n = 0;
  const key = (owner: string, repo: string, ref: string) => `${owner}/${repo}:${ref}`;
  const guard = (owner: string, repo: string) => {
    if (unavailable > 0) {
      unavailable--;
      throw fail(409, "Git Repository is unavailable.");
    }
    if (![...refs.keys()].some((k) => k.startsWith(`${owner}/${repo}:`))) {
      throw fail(409, "Git Repository is empty.");
    }
  };
  const octokit = {
    rest: {
      users: { getAuthenticated: async () => ({ data: { login: "me" } }) },
      repos: {
        createForAuthenticatedUser: async ({ name, auto_init }: { name: string; auto_init?: boolean }) => {
          if (auto_init) refs.set(key("me", name, "heads/main"), "init");
          unavailable = opts.unavailableReads ?? 0;
          return { data: { name, owner: { login: "me" }, default_branch: "main", html_url: `https://github.com/me/${name}` } };
        },
        get: async ({ owner, repo }: { owner: string; repo: string }) => ({
          data: { default_branch: "main", html_url: `https://github.com/${owner}/${repo}` },
        }),
      },
      git: {
        getRef: async ({ owner, repo, ref }: { owner: string; repo: string; ref: string }) => {
          guard(owner, repo);
          const sha = refs.get(key(owner, repo, ref));
          if (!sha) throw fail(404, "Not Found");
          return { data: { object: { sha } } };
        },
        createBlob: async ({ owner, repo }: { owner: string; repo: string }) => {
          guard(owner, repo);
          return { data: { sha: `blob${++n}` } };
        },
        createTree: async ({ owner, repo }: { owner: string; repo: string }) => {
          guard(owner, repo);
          return { data: { sha: `tree${++n}` } };
        },
        createCommit: async ({ parents: p }: { parents: string[] }) => {
          parents.push(p);
          return { data: { sha: `commit${++n}` } };
        },
        updateRef: async ({ owner, repo, ref, sha }: { owner: string; repo: string; ref: string; sha: string }) => {
          if (!refs.has(key(owner, repo, ref))) throw fail(422, "Reference does not exist");
          refs.set(key(owner, repo, ref), sha);
          return { data: {} };
        },
        createRef: async ({ owner, repo, ref, sha }: { owner: string; repo: string; ref: string; sha: string }) => {
          guard(owner, repo);
          const name = ref.replace(/^refs\//, "");
          if (refs.has(key(owner, repo, name))) throw fail(422, "Reference already exists");
          refs.set(key(owner, repo, name), sha);
          return { data: {} };
        },
        deleteRef: async ({ owner, repo, ref }: { owner: string; repo: string; ref: string }) => {
          if (!refs.delete(key(owner, repo, ref))) throw fail(422, "Reference does not exist");
          return { data: {} };
        },
      },
    },
  };
  return { octokit: octokit as unknown as Octokit, refs, parents };
}

const files = { "index.html": "<h1>hi</h1>", "README.md": "# app" };

test("pushing to a freshly created repository lands a commit on its default branch", async () => {
  const gh = fakeGitHub({ unavailableReads: 2 });
  const target = await resolveTarget(gh.octokit, { repoName: "app", visibility: "private", projectName: "App" }, 0);
  const sha = await pushFiles(gh.octokit, target.owner, target.repo, target.branch, target.baseSha, files, "init");
  assert.equal(gh.refs.get("me/app:heads/main"), sha);
  assert.deepEqual(gh.parents.at(-1), ["init"]);
  assert.equal(target.created, true);
});

test("pushing to an existing repository builds on its current head", async () => {
  const gh = fakeGitHub();
  gh.refs.set("me/old:heads/main", "head1");
  const target = await resolveTarget(
    gh.octokit,
    { existingRepoUrl: "https://github.com/me/old.git", repoName: "ignored", visibility: "private", projectName: "App" },
    0,
  );
  assert.equal(target.baseSha, "head1");
  const sha = await pushFiles(gh.octokit, target.owner, target.repo, target.branch, target.baseSha, files, "update");
  assert.equal(gh.refs.get("me/old:heads/main"), sha);
  assert.deepEqual(gh.parents.at(-1), ["head1"]);
  assert.equal(target.created, false);
});

test("a release branch left by a cancelled revision is restarted from the base commit", async () => {
  const gh = fakeGitHub();
  gh.refs.set("me/app:heads/main", "base");
  gh.refs.set("me/app:heads/release/v1.1", "stale");

  await ensureBranch(gh.octokit, "me", "app", "release/v1.1", "base");
  assert.equal(gh.refs.get("me/app:heads/release/v1.1"), "base");

  // A fresh branch name must not need the delete step.
  await ensureBranch(gh.octokit, "me", "app", "release/v1.2", "base");
  assert.equal(gh.refs.get("me/app:heads/release/v1.2"), "base");
});
