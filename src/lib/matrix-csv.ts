export interface MatrixRow {
  gate: string;
  subStep: string;
  nist: string[];
  iso: string[];
}

const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** RFC 4180 CSV of the gate × sub-step × standards matrix (codes joined with ";"). */
export function buildMatrixCsv(rows: MatrixRow[]): string {
  const lines = [["Gerbang", "Sub-langkah", "NIST SSDF", "ISO 27001"].join(",")];
  for (const r of rows) lines.push([r.gate, r.subStep, r.nist.join(";"), r.iso.join(";")].map(cell).join(","));
  return lines.join("\r\n");
}
