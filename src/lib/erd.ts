/**
 * Builds a Mermaid `erDiagram` from the `databaseSchema` strings produced by
 * the Design stage. Two source shapes are supported:
 *
 *   1. Raw SQL — `CREATE TABLE ... ( ... );` statements.
 *   2. Natural-language summaries — e.g.
 *      "Table `users`: ... Kolom: `id` (UUID, PK), `tenant_id` (UUID, FK -> tenants.id)."
 *
 * The AI does not always return a ready-made `erdDiagram`, so deriving the
 * diagram here lets existing projects render an ERD without a re-run.
 *
 * Relationship cardinality is inferred:
 *   - FK column that is UNIQUE (or the PK) → one-to-one
 *   - plain FK column                     → one-to-many
 *   - join table (≥2 FK columns + composite PK) → many-to-many
 */

export type ErdCardinality = "one-to-one" | "one-to-many" | "many-to-many";

export interface ErdColumn {
  name: string;
  type: string;
  pk: boolean;
  fk: boolean;
  fkRef?: string;
  unique?: boolean;
}

export interface ErdTable {
  name: string;
  columns: ErdColumn[];
}

export interface ErdRelationship {
  from: string;
  to: string;
  cardinality: ErdCardinality;
}

export interface ErdResult {
  code: string;
  tableCount: number;
  relationshipCount: number;
}

const CARDINALITY_RANK: Record<ErdCardinality, number> = {
  "one-to-one": 1,
  "one-to-many": 2,
  "many-to-many": 3,
};

/** Mermaid erDiagram endpoint tokens for each cardinality. */
const MERMAID_TOKENS: Record<ErdCardinality, string> = {
  "one-to-one": "||--||",
  "one-to-many": "||--o{",
  "many-to-many": "}o--o{",
};

/** SQL types and summary type tokens mapped to Mermaid-safe attribute types. */
function normalizeErdType(raw: string): string {
  const base = raw.toUpperCase();
  if (/VARCHAR|CHAR|TEXT|STRING|CLOB/.test(base)) return "string";
  if (/UUID/.test(base)) return "UUID";
  if (/TIMESTAMP|DATETIME/.test(base)) return "timestamp";
  if (/BOOL/.test(base)) return "boolean";
  if (/DATE/.test(base)) return "date";
  if (/TIME/.test(base)) return "time";
  if (/INT|SERIAL/.test(base)) return "int";
  if (/NUMERIC|DECIMAL|FLOAT|DOUBLE|REAL|MONEY/.test(base)) return "float";
  if (/JSON/.test(base)) return "json";
  if (/ENUM/.test(base)) return "enum";
  const token = base.replace(/[^A-Z0-9]/g, "");
  return token ? token.toLowerCase() : "string";
}

/** Renders the collected tables and relationships as Mermaid erDiagram code. */
function buildErdDiagram(tables: ErdTable[], relationships: ErdRelationship[]): ErdResult {
  const lines: string[] = ["erDiagram", "    direction LR"];

  for (const rel of relationships) {
    const token = MERMAID_TOKENS[rel.cardinality];
    lines.push(`    ${rel.from.toUpperCase()} ${token} ${rel.to.toUpperCase()} : "has"`);
  }

  for (const table of tables) {
    lines.push(`    ${table.name.toUpperCase()} {`);
    for (const col of table.columns) {
      const marker = col.pk ? "PK" : col.fk ? "FK" : col.unique ? "UK" : "";
      lines.push(`        ${normalizeErdType(col.type)} ${col.name} ${marker}`.trim());
    }
    lines.push("    }");
  }

  return {
    code: lines.join("\n"),
    tableCount: tables.length,
    relationshipCount: relationships.length,
  };
}

function addRelationship(
  relationships: ErdRelationship[],
  from: string,
  to: string,
  cardinality: ErdCardinality,
): void {
  if (from === to) return;
  const existing = relationships.find(
    (r) => (r.from === from && r.to === to) || (r.from === to && r.to === from),
  );
  if (existing) {
    // Keep the strongest cardinality when the same pair is seen more than once.
    if (CARDINALITY_RANK[cardinality] > CARDINALITY_RANK[existing.cardinality]) {
      existing.cardinality = cardinality;
    }
    return;
  }
  relationships.push({ from, to, cardinality });
}

/** A table with two or more FK columns and a composite PK models a join. */
function isJoinTable(table: ErdTable): boolean {
  const fks = table.columns.filter((c) => c.fk);
  const pks = table.columns.filter((c) => c.pk);
  return fks.length >= 2 && pks.length >= 2;
}

