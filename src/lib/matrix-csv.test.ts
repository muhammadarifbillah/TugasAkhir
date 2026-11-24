import { describe, expect, it } from "vitest";
import { buildMatrixCsv } from "./matrix-csv";

describe("buildMatrixCsv", () => {
  it("writes a header, joins codes with ; and quotes commas", () => {
    const csv = buildMatrixCsv([
      { gate: "Pengembangan Aman", subStep: "Rahasia, CSRF", nist: ["PS.1.1"], iso: ["A.8.28", "A.8.22"] },
    ]);
    expect(csv.split("\r\n")).toEqual([
      "Gerbang,Sub-langkah,NIST SSDF,ISO 27001",
      'Pengembangan Aman,"Rahasia, CSRF",PS.1.1,A.8.28;A.8.22',
    ]);
  });

  it("escapes embedded quotes", () => {
    const csv = buildMatrixCsv([{ gate: 'A "b"', subStep: "c", nist: [], iso: [] }]);
    expect(csv.split("\r\n")[1]).toBe('"A ""b""",c,,');
  });
});
