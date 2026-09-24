import fs from "node:fs";
import path from "node:path";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type ISectionOptions,
} from "docx";

/**
 * Minimal Markdown → .docx converter for the project's documentation files.
 * Supports: ATX headings, bullet lists, GFM tables, blockquotes, fenced code
 * blocks, horizontal rules, and inline `code` / **bold** spans.
 */

type Child = Paragraph | Table;

function inlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const idx = match.index ?? 0;
    if (idx > last) runs.push(new TextRun(text.slice(last, idx)));
    const token = match[0];
    if (token.startsWith("**")) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true }));
    } else {
      runs.push(new TextRun({ text: token.slice(1, -1), font: "Consolas" }));
    }
    last = idx + token.length;
  }
  if (last < text.length) runs.push(new TextRun(text.slice(last)));
  return runs.length > 0 ? runs : [new TextRun(text)];
}

function headingLevel(hashes: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  switch (hashes) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    case 4:
      return HeadingLevel.HEADING_4;
    default:
      return HeadingLevel.HEADING_5;
  }
}

function buildTable(rows: string[][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((cells, rowIndex) =>
      new TableRow({
        tableHeader: rowIndex === 0,
        children: cells.map(
          (cell) =>
            new TableCell({
              shading: rowIndex === 0 ? { fill: "EEEEEE" } : undefined,
              children: [
                new Paragraph({
                  children:
                    rowIndex === 0
                      ? [new TextRun({ text: cell, bold: true })]
                      : inlineRuns(cell),
                }),
              ],
            }),
        ),
      }),
    ),
  });
}

function markdownToChildren(md: string): Child[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const children: Child[] = [];
  let i = 0;
  let inCode = false;
  const codeBuffer: string[] = [];
  let tableBuffer: string[][] = [];

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      children.push(buildTable(tableBuffer));
      tableBuffer = [];
    }
  };

  for (; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCode) {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: codeBuffer.join("\n"), font: "Consolas", size: 18 })],
            spacing: { after: 120 },
          }),
        );
        codeBuffer.length = 0;
        inCode = false;
      } else {
        flushTable();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeBuffer.push(line);
      continue;
    }

    if (/^\s*\|.*\|\s*$/.test(line)) {
      const cells = line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => c.trim());
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
      tableBuffer.push(cells);
      continue;
    }
    flushTable();

    if (line.trim() === "") continue;

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      children.push(
        new Paragraph({
          heading: headingLevel(heading[1].length),
          spacing: { before: 200, after: 100 },
          children: inlineRuns(heading[2]),
        }),
      );
      continue;
    }

    if (/^---+$/.test(line.trim())) {
      children.push(
        new Paragraph({
          border: { bottom: { style: "single", size: 6, color: "999999" } },
          spacing: { after: 120 },
        }),
      );
      continue;
    }

    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      children.push(new Paragraph({ children: inlineRuns(bullet[1]), bullet: { level: 0 } }));
      continue;
    }

    const numbered = /^\s*(\d+)\.\s+(.*)$/.exec(line);
    if (numbered) {
      children.push(new Paragraph({ children: inlineRuns(`${numbered[1]}. ${numbered[2]}`), indent: { left: 360 } }));
      continue;
    }

    const quote = /^>\s?(.*)$/.exec(line);
    if (quote) {
      children.push(
        new Paragraph({
          children: inlineRuns(quote[1]),
          indent: { left: 360 },
        }),
      );
      continue;
    }

    children.push(
      new Paragraph({ children: inlineRuns(line), alignment: AlignmentType.LEFT, spacing: { after: 100 } }),
    );
  }
  flushTable();
  return children;
}

async function convert(mdPath: string): Promise<void> {
  const md = fs.readFileSync(mdPath, "utf8");
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: markdownToChildren(md),
      } as ISectionOptions,
    ],
  });
  const buffer = await Packer.toBuffer(doc);
  const outPath = mdPath.replace(/\.md$/i, ".docx");
  fs.writeFileSync(outPath, buffer);
  console.log(`[docs] ${path.basename(mdPath)} -> ${path.basename(outPath)}`);
}

async function main() {
  const targets = process.argv.slice(2);
  const files = targets.length > 0 ? targets : ["teknologi-shieldforge.md"];

  for (const file of files) {
    const resolved = path.resolve(process.cwd(), file);
    if (!fs.existsSync(resolved)) {
      console.error(`[docs] Missing source: ${file}`);
      process.exitCode = 1;
      continue;
    }
    await convert(resolved);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
