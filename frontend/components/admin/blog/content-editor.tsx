"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Button, inputClasses } from "@/components/ui";
import { isAllowedLinkUrl } from "@/lib/blog-rules";
import { cn } from "@/lib/utils";
import {
  activeFormats,
  insertLink,
  toggleInline,
  toggleLine,
  type Format,
  type TextEdit,
} from "./markdown-format";

const MIN_HEIGHT = 384; // 24rem

// The Markdown parser (~50 KB gzipped) only loads when Preview is first opened.
const MarkdownContent = dynamic(() => import("@/components/markdown/markdown-content").then((m) => m.MarkdownContent), {
  loading: () => <p className="text-[var(--text-muted)]">Loading preview…</p>,
});

/**
 * Applies one edit through the browser's own editing pipeline
 * (execCommand("insertText")), so Ctrl/Cmd+Z undoes a toolbar action like
 * typing. execCommand is deprecated but still the only way to add to a
 * textarea's native undo stack; where it is unavailable (or refuses), the
 * fallback uses setRangeText + an "input" event, which React's onChange picks
 * up (works, but isn't undoable).
 */
function applyEdit(textarea: HTMLTextAreaElement, edit: TextEdit) {
  textarea.focus();
  textarea.setSelectionRange(edit.start, edit.end);
  let ok = false;
  try {
    ok = edit.text === "" && edit.start === edit.end ? true : document.execCommand("insertText", false, edit.text);
  } catch {
    ok = false;
  }
  if (!ok) {
    textarea.setRangeText(edit.text, edit.start, edit.end, "end");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }
  textarea.setSelectionRange(edit.selStart, edit.selEnd);
}

const ICON = "size-5";

const TOOLS: { format: Format; label: string; shortcut?: string; icon: React.ReactNode }[] = [
  { format: "bold", label: "Bold", shortcut: "B", icon: <span className="text-base font-bold">B</span> },
  { format: "italic", label: "Italic", shortcut: "I", icon: <span className="font-serif text-base italic">I</span> },
  { format: "h2", label: "Heading 2", icon: <span className="text-sm font-semibold">H2</span> },
  { format: "h3", label: "Heading 3", icon: <span className="text-sm font-semibold">H3</span> },
  {
    format: "ul",
    label: "Bulleted list",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
        <path d="M9 6h11M9 12h11M9 18h11" />
        <circle cx="4.5" cy="6" r="1" fill="currentColor" />
        <circle cx="4.5" cy="12" r="1" fill="currentColor" />
        <circle cx="4.5" cy="18" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    format: "ol",
    label: "Numbered list",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
        <path d="M10 6h10M10 12h10M10 18h10" />
        <path d="M4 5l1.5-1v5M3.5 14.5c0-1 2.5-1 2.5.3 0 .9-2.5 2-2.5 3.2h2.6" strokeWidth="1.4" />
      </svg>
    ),
  },
  {
    format: "quote",
    label: "Quote",
    icon: (
      <svg className={ICON} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M9.5 6C6.5 7.2 5 9.6 5 13v5h5v-5H7.6c.1-2 1-3.4 2.8-4.3L9.5 6Zm9 0c-3 1.2-4.5 3.6-4.5 7v5h5v-5h-2.4c.1-2 1-3.4 2.8-4.3L18.5 6Z" />
      </svg>
    ),
  },
];

const LinkIcon = (
  <svg className={ICON} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
    <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
  </svg>
);

const toolButton = cn(
  "flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors duration-150 motion-reduce:transition-none",
  "hover:bg-[var(--surface-alt)] hover:text-[var(--green-900)] aria-pressed:bg-[var(--green-100)] aria-pressed:text-[var(--green-800)]",
  "focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:-outline-offset-3 disabled:cursor-not-allowed disabled:opacity-50",
);

interface LinkDraft {
  selStart: number;
  selEnd: number;
  needsText: boolean;
}

