"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { saveCourse } from "@/app/admin/(panel)/courses/actions";
import { ContentEditor } from "@/components/admin/blog/content-editor";
import { cardClasses, WidgetTitle } from "@/components/admin/dashboard/widget";
import { ConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { Button, FormField, inputClasses } from "@/components/ui";
import { COURSE_FIELDS, type AdminCourseDetail, type CourseField, type CoursePatch } from "@/lib/admin-courses";
import { getCourseMarkdown } from "@/lib/course-markdown";
import { courseSearchSnippet } from "@/lib/course-seo";
import { SITE_URL } from "@/lib/seo";
import { cn } from "@/lib/utils";

type Values = Record<CourseField, string>;
type FieldErrors = Partial<Values>;

const SLUG_WARNING = "The old URL will automatically redirect (301) to the new one.";
const SEARCH_REFRESH = "Changing the name or description refreshes the chatbot search data on save.";
const SEO_CONTENT_MAX_LENGTH = 100_000;
const characterCountFormat = new Intl.NumberFormat("en-US");

function toValues(course: AdminCourseDetail): Values {
  return {
    name: course.name,
    description: course.description ?? "",
    slug: course.slug,
    meta_title: course.meta_title ?? "",
    meta_description: course.meta_description ?? "",
    seo_content: course.seo_content ?? "",
  };
}

const FIELD_LABELS = {
  name: "Name",
  description: "Description",
  slug: "Slug",
  meta_title: "Meta title",
  meta_description: "Meta description",
};

export function CourseEditor({ course }: { course: AdminCourseDetail }) {
  const [saved, setSaved] = useState(() => toValues(course));
  const [values, setValues] = useState(() => toValues(course));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmSlug, setConfirmSlug] = useState(false);
  const id = useId();
  const slugChanged = values.slug !== saved.slug;
  const changedFields = COURSE_FIELDS.filter((key) => values[key] !== saved[key]);
  const courseName = values.name.trim() || saved.name;
  const preview = courseSearchSnippet({ ...values, name: courseName });
  const courseContent = useMemo(() => getCourseMarkdown(values.seo_content), [values.seo_content]);
  const contentLength = useMemo(() => Array.from(values.seo_content).length, [values.seo_content]);
  const contentTooLong = contentLength > SEO_CONTENT_MAX_LENGTH;
  const contentError = contentTooLong
    ? `Course content is too long. Shorten it to ${characterCountFormat.format(SEO_CONTENT_MAX_LENGTH)} characters or fewer before saving.`
    : errors.seo_content;

  function change(field: CourseField, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setError("");
    setSuccess(false);
  }

  async function save() {
    if (saving || changedFields.length === 0 || contentTooLong) return;
    const changes: CoursePatch = {};
    for (const field of changedFields) {
      const value = values[field];
      if (field === "name" || field === "slug") {
        changes[field] = value;
      } else {
        changes[field] = value.trim() ? value : null;
      }
    }
    setConfirmSlug(false);
    setSaving(true);
    setErrors({});
    setError("");
    setSuccess(false);
    try {
      const result = await saveCourse(course.id, changes);
      if (result.ok) {
        const next = toValues(result.course);
        setSaved(next);
        setValues(next);
        setSuccess(true);
      } else {
        setErrors(result.fields ?? {});
        setError(result.message);
      }
    } catch {
      setError("The save could not be confirmed. Your edits are still here. Try again.");
    } finally {
      setSaving(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || changedFields.length === 0 || contentTooLong) return;
    if (slugChanged) setConfirmSlug(true);
    else void save();
  }

  function field(key: keyof typeof FIELD_LABELS, { hint, target }: { hint?: string; target?: number } = {}) {
    const fieldId = `${id}-${key}`;
    const fieldError = errors[key];
    const count = target ? Array.from(values[key]).length : 0;
    const props = {
      id: fieldId,
      value: values[key],
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(key, event.target.value),
      dir: key === "slug" ? "ltr" : "auto",
      readOnly: saving,
      "aria-required": key === "name" || key === "slug" ? true : undefined,
      "aria-invalid": Boolean(fieldError),
      "aria-describedby": `${fieldId}-feedback`,
    } as const;
    return (
      <FormField label={FIELD_LABELS[key]} htmlFor={fieldId} required={props["aria-required"]}>
        {key === "description" || key === "meta_description" ? (
          <textarea {...props} rows={key === "description" ? 4 : 3} className={cn(inputClasses, "h-auto resize-y py-3")} />
        ) : (
          <input {...props} className={inputClasses} spellCheck={key === "slug" ? false : undefined} />
        )}
        <div id={`${fieldId}-feedback`} className="mt-1.5 space-y-1 text-sm">
          {(hint || target) && (
            <div className="flex flex-wrap justify-between gap-x-3 text-[var(--text-muted)]">
              {hint && <p>{hint}</p>}
              {target && (
                <span className={cn("tabular-nums", count > target && "font-medium text-[var(--warning)]")}>
                  {count} / {target} suggested{count > target ? " · Over suggested length" : ""}
                </span>
              )}
            </div>
          )}
          {key === "slug" && slugChanged && (
            <p className="rounded-[var(--radius-sm)] bg-[var(--warning-bg)] p-2 font-medium text-[var(--warning)]" role="status">
              {SLUG_WARNING}
            </p>
          )}
          {fieldError && <p className="text-[var(--error)]" role="alert">{fieldError}</p>}
        </div>
      </FormField>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <Button href="/admin/courses" variant="link" className="justify-self-start">Back to courses</Button>
      <form onSubmit={submit} noValidate aria-busy={saving} className="grid min-w-0 gap-4">
        <section className={cn(cardClasses, "grid min-w-0 gap-5")}>
          <WidgetTitle>Course details</WidgetTitle>
          <p className="text-sm text-[var(--text-muted)]">{SEARCH_REFRESH}</p>
          {field("name")}
          {field("description")}
          {field("slug", { hint: "Use lowercase letters, numbers, and single hyphens." })}
        </section>

        <section className={cn(cardClasses, "grid min-w-0 gap-5")}>
          <WidgetTitle>Search appearance</WidgetTitle>
          {field("meta_title", { hint: "Leave empty to use the default course page title.", target: 60 })}
          {field("meta_description", { hint: "Leave empty to use the default course description.", target: 155 })}
          <div className="rounded-[var(--radius-md)] bg-[var(--surface-alt)] p-4 wrap-anywhere">
            <p className="mb-2 text-sm font-medium text-[var(--text-muted)]">Search result preview</p>
            <p className="text-sm text-[var(--text-muted)]">{SITE_URL}/courses/{values.slug}</p>
            <p dir="auto" className="text-lg font-semibold text-[var(--green-800)]">{preview.title}</p>
            <p dir="auto" className="mt-1 text-sm text-[var(--text)]">{preview.description}</p>
          </div>
        </section>

        <section className={cn(cardClasses, "grid min-w-0 gap-3")}>
          <ContentEditor
            id={`${id}-seo_content`}
            title={courseName}
            value={values.seo_content}
            onChange={(value) => change("seo_content", value)}
            error={contentError}
            readOnly={saving}
            describedBy={`${id}-content-feedback`}
            courseContent={courseContent}
          />
          <div id={`${id}-content-feedback`} className="text-sm">
            <p className={cn("mb-2 tabular-nums", contentTooLong ? "font-medium text-[var(--error)]" : "text-[var(--text-muted)]")}>
              {characterCountFormat.format(contentLength)} / {characterCountFormat.format(SEO_CONTENT_MAX_LENGTH)} characters
            </p>
            {contentError && <p className="mb-2 text-[var(--error)]" role="alert">{contentError}</p>}
            <div role="status" className="mb-2 space-y-1 wrap-anywhere">
              <p className="font-medium text-[var(--text)]">
                This page&apos;s H1: <bdi>{courseContent.heading?.text ?? courseName}</bdi>
              </p>
              {courseContent.headingCount > 1 && (
                <p className="text-[var(--text-muted)]">Only the first heading is the H1; the others will become H2.</p>
              )}
              {courseContent.heading?.extraOffset !== undefined && (
                <p className="text-[var(--warning)]">
                  This H1 is in the hidden part (after Read more). It is still in the page HTML for search engines, but consider placing it before the Read more marker.
                </p>
              )}
            </div>
            <p className="text-[var(--text-muted)]">Use <code>#</code> once for the page H1 and <code>##</code> for section headings.</p>
            <p className="text-[var(--text-muted)]">Use Insert Read More where the public page should start collapsing the content.</p>
          </div>
        </section>

        {error && <p className="rounded-[var(--radius-sm)] border border-[var(--error)] p-3 text-[var(--error)]" role="alert">{error}</p>}
        <div role="status" className="font-medium text-[var(--green-700)]">
          {success ? "Course saved." : null}
        </div>
        <Button type="submit" className="justify-self-start" loading={saving} disabled={changedFields.length === 0 || contentTooLong}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
      <ConfirmDialog
        open={confirmSlug}
        title="Save the new course URL?"
        description={SLUG_WARNING}
        confirmLabel="Save new URL"
        cancelLabel="Keep editing"
        onConfirm={() => void save()}
        onCancel={() => setConfirmSlug(false)}
      />
    </div>
  );
}
