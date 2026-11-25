"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadInternalLinks } from "@/app/admin/(panel)/internal-links/actions";
import { Button, FormField, inputClasses } from "@/components/ui";
import type { InternalLinkGroup, InternalLinkTarget } from "@/lib/internal-links";

const LOAD_ERROR = "Couldn't load link destinations. Please try again.";

export function InternalLinkDialog({
  selectedText,
  onInsert,
  onDismiss,
}: {
  selectedText: string;
  onInsert: (path: string, text: string, nofollow: boolean) => void;
  onDismiss: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [groups, setGroups] = useState<InternalLinkGroup[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<InternalLinkTarget | null>(null);
  const [editedText, setEditedText] = useState<string | null>(null);
  const [nofollow, setNofollow] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  useEffect(() => {
    let current = true;
    loadInternalLinks().then((result) => {
      if (!current || !result) return;
      if (result.ok) setGroups(result.groups);
      else setError(result.message);
    }).catch(() => {
      if (current) setError(LOAD_ERROR);
    });
    return () => { current = false; };
  }, [attempt]);

  const needle = query.trim().toLowerCase();
  const matches = groups?.map(({ label, links }) => ({
    label,
    links: links.filter(({ title, path }) => title.toLowerCase().includes(needle) || path.toLowerCase().includes(needle)),
  })).filter(({ links }) => links.length > 0);
  const label = editedText ?? (selectedText || selected?.title || "");

  function dismiss() {
    dialogRef.current?.close();
    onDismiss();
  }

  function insert() {
    if (!selected || !label.trim()) return;
    dialogRef.current?.close();
    onInsert(selected.path, label, nofollow);
  }

  // The course editor is a form. Keep the picker's inputs outside it.
  return createPortal(
    <dialog
      ref={dialogRef}
      data-admin-modal
      aria-labelledby={`${id}-title`}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        // A populated search field otherwise consumes Escape to clear its value.
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      }}
      onCancel={(event) => {
        event.preventDefault();
        dismiss();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 text-[var(--text)] shadow-[var(--shadow-floating)] backdrop:bg-[var(--green-950)]/50 sm:p-6"
    >
      <h2 id={`${id}-title`} style={{ fontSize: "1.25rem", color: "var(--green-900)" }}>
        Insert internal link
      </h2>
      <div className="mt-4 grid gap-4">
        <FormField label="Search pages, courses and blog posts" htmlFor={`${id}-search`}>
          <input id={`${id}-search`} type="search" value={query} autoFocus autoComplete="off"
            onChange={(event) => setQuery(event.target.value)} className={inputClasses} />
        </FormField>

        {error ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <p role="alert" className="text-[var(--error)]">{error}</p>
            <Button type="button" variant="link" onClick={() => { setError(""); setAttempt(attempt + 1); }}>Try again</Button>
          </div>
        ) : !matches ? (
          <p role="status" className="text-sm text-[var(--text-muted)]">Loading link destinations…</p>
        ) : matches.length === 0 ? (
          <p role="status" className="text-sm text-[var(--text-muted)]">No results</p>
        ) : (
          <fieldset className="min-w-0 max-h-[min(36dvh,20rem)] overflow-y-auto overscroll-contain rounded-[var(--radius-md)] border border-[var(--border)] p-2">
            <legend className="sr-only">Link destination</legend>
            {matches.map(({ label: group, links }) => (
              <div key={group} className="mb-3 last:mb-0">
                <h3 className="px-2 py-1" style={{ fontSize: "0.875rem", color: "var(--green-900)" }}>{group}</h3>
                <ul>
                  {links.map((link) => (
                    <li key={link.path}>
                      <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] p-2 hover:bg-[var(--surface-alt)] has-checked:bg-[var(--green-50)]">
                        <input
                          type="radio"
                          name={`${id}-destination`}
                          checked={selected?.path === link.path}
                          onChange={() => setSelected(link)}
                          className="mt-1 size-4 shrink-0 accent-[var(--green-700)]"
                        />
                        <span className="min-w-0 flex-1 wrap-anywhere text-sm">
                          <span className="font-medium" dir="auto">{link.title}</span>
                          {link.status && (
                            <span className="ms-2 inline-block rounded-full bg-[var(--surface-alt)] px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]">
                              {link.status === "draft" ? "Draft" : "Published"}
                            </span>
                          )}
                          <span className="block text-[var(--text-muted)]" dir="ltr">{link.path}</span>
                          {link.status === "draft" && (
                            <span className="mt-0.5 block text-[var(--warning)]">Not public yet. The link will 404 until published.</span>
                          )}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </fieldset>
        )}

        <FormField label="Link text" htmlFor={`${id}-text`}>
          <input id={`${id}-text`} value={label} dir="auto" className={inputClasses}
            aria-describedby={selected ? `${id}-selected` : undefined}
            onChange={(event) => setEditedText(event.target.value)} />
          {selected && <p id={`${id}-selected`} className="mt-1 text-sm wrap-anywhere text-[var(--text-muted)]">Links to {selected.path}</p>}
        </FormField>

        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={nofollow} onChange={(event) => setNofollow(event.target.checked)}
            aria-describedby={`${id}-nofollow`} className="mt-1 size-4 shrink-0 accent-[var(--green-700)]" />
          <span>
            <span className="block font-medium">nofollow</span>
            <span id={`${id}-nofollow`} className="block text-[var(--text-muted)]">Ask search engines to treat this link as nofollow.</span>
          </span>
        </label>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={dismiss}>Close without inserting</Button>
          <Button type="button" disabled={!selected || !label.trim()} onClick={insert}>Insert link</Button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
