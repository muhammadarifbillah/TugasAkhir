/**
 * Best-effort repair of AI-authored Mermaid so common mistakes still render:
 * markdown fences, literal `\n`, unquoted subgraph titles / node labels with
 * syntax-significant characters, `;` inside sequence messages, and unbalanced
 * block terminators (`end`). Pure and dependency-free so it can be unit-tested.
 */

/** Appends any missing block terminators (`end`) for the given opener pattern. */
function balanceEnds(code: string, opener: RegExp): string {
  const lines = code.split("\n");
  const opens = lines.filter((l) => opener.test(l)).length;
  const ends = lines.filter((l) => /^\s*end\s*$/i.test(l)).length;
  if (ends >= opens) return code;
  return code + "\n" + Array(opens - ends).fill("end").join("\n");
}

function diagramType(code: string): string {
  return (
    code
      .split("\n")
      .find((l) => l.trim() && !l.trim().startsWith("%%"))
      ?.trim()
      .toLowerCase() ?? ""
  );
}

export function sanitizeMermaid(raw: string): string {
  let code = raw.trim();

  const fence = code.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
  if (fence) code = fence[1].trim();
  code = code.replace(/\\n/g, "\n").replace(/\r\n?/g, "\n");

  const type = diagramType(code);

  if (type.startsWith("sequencediagram")) {
    // `;` terminates a statement in Mermaid; inside message text it breaks the
    // parse. Neutralise it within messages (after the first ":").
    code = code
      .split("\n")
      .map((line) => {
        const i = line.indexOf(":");
        if (i === -1) return line;
        return line.slice(0, i + 1) + line.slice(i + 1).replace(/;/g, ",");
      })
      .join("\n");
    return balanceEnds(code, /^\s*(alt|opt|loop|par|critical|break|rect)\b/i);
  }

  if (/^(flowchart|graph)\b/.test(type)) {
    // subgraph Id [Title] -> subgraph Id ["Title"]
    code = code.replace(
      /^([ \t]*subgraph[ \t]+[^\s[]+)[ \t]*\[([^\]\n]*)\]/gim,
      (match, pre: string, title: string) => {
        if (title.trim().startsWith('"')) return match;
        return `${pre} ["${title.trim().replace(/"/g, "'")}"]`;
      },
    );
    // Quote node labels with syntax-significant characters.
    code = code.replace(
      /([ \t>|]|^)([A-Za-z_][\w.-]*)\[([^\]\n]+)\]/gm,
      (match, pre: string, id: string, label: string) => {
        if (label.trim().startsWith('"')) return match;
        if (!/[:/&,]/.test(label)) return match;
        return `${pre}${id}["${label.trim().replace(/"/g, "'")}"]`;
      },
    );
    return balanceEnds(code, /^\s*subgraph\b/i);
  }

  return code;
}
