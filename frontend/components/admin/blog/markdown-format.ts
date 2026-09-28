/**
 * Pure text transforms behind the editor toolbar. Each returns one replacement
 * (`start`..`end` → `text`) plus the selection to show afterwards, so the
 * caller can apply it as a single native edit (one undo step).
 */

export interface TextEdit {
  start: number;
  end: number;
  text: string;
  selStart: number;
  selEnd: number;
}

export type InlineFormat = "bold" | "italic";
export type LineFormat = "h2" | "h3" | "ul" | "ol" | "quote";
export type Format = InlineFormat | LineFormat;

const INLINE: Record<InlineFormat, { marker: string; placeholder: string }> = {
  bold: { marker: "**", placeholder: "bold text" },
  // "_" (not "*") so italic never collides with the "**" of bold.
  italic: { marker: "_", placeholder: "italic text" },
};

const LINE: Record<LineFormat, { match: RegExp; prefix: (i: number) => string; placeholder: string }> = {
  h2: { match: /^## /, prefix: () => "## ", placeholder: "Heading" },
  h3: { match: /^### /, prefix: () => "### ", placeholder: "Heading" },
  ul: { match: /^[-*+] /, prefix: () => "- ", placeholder: "List item" },
  ol: { match: /^\d+[.)] /, prefix: (i) => `${i + 1}. `, placeholder: "List item" },
  quote: { match: /^> ?/, prefix: () => "> ", placeholder: "Quote" },
};

/** Prefixes a new line format replaces (a heading replaces another heading or a list marker, etc.). */
const ANY_PREFIX = /^(#{1,6} |[-*+] |\d+[.)] |> ?)/;

/** Wraps the selection in ** or _, or unwraps it when it is already wrapped. */
export function toggleInline(value: string, selStart: number, selEnd: number, format: InlineFormat): TextEdit {
  const { marker, placeholder } = INLINE[format];
  const m = marker.length;

  // Ignore surrounding spaces (double-click often selects "word ").
  let s = selStart;
  let e = selEnd;
  while (s < e && /\s/.test(value[s])) s++;
  while (e > s && /\s/.test(value[e - 1])) e--;
  const selected = value.slice(s, e);

  if (!selected) {
    const text = marker + placeholder + marker;
    return { start: selStart, end: selEnd, text, selStart: selStart + m, selEnd: selStart + m + placeholder.length };
  }
  // Already wrapped from outside: **|word|**
  if (value.slice(s - m, s) === marker && value.slice(e, e + m) === marker) {
    return { start: s - m, end: e + m, text: selected, selStart: s - m, selEnd: e - m };
  }
  // Markers selected too: |**word**|
  if (selected.length > 2 * m && selected.startsWith(marker) && selected.endsWith(marker)) {
    const inner = selected.slice(m, -m);
    return { start: s, end: e, text: inner, selStart: s, selEnd: s + inner.length };
  }
  return { start: s, end: e, text: marker + selected + marker, selStart: s + m, selEnd: e + m };
}

function lineBounds(value: string, selStart: number, selEnd: number) {
  const start = value.lastIndexOf("\n", selStart - 1) + 1;
  // A selection ending right after a newline doesn't include the next line.
  const endFrom = selEnd > selStart && value[selEnd - 1] === "\n" ? selEnd - 1 : selEnd;
  const nl = value.indexOf("\n", endFrom);
  return { start, end: nl === -1 ? value.length : nl };
}

/** Adds or removes a line prefix (## , ### , - , 1. , > ) on every selected line. */
export function toggleLine(value: string, selStart: number, selEnd: number, format: LineFormat): TextEdit {
  const { match, prefix, placeholder } = LINE[format];
  const { start, end } = lineBounds(value, selStart, selEnd);
  const lines = value.slice(start, end).split("\n");
  const content = lines.filter((l) => l.trim() !== "");

  // Empty line, nothing selected: insert a placeholder and select it.
  if (content.length === 0 && lines.length === 1) {
    const p = prefix(0);
    return { start, end, text: p + placeholder, selStart: start + p.length, selEnd: start + p.length + placeholder.length };
  }

  const remove = content.every((l) => match.test(l));
  let n = 0;
  const next = lines.map((line) => {
    if (line.trim() === "" && lines.length > 1) return line;
    if (remove) return line.replace(match, "");
    return prefix(n++) + line.replace(ANY_PREFIX, "");
  });
  const text = next.join("\n");

  if (selStart === selEnd) {
    // Keep the caret on the same character of the (single) line.
    const shift = text.length - (end - start);
    const caret = Math.max(start, selStart + shift);
    return { start, end, text, selStart: caret, selEnd: caret };
  }
  return { start, end, text, selStart: start, selEnd: start + text.length };
}

/** [text](url) at the selection; the selected text (if any) becomes the link text. */
export function insertLink(value: string, selStart: number, selEnd: number, url: string, text: string): TextEdit {
  const label = (value.slice(selStart, selEnd) || text).replace(/[[\]]/g, "\\$&") || url;
  const md = `[${label}](${url.replace(/[()\s]/g, encodeURIComponent)})`;
  const caret = selStart + md.length;
  return { start: selStart, end: selEnd, text: md, selStart: caret, selEnd: caret };
}

/** Formats active at the selection, for the toolbar's aria-pressed state. */
export function activeFormats(value: string, selStart: number, selEnd: number): Set<Format> {
  const active = new Set<Format>();
  const lineStart = value.lastIndexOf("\n", selStart - 1) + 1;
  const nl = value.indexOf("\n", lineStart);
  const line = value.slice(lineStart, nl === -1 ? value.length : nl);
  for (const f of Object.keys(LINE) as LineFormat[]) if (LINE[f].match.test(line)) active.add(f);

  const before = value.slice(lineStart, selStart);
  const after = value.slice(selEnd, nl === -1 ? value.length : nl);
  const count = (s: string, re: RegExp) => (s.match(re) ?? []).length;
  // Inside **…** when an odd number of "**" sits on each side of the selection on this line.
  if (count(before, /\*\*/g) % 2 === 1 && count(after, /\*\*/g) % 2 === 1) active.add("bold");
  if (count(before.replace(/\w_\w/g, ""), /_/g) % 2 === 1 && count(after.replace(/\w_\w/g, ""), /_/g) % 2 === 1) {
    active.add("italic");
  }
  return active;
}