function upgradeJoinTableRelationships(tables: ErdTable[], relationships: ErdRelationship[]): void {
  for (const rel of relationships) {
    const child = tables.find((t) => t.name === rel.to);
    if (child && isJoinTable(child)) rel.cardinality = "many-to-many";
  }
}

/**
 * Summary-format join tables often write FK columns as bare "FK" without a
 * target (`exam_paper_id (UUID, FK)`), so no relationship is created. Infer the
 * parent tables from the column names (`exam_paper_id` → `exam_papers`) and emit
 * the many-to-many relationship directly between them.
 */
function inferSummaryJoinRelationships(tables: ErdTable[], relationships: ErdRelationship[]): void {
  const names = new Set(tables.map((t) => t.name));
  const resolveParent = (base: string): string | null => {
    if (names.has(base)) return base;
    if (names.has(`${base}s`)) return `${base}s`;
    if (names.has(`${base}es`)) return `${base}es`;
    for (const name of names) {
      if (name.endsWith("s") && name.slice(0, -1) === base) return name;
    }
    return null;
  };

  for (const table of tables) {
    if (!isJoinTable(table)) continue;
    const parents: string[] = [];
    for (const col of table.columns.filter((c) => c.fk)) {
      if (col.fkRef) {
        parents.push(col.fkRef);
        continue;
      }
      const parent = resolveParent(col.name.replace(/_id$/, ""));
      if (parent) parents.push(parent);
    }
    const unique = [...new Set(parents)];
    if (unique.length >= 2) {
      addRelationship(relationships, unique[0], unique[1], "many-to-many");
    }
  }
}

