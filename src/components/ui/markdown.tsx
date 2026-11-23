import { Fragment, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Small, dependency-free Markdown renderer for AI-produced documents (manual
 * book, compliance report). It builds React elements only — no
 * dangerouslySetInnerHTML — so model output can never inject markup. Supports
 * headings, paragraphs, lists (incl. task lists), blockquotes, fenced code,
 * pipe tables, horizontal rules, and inline code / bold / italic / links.
 */

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; lang: string; code: string }
  | { type: "list"; ordered: boolean; items: { text: string; checked: boolean | null }[] }
  | { type: "quote"; text: string }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "hr" };

const LIST_RE = /^\s*([-*+]|\d+[.)])\s+(.*)$/;
const TABLE_SEP_RE = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }

    const fence = line.match(/^\s*(```|~~~)\s*([\w+-]*)/);
    if (fence) {
      const marker = fence[1];
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith(marker)) code.push(lines[i++]);
      i++;
      blocks.push({ type: "code", lang: fence[2] ?? "", code: code.join("\n") });
      continue;
    }

    const heading = line.match(/^\s*(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && TABLE_SEP_RE.test(lines[i + 1])) {
      const header = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes("|") && lines[i].trim() !== "") {
        rows.push(splitRow(lines[i++]));
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push({ type: "quote", text: quote.join(" ") });
      continue;
    }

    const listMatch = line.match(LIST_RE);
    if (listMatch) {
      const ordered = /\d/.test(listMatch[1]);
      const items: { text: string; checked: boolean | null }[] = [];
      while (i < lines.length) {
        const m = lines[i].match(LIST_RE);
        if (m && /\d/.test(m[1]) === ordered) {
          const task = m[2].match(/^\[( |x|X)\]\s+(.*)$/);
          items.push(task ? { text: task[2], checked: task[1] !== " " } : { text: m[2], checked: null });
          i++;
        } else if (lines[i].trim() !== "" && /^\s{2,}/.test(lines[i]) && items.length > 0) {
          // indented continuation line
          items[items.length - 1].text += ` ${lines[i].trim()}`;
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !LIST_RE.test(lines[i]) &&
      !/^\s*(#{1,6}\s|>|```|~~~)/.test(lines[i]) &&
      !/^\s*([-*_])(\s*\1){2,}\s*$/.test(lines[i])
    ) {
      para.push(lines[i++].trim());
    }
    if (para.length === 0) {
      // Unrecognised single line — never loop forever.
      para.push(lines[i++].trim());
    }
    blocks.push({ type: "paragraph", text: para.join(" ") });
  }
  return blocks;
}

function safeHref(href: string): string | null {
  const h = href.trim();
  if (/^(https?:|mailto:)/i.test(h) || h.startsWith("/") || h.startsWith("#")) return h;
  return null;
}

const INLINE_RE = /(`[^`]+`)|(\*\*[^*]+\*\*|__[^_]+__)|(\*[^*\s][^*]*\*|_[^_\s][^_]*_)|(\[[^\]]+\]\([^)\s]+\))/;

export function renderInline(text: string, keyPrefix = "i"): ReactNode[] {
  const out: ReactNode[] = [];
  let rest = text;
  let n = 0;
  while (rest.length > 0) {
    const m = rest.match(INLINE_RE);
    if (!m || m.index === undefined) {
      out.push(rest);
      break;
    }
    if (m.index > 0) out.push(rest.slice(0, m.index));
    const token = m[0];
    const key = `${keyPrefix}-${n++}`;
    if (m[1]) {
      out.push(
        <code key={key} className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (m[2]) {
      out.push(<strong key={key}>{renderInline(token.slice(2, -2), key)}</strong>);
    } else if (m[3]) {
      out.push(<em key={key}>{renderInline(token.slice(1, -1), key)}</em>);
    } else if (m[4]) {
      const link = token.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      const href = link ? safeHref(link[2]) : null;
      if (link && href) {
        const external = /^https?:/i.test(href);
        out.push(
          <a
            key={key}
            href={href}
            className="text-primary underline underline-offset-2 hover:text-primary/80"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {renderInline(link[1], key)}
          </a>,
        );
      } else {
        out.push(link ? link[1] : token);
      }
    }
    rest = rest.slice(m.index + token.length);
  }
  return out;
}

const HEADING_CLASS: Record<number, string> = {
  1: "text-lg font-semibold",
  2: "text-base font-semibold",
  3: "text-sm font-semibold",
  4: "text-sm font-semibold",
  5: "text-sm font-medium",
  6: "text-sm font-medium text-muted-foreground",
};

export function Markdown({ source, className }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source);
  return (
    <div className={cn("space-y-3 text-sm leading-relaxed text-foreground", className)}>
      {blocks.map((b, idx) => {
        const key = `b${idx}`;
        switch (b.type) {
          case "heading": {
            const Tag = `h${Math.min(6, b.level + 1)}` as "h2";
            return (
              <Tag key={key} className={cn(HEADING_CLASS[b.level], idx > 0 && "pt-2")}>
                {renderInline(b.text, key)}
              </Tag>
            );
          }
          case "paragraph":
            return (
              <p key={key} className="text-muted-foreground">
                {renderInline(b.text, key)}
              </p>
            );
          case "code":
            return (
              <pre key={key} className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
                <code>{b.code}</code>
              </pre>
            );
          case "quote":
            return (
              <blockquote key={key} className="border-s-2 border-primary/40 ps-3 text-muted-foreground italic">
                {renderInline(b.text, key)}
              </blockquote>
            );
          case "hr":
            return <hr key={key} className="border-border" />;
          case "table":
            return (
              <div key={key} className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      {b.header.map((h, c) => (
                        <th key={c} className="py-1.5 pe-3 font-medium">
                          {renderInline(h, `${key}h${c}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={r} className="border-b last:border-0 odd:bg-muted/20">
                        {row.map((cell, c) => (
                          <td key={c} className="py-1.5 pe-3 align-top">
                            {renderInline(cell, `${key}r${r}c${c}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "list": {
            const ListTag = b.ordered ? "ol" : "ul";
            return (
              <ListTag
                key={key}
                className={cn("space-y-1 ps-5 text-muted-foreground", b.ordered ? "list-decimal" : "list-disc")}
              >
                {b.items.map((item, li) => (
                  <li key={li} className={item.checked !== null ? "list-none -ms-5" : undefined}>
                    {item.checked !== null ? (
                      <span className="inline-flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          readOnly
                          disabled
                          aria-label={item.text}
                          className="mt-1"
                        />
                        <span>{renderInline(item.text, `${key}l${li}`)}</span>
                      </span>
                    ) : (
                      <Fragment>{renderInline(item.text, `${key}l${li}`)}</Fragment>
                    )}
                  </li>
                ))}
              </ListTag>
            );
          }
        }
      })}
    </div>
  );
}
