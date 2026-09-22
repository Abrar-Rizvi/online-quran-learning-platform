"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui";
import { formatPrice } from "@/components/courses/pricing-card";
import { findCourseBySlug } from "@/lib/courses";
import {
  createEnrollment,
  fetchCourseDetail,
  type CourseListItem,
  type CoursePlanItem,
} from "@/lib/api";
import { cn } from "@/lib/utils";

interface EnrollmentFormProps {
  courses: CourseListItem[];
  /** From ?course=<slug> — resolved against `courses` using the same toSlug() as everywhere else. */
  initialCourseSlug?: string;
}

interface FieldErrors {
  name?: string;
  email?: string;
  course?: string;
  plan?: string;
}

const inputClasses =
  "h-12 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

function FormField({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[var(--text)]">
        {label}
        {required && <span className="text-[var(--error)]"> *</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-[var(--error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function EnrollmentForm({ courses, initialCourseSlug }: EnrollmentFormProps) {
  const initialCourseId = initialCourseSlug
    ? (findCourseBySlug(courses, initialCourseSlug)?.id ?? null)
    : null;

  const [courseId, setCourseId] = useState<number | null>(initialCourseId);
  const [planId, setPlanId] = useState<number | null>(null);

  const [plansData, setPlansData] = useState<CoursePlanItem[]>([]);
  const [plansErrored, setPlansErrored] = useState(false);
  const [resolvedCourseId, setResolvedCourseId] = useState<number | null>(null);

  const plansLoading = courseId !== null && resolvedCourseId !== courseId;
  const plans =
    courseId !== null && resolvedCourseId === courseId && !plansErrored ? plansData : [];
  const plansError =
    courseId !== null && resolvedCourseId === courseId && plansErrored;

  useEffect(() => {
    if (courseId === null) return;

    fetchCourseDetail(courseId)
      .then((course) => {
        setPlansData(course?.course_plans ?? []);
        setPlansErrored(false);
        setResolvedCourseId(courseId);
      })
      .catch(() => {
        setPlansData([]);
        setPlansErrored(true);
        setResolvedCourseId(courseId);
      });
  }, [courseId]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleCourseChange(value: string) {
    setCourseId(value ? Number(value) : null);
    setPlanId(null);
  }

  function validate(): FieldErrors {
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Please enter your name.";
    if (!email.trim()) {
      next.email = "Please enter your email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Please enter a valid email address.";
    }
    if (courseId === null) next.course = "Please choose a course.";
    if (planId === null) next.plan = "Please choose a plan.";
    return next;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitStatus("submitting");
    setSubmitError(null);

    const result = await createEnrollment({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      country: country.trim() || undefined,
      course_plan_id: planId as number,
      preferred_time: preferredTime || undefined,
    });

    if (result.ok) {
      setSubmitStatus("success");
    } else {
      setSubmitStatus("error");
      setSubmitError(result.message);
    }
  }

  if (submitStatus === "success") {
    return (
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-[var(--green-100)] text-[var(--green-800)]">
            <CheckIcon className="size-6" />
          </span>
          <h2
            className="text-xl font-bold text-[var(--green-900)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            You&apos;re enrolled
          </h2>
          <p className="max-w-[40ch] text-sm leading-relaxed text-[var(--text-muted)]">
            Thanks, {name.trim() || "there"}! We&apos;ve received your enrollment. Our team will
            reach out to {email.trim()} to confirm your teacher and trial time.
          </p>
        </div>
      </div>
    );
  }

  const isSubmitting = submitStatus === "submitting";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8"
    >
      <h2
        className="text-xl font-bold text-[var(--green-900)]"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        Enrollment form
      </h2>

      <div className="mt-6 flex flex-col gap-5">
        <FormField label="Course" htmlFor="enroll-course" required error={errors.course}>
          <select
            id="enroll-course"
            value={courseId ?? ""}
            onChange={(e) => handleCourseChange(e.target.value)}
            className={cn(inputClasses, "appearance-none")}
          >
            <option value="">Select a course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Plan" htmlFor="enroll-plan" required error={errors.plan}>
          <select
            id="enroll-plan"
            value={planId ?? ""}
            onChange={(e) => setPlanId(e.target.value ? Number(e.target.value) : null)}
            disabled={courseId === null || plansLoading || plans.length === 0}
            className={cn(inputClasses, "appearance-none")}
          >
            <option value="">
              {courseId === null
                ? "Choose a course first"
                : plansLoading
                  ? "Loading plans…"
                  : plansError
                    ? "Couldn't load plans"
                    : plans.length === 0
                      ? "No plans available"
                      : "Select a plan"}
            </option>
            {plans.map((plan) => {
              const price = formatPrice(parseFloat(plan.fee), plan.currency);
              return (
                <option key={plan.id} value={plan.id}>
                  {plan.days_per_week} days/week – {price.symbol}
                  {price.amount}/mo
                </option>
              );
            })}
          </select>
          {plansError && (
            <p className="mt-1.5 text-xs text-[var(--error)]">
              We couldn&apos;t load plans for this course. Try selecting it again.
            </p>
          )}
        </FormField>

        <FormField label="Full name" htmlFor="enroll-name" required error={errors.name}>
          <input
            id="enroll-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className={inputClasses}
          />
        </FormField>

        <FormField label="Email" htmlFor="enroll-email" required error={errors.email}>
          <input
            id="enroll-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={inputClasses}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label="Phone" htmlFor="enroll-phone">
            <input
              id="enroll-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              className={inputClasses}
            />
          </FormField>

          <FormField label="Country" htmlFor="enroll-country">
            <input
              id="enroll-country"
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              autoComplete="country-name"
              className={inputClasses}
            />
          </FormField>
        </div>

        <FormField label="Preferred time" htmlFor="enroll-time">
          <input
            id="enroll-time"
            type="time"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            className={inputClasses}
          />
        </FormField>

        {submitStatus === "error" && submitError && (
          <p
            className="rounded-[var(--radius-md)] border border-[var(--error)] bg-[var(--error-bg)] p-3 text-sm text-[var(--error)]"
            role="alert"
          >
            {submitError}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? "Submitting…" : "Submit enrollment"}
        </Button>
      </div>
    </form>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