/** Parses SQL `CREATE TABLE` statements. Returns null when none are found. */
function parseSqlSchema(cleaned: string): { tables: ErdTable[]; relationships: ErdRelationship[] } | null {
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`']?(\w+)["`']?\s*\(([\s\S]*?)\)\s*;/gi;
  const tables: ErdTable[] = [];
  const relationships: ErdRelationship[] = [];

  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(cleaned)) !== null) {
    const tableName = match[1].toLowerCase();
    if (tableName === "usersessions" || tableName === "accounts" || tableName === "verification_tokens") continue;
    const body = match[2];
    const columns: ErdColumn[] = [];

    // Split by comma, but handle nested parens like CHECK (...)
    const colLines: string[] = [];
    let depth = 0;
    let current = "";
    for (const ch of body) {
      if (ch === "(") { depth++; current += ch; }
      else if (ch === ")") { depth--; current += ch; }
      else if (ch === "," && depth === 0) { colLines.push(current); current = ""; }
      else { current += ch; }
    }
    if (current.trim()) colLines.push(current);

    const compositePkNames: string[] = [];
    for (const line of colLines) {
      const trimmed = line.trim();
      // Table-level composite key: PRIMARY KEY (a, b)
      const composite = /^PRIMARY\s+KEY\s*\(([^)]*)\)/i.exec(trimmed);
      if (composite) {
        for (const name of composite[1]
          .split(",")
          .map((s) => s.replace(/["`'\s]/g, "").toLowerCase())
          .filter(Boolean)) {
          compositePkNames.push(name);
        }
        continue;
      }
      if (!trimmed || /^(CONSTRAINT|CHECK|UNIQUE\s*\()/i.test(trimmed)) continue;

      const pk = /\bPRIMARY\s+KEY\b/i.test(trimmed);
      const unique = pk || /\bUNIQUE\b/i.test(trimmed);
      const fkMatch = /REFERENCES\s+["`']?(\w+)["`']?\s*\(/i.exec(trimmed);
      const fk = !!fkMatch;
      const fkRef = fkMatch ? fkMatch[1].toLowerCase() : undefined;

      const colMatch = /^["`']?(\w+)["`']?\s+([\w()., ]+)/i.exec(trimmed);
      if (colMatch) {
        const rawType = colMatch[2].trim()
          .replace(/\s*PRIMARY\s+KEY/i, "")
          .replace(/\s*UNIQUE/i, "")
          .replace(/\s*NOT\s+NULL/i, "")
          .replace(/\s*DEFAULT.*/i, "")
          .replace(/\s*CHECK.*/i, "")
          .replace(/\s*REFERENCES.*/i, "")
          .trim();
        columns.push({ name: colMatch[1].toLowerCase(), type: rawType, pk, fk, fkRef, unique });
      }

      if (fk && fkRef) {
        addRelationship(relationships, fkRef, tableName, unique ? "one-to-one" : "one-to-many");
      }
    }

    for (const name of compositePkNames) {
      const col = columns.find((c) => c.name === name);
      if (col) col.pk = true;
    }

    if (columns.length > 0) tables.push({ name: tableName, columns });
  }

  if (tables.length === 0) return null;
  upgradeJoinTableRelationships(tables, relationships);
  return { tables, relationships };
}

/**
 * Parses natural-language table summaries. Recognises blocks introduced by
 * `Table`/`Tabel` followed by a backticked name and a `Kolom:`/`Columns:` list
 * where each column is written as `name` (TYPE, PK/FK -> other.column).
 */
function parseSchemaSummary(databaseSchema: string[]): { tables: ErdTable[]; relationships: ErdRelationship[] } | null {
  const text = databaseSchema.join("\n");
  const markerRegex = /(?:Table|Tabel)\s+[`"']?([A-Za-z0-9_]+)[`"']?\s*:/gi;

  const markers: { name: string; start: number; end: number }[] = [];
  let marker: RegExpExecArray | null;
  while ((marker = markerRegex.exec(text)) !== null) {
    markers.push({ name: marker[1].toLowerCase(), start: marker.index, end: markerRegex.lastIndex });
  }
  if (markers.length === 0) return null;

  const tables: ErdTable[] = [];
  const relationships: ErdRelationship[] = [];

  for (let i = 0; i < markers.length; i++) {
    const tableName = markers[i].name;
    const block = text.slice(markers[i].end, i + 1 < markers.length ? markers[i + 1].start : text.length);
    const columns: ErdColumn[] = [];

    const columnRegex = /[`"']([A-Za-z0-9_]+)[`"']\s*\(([^)]*)\)/g;
    let column: RegExpExecArray | null;
    while ((column = columnRegex.exec(block)) !== null) {
      const name = column[1].toLowerCase();
      const meta = column[2];
      const pk = /\bPK\b/i.test(meta);
      const unique = pk || /\bUnique\b/i.test(meta);
      const fkRefMatch = /FK\s*(?:->|→|=>|:)\s*[`"']?([A-Za-z0-9_]+)[`"']?(?:\s*\.\s*[`"']?([A-Za-z0-9_]+)[`"']?)?/i.exec(meta);
      const fk = !!fkRefMatch || /\bFK\b/i.test(meta);
      const fkRef = fkRefMatch ? fkRefMatch[1].toLowerCase() : undefined;
      const type = meta.trim().split(/[\s,():]/)[0] || "string";

      columns.push({ name, type, pk, fk, fkRef, unique });
      if (fkRef) {
        addRelationship(relationships, fkRef, tableName, unique ? "one-to-one" : "one-to-many");
      }
    }

    // Composite primary keys are written as "PK (a, b)" outside the columns.
    const compositePk = /PK\s*\(([^)]*)\)/i.exec(block);
    if (compositePk) {
      for (const pkName of compositePk[1]
        .split(",")
        .map((s) => s.replace(/[`"'\s]/g, "").toLowerCase())
        .filter(Boolean)) {
        const col = columns.find((c) => c.name === pkName);
        if (col) col.pk = true;
      }
    }

    if (columns.length > 0) tables.push({ name: tableName, columns });
  }

  if (tables.length === 0) return null;
  inferSummaryJoinRelationships(tables, relationships);
  upgradeJoinTableRelationships(tables, relationships);
  return { tables, relationships };
}

/** Short "N× 1:1, N× 1:N, N× M:N" summary derived from the diagram code. */
export function erdCardinalitySummary(code: string): string {
  const count = (token: string) => code.split(token).length - 1;
  return `${count("||--||")}× 1:1, ${count("||--o{")}× 1:N, ${count("}o--o{")}× M:N`;
}

/**
 * Derives a Mermaid erDiagram from Design-stage schema text. Tries SQL first,
 * then falls back to natural-language summaries. Returns null when neither
 * shape yields any table.
 */
export function generateErdFromSchema(databaseSchema: string[]): ErdResult | null {
  if (!databaseSchema || databaseSchema.length === 0) return null;

  const allSql = databaseSchema.join("\n");
  // Strip markdown code fences and comments
  let cleaned = allSql.replace(/```[\s\S]*?```/g, (m) => m.replace(/```sql\n?/gi, "").replace(/```\n?/g, ""));
  cleaned = cleaned.replace(/--[^\n]*/g, "");
  // Also strip standalone markdown lines (### headings, bullet points, etc.)
  cleaned = cleaned.replace(/^###.*$/gm, "").replace(/^-\s.*$/gm, "");

  const parsed = parseSqlSchema(cleaned) ?? parseSchemaSummary(databaseSchema);
  if (!parsed || parsed.tables.length === 0) return null;

  return buildErdDiagram(parsed.tables, parsed.relationships);
}
