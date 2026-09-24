/**
 * Unit tests for the Database Schema → Mermaid erDiagram derivation.
 *
 * Run with:  npm test
 */
import { test } from "vitest";
import assert from "node:assert/strict";

import { generateErdFromSchema } from "./erd";

test("parses SQL CREATE TABLE statements into an erDiagram", () => {
  const result = generateErdFromSchema([
    "CREATE TABLE users (id UUID PRIMARY KEY, email VARCHAR(255) NOT NULL);",
    "CREATE TABLE projects (id UUID PRIMARY KEY, user_id UUID REFERENCES users(id), name TEXT);",
  ]);

  assert.ok(result, "expected an ERD result");
  assert.equal(result.tableCount, 2);
  assert.equal(result.relationshipCount, 1);
  assert.match(result.code, /^erDiagram/);
  assert.match(result.code, /PROJECTS/);
  assert.match(result.code, /string email/);
});

test("parses natural-language table summaries (existing projects)", () => {
  const result = generateErdFromSchema([
    "Table `tenants`: Menyimpan data institusi. Kolom: `id` (UUID, PK), `name` (VARCHAR), `domain` (VARCHAR), `created_at` (TIMESTAMP).",
    "Table `users`: Menyimpan profil pengguna. Kolom: `id` (UUID, PK), `tenant_id` (UUID, FK -> tenants.id), `email` (VARCHAR, Unique), `name` (VARCHAR), `role` (ENUM: ADMIN, CURATOR, TEACHER), `created_at` (TIMESTAMP).",
    "Table `questions`: Menyimpan butir soal. Kolom: `id` (UUID, PK), `tenant_id` (UUID, FK -> tenants.id), `creator_id` (UUID, FK -> users.id), `content` (TEXT / JSON untuk editor), `status` (ENUM: DRAFT, APPROVED).",
    "Table `exam_paper_questions`: Relasi many-to-many. Kolom: `exam_paper_id` (UUID, FK), `question_id` (UUID, FK), `order` (INT), PK (exam_paper_id, question_id).",
  ]);

  assert.ok(result, "expected an ERD result from summaries");
  assert.equal(result.tableCount, 4);
  assert.equal(result.relationshipCount, 3);
  assert.match(result.code, /TENANTS/);
  assert.match(result.code, /USERS/);
  assert.match(result.code, /enum role/);
  assert.match(result.code, /UUID exam_paper_id PK/);
  assert.match(result.code, /UUID question_id PK/);
});

test("infers one-to-one for a unique foreign key", () => {
  const result = generateErdFromSchema([
    "CREATE TABLE profiles (id UUID PRIMARY KEY);",
    "CREATE TABLE users (id UUID PRIMARY KEY, profile_id UUID UNIQUE REFERENCES profiles(id));",
  ]);

  assert.ok(result);
  assert.equal(result.relationshipCount, 1);
  assert.match(result.code, /PROFILES \|\|--\|\| USERS/);
});

test("infers many-to-many for a join table", () => {
  const result = generateErdFromSchema([
    "CREATE TABLE users (id UUID PRIMARY KEY);",
    "CREATE TABLE roles (id UUID PRIMARY KEY);",
    "CREATE TABLE user_roles (user_id UUID REFERENCES users(id), role_id UUID REFERENCES roles(id), PRIMARY KEY (user_id, role_id));",
  ]);

  assert.ok(result);
  assert.equal(result.tableCount, 3);
  assert.match(result.code, /}o--o\{/);
});

test("infers many-to-many from a summary join table without FK targets", () => {
  const result = generateErdFromSchema([
    "Table `exam_papers`: Menyimpan paket ujian. Kolom: `id` (UUID, PK), `title` (VARCHAR).",
    "Table `questions`: Menyimpan butir soal. Kolom: `id` (UUID, PK), `subject` (VARCHAR).",
    "Table `exam_paper_questions`: Relasi many-to-many antara paket ujian dan soal. Kolom: `exam_paper_id` (UUID, FK), `question_id` (UUID, FK), `order` (INT), PK (exam_paper_id, question_id).",
  ]);

  assert.ok(result, "expected an ERD result");
  assert.match(result.code, /}o--o\{/);
  assert.match(result.code, /EXAM_PAPERS \}o--o\{ QUESTIONS/);
});

test("returns null when no table definitions are present", () => {
  assert.equal(generateErdFromSchema([]), null);
  assert.equal(generateErdFromSchema(["just some prose without tables"]), null);
});