function LinkPopover({
  draft,
  onInsert,
  onClose,
}: {
  draft: LinkDraft;
  onInsert: (url: string, text: string) => void;
  onClose: () => void;
}) {
  const ids = { url: useId(), text: useId(), error: useId() };
  const [url, setUrl] = useState("https://");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstRef.current?.focus();
    firstRef.current?.select();
  }, []);

  function submit() {
    const trimmed = url.trim();
    if (!isAllowedLinkUrl(trimmed)) {
      setError("Enter a link starting with https:// or http://, or a page on this site starting with /.");
      document.getElementById(ids.url)?.focus();
      return;
    }
    onInsert(trimmed, text.trim());
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    } else if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      role="group"
      aria-label="Insert link"
      onKeyDown={onKeyDown}
      className="border-b border-[var(--border)] bg-[var(--bg)] p-3 motion-safe:animate-[admin-fade-in_120ms_ease-out] sm:p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {draft.needsText && (
          <div>
            <label htmlFor={ids.text} className="mb-1.5 block text-sm font-medium text-[var(--text)]">
              Link text
            </label>
            <input
              id={ids.text}
              value={text}
              onChange={(e) => setText(e.target.value)}
              dir="auto"
              autoComplete="off"
              placeholder="e.g. our Tajweed course"
              className={cn(inputClasses, "h-11")}
            />
          </div>
        )}
        <div className={draft.needsText ? undefined : "sm:col-span-2"}>
          <label htmlFor={ids.url} className="mb-1.5 block text-sm font-medium text-[var(--text)]">
            Link address
          </label>
          <input
            ref={firstRef}
            id={ids.url}
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError(null);
            }}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? ids.error : undefined}
            className={cn(inputClasses, "h-11", error && "border-[var(--error)]")}
          />
        </div>
      </div>
      {error && (
        <p id={ids.error} role="alert" className="mt-1.5 text-xs text-[var(--error)]">
          {error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" size="md" className="h-11" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" size="md" className="h-11" onClick={submit}>
          Insert link
        </Button>
      </div>
    </div>
  );
}

/**
 * Markdown content field: Write (toolbar + auto-growing textarea) and Preview
 * (the same MarkdownContent the public blog will use). The textarea stays
 * mounted while previewing so its undo history survives the switch.
 */
export function ContentEditor({
  id,
  value,
  onChange,
  title,
  error,
  readOnly,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Shown above the preview, like the post page's heading. */
  title: string;
  error?: string;
  readOnly: boolean;
  describedBy?: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [active, setActive] = useState<Set<Format>>(new Set());
  const [linkDraft, setLinkDraft] = useState<LinkDraft | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const tabIds = { write: useId(), preview: useId(), writePanel: useId(), previewPanel: useId() };

  // A new validation error on the content switches back to Write, so the field can be focused and fixed.
  const [shownError, setShownError] = useState(error);
  if (error !== shownError) {
    setShownError(error);
    if (error && mode === "preview") setMode("write");
  }

  // Grow with the content (JS fallback where CSS field-sizing isn't supported), keeping the page scroll still.
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta || mode !== "write" || CSS.supports("field-sizing", "content")) return;
    const scrollY = window.scrollY;
    ta.style.height = "auto";
    ta.style.height = `${Math.max(ta.scrollHeight + 2, MIN_HEIGHT)}px`;
    window.scrollTo({ top: scrollY });
  }, [value, mode]);

  const refreshActive = useCallback(() => {
    const ta = textareaRef.current;
    if (ta) setActive(activeFormats(ta.value, ta.selectionStart, ta.selectionEnd));
  }, []);

  useEffect(() => {
    // selectionchange fires on document; only react while the textarea has focus.
    const onSelection = () => {
      if (document.activeElement === textareaRef.current) refreshActive();
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, [refreshActive]);

  function format(f: Format) {
    const ta = textareaRef.current;
    if (!ta || readOnly) return;
    const { value: v, selectionStart: s, selectionEnd: e } = ta;
    const edit = f === "bold" || f === "italic" ? toggleInline(v, s, e, f) : toggleLine(v, s, e, f);
    applyEdit(ta, edit);
    refreshActive();
  }

  function openLink() {
    const ta = textareaRef.current;
    if (!ta || readOnly) return;
    setLinkDraft({ selStart: ta.selectionStart, selEnd: ta.selectionEnd, needsText: ta.selectionStart === ta.selectionEnd });
  }

  function closeLink(restore = true) {
    const draft = linkDraft;
    setLinkDraft(null);
    const ta = textareaRef.current;
    if (restore && ta && draft) {
      ta.focus();
      ta.setSelectionRange(draft.selStart, draft.selEnd);
    }
  }

  function onInsertLink(url: string, text: string) {
    const ta = textareaRef.current;
    const draft = linkDraft;
    setLinkDraft(null);
    if (!ta || !draft) return;
    applyEdit(ta, insertLink(ta.value, draft.selStart, draft.selEnd, url, text));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
    const key = e.key.toLowerCase();
    if (key === "b" || key === "i") {
      e.preventDefault();
      format(key === "b" ? "bold" : "italic");
    } else if (key === "k") {
      e.preventDefault();
      openLink();
    }
  }

  // Toolbar: one Tab stop, arrow keys move between buttons (WAI-ARIA toolbar pattern).
  const toolCount = TOOLS.length + 1;
  function onToolbarKeyDown(e: React.KeyboardEvent) {
    const moves: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, Home: -Infinity, End: Infinity };
    if (!(e.key in moves)) return;
    e.preventDefault();
    const step = moves[e.key];
    const next = step === -Infinity ? 0 : step === Infinity ? toolCount - 1 : (focusIndex + step + toolCount) % toolCount;
    setFocusIndex(next);
    toolbarRef.current?.querySelectorAll<HTMLButtonElement>("button")[next]?.focus();
  }

  function onTabKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const next = mode === "write" ? "preview" : "write";
    const target = e.key === "Home" ? "write" : e.key === "End" ? "preview" : next;
    setMode(target);
    document.getElementById(tabIds[target])?.focus();
  }

  const tab = (key: "write" | "preview", label: string) => (
    <button
      type="button"
      role="tab"
      id={tabIds[key]}
      aria-selected={mode === key}
      aria-controls={key === "write" ? tabIds.writePanel : tabIds.previewPanel}
      tabIndex={mode === key ? 0 : -1}
      onClick={() => setMode(key)}
      onKeyDown={onTabKeyDown}
      className={cn(
        "flex h-11 cursor-pointer items-center rounded-[var(--radius-sm)] px-4 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none",
        "focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2",
        mode === key ? "bg-[var(--green-100)] text-[var(--green-800)]" : "text-[var(--text-muted)] hover:bg-[var(--green-50)] hover:text-[var(--green-800)]",
      )}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
        <label htmlFor={id} className="block text-sm font-medium text-[var(--text)]">
          Content<span className="text-[var(--error)]"> *</span>
        </label>
        <div role="tablist" aria-label="Editor mode" className="flex gap-1">
          {tab("write", "Write")}
          {tab("preview", "Preview")}
        </div>
      </div>

      <div
        className={cn(
          "rounded-[var(--radius-md)] border bg-[var(--surface)]",
          // Same field look as inputClasses: the border turns green-700 while the textarea has focus.
          error
            ? "border-[var(--error)]"
            : "border-[var(--border-input)] transition-colors duration-150 has-[textarea:focus]:border-[var(--green-700)] motion-reduce:transition-none",
        )}
      >
        <div id={tabIds.writePanel} role="tabpanel" aria-labelledby={tabIds.write} hidden={mode !== "write"}>
          <div
            ref={toolbarRef}
            role="toolbar"
            aria-label="Formatting"
            aria-controls={id}
            onKeyDown={onToolbarKeyDown}
            className="sticky top-16 z-20 flex flex-wrap gap-0.5 rounded-t-[var(--radius-md)] border-b border-[var(--border)] bg-[var(--surface)] p-1"
          >
            {TOOLS.map((t, i) => (
              <button
                key={t.format}
                type="button"
                tabIndex={focusIndex === i ? 0 : -1}
                aria-label={t.label}
                aria-pressed={active.has(t.format)}
                aria-keyshortcuts={t.shortcut ? `Control+${t.shortcut} Meta+${t.shortcut}` : undefined}
                title={t.shortcut ? `${t.label} (Ctrl/⌘+${t.shortcut})` : t.label}
                disabled={readOnly}
                onFocus={() => setFocusIndex(i)}
                // Keep the textarea's selection: don't let the button take focus on mouse down.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => format(t.format)}
                className={cn(toolButton, (i === 1 || i === 3 || i === 6) && "mr-1.5")}
              >
                {t.icon}
              </button>
            ))}
            <button
              type="button"
              tabIndex={focusIndex === TOOLS.length ? 0 : -1}
              aria-label="Link"
              aria-expanded={linkDraft !== null}
              aria-keyshortcuts="Control+K Meta+K"
              title="Link (Ctrl/⌘+K)"
              disabled={readOnly}
              onFocus={() => setFocusIndex(TOOLS.length)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => (linkDraft ? closeLink() : openLink())}
              className={toolButton}
            >
              {LinkIcon}
            </button>
          </div>

          {linkDraft && <LinkPopover draft={linkDraft} onInsert={onInsertLink} onClose={() => closeLink()} />}

          <textarea
            ref={textareaRef}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={refreshActive}
            readOnly={readOnly}
            dir="auto"
            required
            aria-required="true"
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            placeholder={"Write your article here…\n\n## A section heading\n\nA paragraph with **bold** text and a [link](https://example.com)."}
            className="block min-h-96 w-full resize-y rounded-b-[var(--radius-md)] bg-transparent px-4 py-3.5 text-[1.0625rem] leading-relaxed text-[var(--text)] [field-sizing:content] placeholder:text-[var(--text-muted)] outline-none"
          />
        </div>

        <div
          id={tabIds.previewPanel}
          role="tabpanel"
          aria-labelledby={tabIds.preview}
          hidden={mode !== "preview"}
          tabIndex={0}
          className="min-h-96 rounded-[var(--radius-md)] px-4 py-6 focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:-outline-offset-3 sm:px-8 sm:py-8"
        >
          {mode === "preview" && (
            <>
              <p
                dir="auto"
                className="mb-6 max-w-[65ch] text-[var(--green-900)]"
                style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.75rem, 3vw, 2.25rem)", fontWeight: 700, lineHeight: 1.25 }}
              >
                {title.trim() || <span className="text-[var(--text-muted)]">Untitled post</span>}
              </p>
              {value.trim() ? (
                <MarkdownContent>{value}</MarkdownContent>
              ) : (
                <p className="text-[var(--text-muted)]">Nothing to preview yet. Switch to Write and add some content.</p>
              )}
            </>
          )}
        </div>
      </div>

      <details className="mt-1.5 text-sm text-[var(--text-muted)]">
        <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-sm)] font-medium text-[var(--green-700)] hover:text-[var(--green-800)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2">
          Formatting help
        </summary>
        <p className="pb-1 font-mono text-[0.8125rem] leading-relaxed">
          ## Heading · ### Smaller heading · **bold** · _italic_ · - list · 1. numbered list · &gt; quote · [text](https://link)
        </p>
      </details>
    </div>
  );
}
