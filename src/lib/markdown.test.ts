import { describe, expect, it } from "vitest";
import { parseMarkdown } from "@/components/ui/markdown";

describe("parseMarkdown", () => {
  it("parses headings, paragraphs and horizontal rules", () => {
    const blocks = parseMarkdown("# Title\n\nSome text\nwrapped\n\n---");
    expect(blocks[0]).toEqual({ type: "heading", level: 1, text: "Title" });
    expect(blocks[1].type).toBe("paragraph");
    expect(blocks.at(-1)).toEqual({ type: "hr" });
  });

  it("parses ordered, unordered and task lists", () => {
    const [ul] = parseMarkdown("- a\n- b");
    expect(ul).toMatchObject({ type: "list", ordered: false });
    const [ol] = parseMarkdown("1. one\n2. two");
    expect(ol).toMatchObject({ type: "list", ordered: true });
    const [tasks] = parseMarkdown("- [x] done\n- [ ] todo");
    expect(tasks).toMatchObject({
      type: "list",
      items: [
        { text: "done", checked: true },
        { text: "todo", checked: false },
      ],
    });
  });

  it("keeps fenced code verbatim", () => {
    const [code] = parseMarkdown("```ts\nconst x = '<b>';\n```");
    expect(code).toEqual({ type: "code", lang: "ts", code: "const x = '<b>';" });
  });

  it("parses pipe tables", () => {
    const [table] = parseMarkdown("| A | B |\n|---|---|\n| 1 | 2 |");
    expect(table).toEqual({ type: "table", header: ["A", "B"], rows: [["1", "2"]] });
  });

  it("normalises CRLF line endings", () => {
    expect(parseMarkdown("# A\r\n\r\ntext")).toHaveLength(2);
  });
});
