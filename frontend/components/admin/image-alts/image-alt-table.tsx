"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { removeImageAlt, saveImageAlt } from "@/app/admin/(panel)/image-alts/actions";
import { WidgetCard, WidgetEmpty } from "@/components/admin/dashboard/widget";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { SiteImage } from "@/components/site-image";
import { Button, FormField, inputClasses } from "@/components/ui";
import { IMAGE_ALT_LIMIT, type AdminImageAlt } from "@/lib/image-alts";
import { cn } from "@/lib/utils";

export interface ImageAltRow {
  path: string;
  defaultAlt: string | null;
  override?: AdminImageAlt;
}

const cell = "block md:table-cell md:px-3 md:py-4";

export function ImageAltTable({ rows }: { rows: ImageAltRow[] }) {
  const [editing, setEditing] = useState<ImageAltRow | "new" | null>(null);
  const [resetting, setResetting] = useState<AdminImageAlt | null>(null);
  const [resetPending, setResetPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  async function reset() {
    if (!resetting || resetPending) return;
    setResetPending(true);
    setNotice("");
    setError("");
    try {
      const result = await removeImageAlt(resetting.id);
      if (result.ok) setNotice("Override removed. The image now uses its code default.");
      else setError(result.message);
    } catch {
      setError("The override could not be removed. Please try again.");
    } finally {
      setResetPending(false);
      setResetting(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <WidgetCard title="Site images" action={
        <Button size="sm" onClick={() => setEditing("new")}>Add image path</Button>
      }>
        <div role="status" className="font-medium text-[var(--green-700)]">{notice}</div>
        {error && <p role="alert" className="mb-3 text-[var(--error)]">{error}</p>}
        {rows.length === 0 ? (
          <WidgetEmpty title="No images yet" text="Add a path for an image deployed under /images/." />
        ) : (
          <table className="block w-full text-left text-sm md:table md:table-fixed">
            <thead className="sr-only md:not-sr-only md:table-header-group">
              <tr className="border-b border-[var(--border)] text-[var(--text-muted)]">
                <th scope="col" className="w-[36%] px-3 py-2">Image</th>
                <th scope="col" className="px-3 py-2">Current alt text</th>
                <th scope="col" className="w-24 px-3 py-2">Status</th>
                <th scope="col" className="w-36 px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="block divide-y divide-[var(--border)] md:table-row-group">
              {rows.map((row) => {
                const decorative = row.override?.is_decorative ?? row.defaultAlt === "";
                const alt = row.override?.alt_text ?? row.defaultAlt;
                const status = row.override ? "Custom" : alt === null ? "Missing" : "Default";
                return (
                  <tr key={row.path} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-4 md:table-row">
                    <th scope="row" className={cn(cell, "col-span-2 font-medium")}>
                      <span className="flex min-w-0 items-center gap-3">
                        <SiteImage as="img" src={row.path} alt="" width={64} height={48} loading="lazy" decoding="async"
                          className="h-12 w-16 shrink-0 rounded-[var(--radius-sm)] bg-[var(--surface-alt)] object-cover" />
                        <span className="min-w-0 wrap-anywhere" dir="ltr">{row.path}</span>
                      </span>
                    </th>
                    <td className={cn(cell, "wrap-anywhere")} dir="auto">
                      {decorative ? <span className="text-[var(--text-muted)]">Decorative (empty alt)</span> : alt ?? "No alt text"}
                    </td>
                    <td className={cell}>
                      <span className={cn(
                        "inline-block rounded-full px-2.5 py-1 font-medium",
                        status === "Missing" ? "bg-[var(--warning-bg)] text-[var(--warning)]"
                          : status === "Custom" ? "bg-[var(--green-100)] text-[var(--green-800)]"
                          : "bg-[var(--surface-alt)] text-[var(--text-muted)]",
                      )}>{status}</span>
                    </td>
                    <td className={cn(cell, "col-span-2")}>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button size="sm" variant="secondary" onClick={() => setEditing(row)} aria-label={`Edit ${row.path}`}>Edit</Button>
                        {row.override && (
                          <Button variant="link" size="sm" onClick={() => setResetting(row.override ?? null)}
                            aria-label={`Remove override for ${row.path}`}>Remove override</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </WidgetCard>
      {editing && <ImageAltDialog row={editing === "new" ? undefined : editing} onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          setError("");
          setNotice("Image alt text saved.");
        }} />}
      <ConfirmDialog
        open={resetting !== null}
        title="Remove the alt text override?"
        description={`The site will use the code default for ${resetting?.image_path ?? ""}.`}
        confirmLabel="Remove override"
        cancelLabel="Keep override"
        pending={resetPending}
        onConfirm={() => void reset()}
        onCancel={() => setResetting(null)}
      />
    </div>
  );
}

function ImageAltDialog({ row, onClose, onSaved }: { row?: ImageAltRow; onClose: () => void; onSaved: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [path, setPath] = useState(row?.path ?? "");
  const [alt, setAlt] = useState(row?.override?.alt_text ?? row?.defaultAlt ?? "");
  const [decorative, setDecorative] = useState(row?.override?.is_decorative ?? row?.defaultAlt === "");
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const length = Array.from(alt).length;

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError(null);
    setSaving(true);
    try {
      const result = await saveImageAlt(row?.override?.id ?? null, {
        image_path: path, alt_text: decorative ? "" : alt, is_decorative: decorative,
      });
      if (result.ok) onSaved();
      else setError(result);
    } catch {
      setError({ message: "The save could not be confirmed. Your edits are still here. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialog} data-admin-modal aria-labelledby={`${id}-title`}
      onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--text)] shadow-[var(--shadow-floating)] backdrop:bg-[var(--green-950)]/50 sm:p-6">
      <h2 id={`${id}-title`} style={{ fontSize: "1.25rem", color: "var(--green-900)" }}>
        {row ? "Edit image alt text" : "Add image path"}
      </h2>
      <form onSubmit={submit} noValidate aria-busy={saving} className="mt-4 grid gap-4">
        {row ? (
          <p className="wrap-anywhere text-sm text-[var(--text-muted)]" dir="ltr">{row.path}</p>
        ) : (
          <FormField label="Image path" htmlFor={`${id}-path`} required error={error?.field === "image_path" ? error.message : undefined}>
            <input id={`${id}-path`} value={path} autoFocus readOnly={saving} spellCheck={false}
              onChange={(event) => { setPath(event.target.value); setError(null); }}
              placeholder="/images/example.webp" className={inputClasses}
              aria-required="true" aria-invalid={error?.field === "image_path"} aria-describedby={`${id}-path-hint`} />
            <p id={`${id}-path-hint`} className="mt-1 text-sm text-[var(--text-muted)]">Enter the path of a deployed file under /images/.</p>
          </FormField>
        )}
        <FormField label="Alt text" htmlFor={`${id}-alt`} required={!decorative} error={error?.field === "alt_text" ? error.message : undefined}>
          <textarea id={`${id}-alt`} rows={3} dir="auto" value={decorative ? "" : alt}
            autoFocus={Boolean(row) && !decorative} readOnly={saving || decorative}
            onChange={(event) => { setAlt(event.target.value); setError(null); }}
            aria-required={!decorative} aria-invalid={error?.field === "alt_text"} aria-describedby={`${id}-count`}
            className={cn(inputClasses, "h-auto resize-y py-2")} />
          <p id={`${id}-count`} className={cn("mt-1 text-sm tabular-nums text-[var(--text-muted)]", !decorative && length > IMAGE_ALT_LIMIT && "font-medium text-[var(--warning)]")}>
            {decorative ? 0 : length} / {IMAGE_ALT_LIMIT} characters
          </p>
        </FormField>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={decorative} disabled={saving} className="mt-1 size-4 accent-[var(--green-700)]"
            onChange={(event) => { setDecorative(event.target.checked); setError(null); }}
            aria-describedby={`${id}-decorative-hint`} />
          <span>
            <span className="block font-medium">Decorative image</span>
            <span id={`${id}-decorative-hint`} className="block text-[var(--text-muted)]">
              Use only when the image adds no information. Screen readers will skip it.
            </span>
          </span>
        </label>
        {error && (!error.field || error.field === "is_decorative" || (row && error.field === "image_path")) && (
          <p role="alert" className="text-sm text-[var(--error)]">{error.message}</p>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>Discard edits</Button>
          <Button type="submit" loading={saving}>{saving ? "Saving…" : "Save alt text"}</Button>
        </div>
      </form>
    </dialog>
  );
}
