import { describe, expect, it } from "vitest";
import { fmt } from "./format";

describe("fmt", () => {
  it("fills every occurrence of known placeholders", () => {
    expect(fmt("{a} of {b}, {a}", { a: 1, b: "x" })).toBe("1 of x, 1");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(fmt("Hi {name} {missing}", { name: "Ana" })).toBe("Hi Ana {missing}");
  });
});
