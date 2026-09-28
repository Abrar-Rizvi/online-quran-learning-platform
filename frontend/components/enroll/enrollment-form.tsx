"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, FormField, TimePicker, inputClasses } from "@/components/ui";
import { formatPrice } from "@/components/courses/pricing-card";
import { findCourseBySlug } from "@/lib/courses";
import {
  createEnrollment,
  fetchCourseDetail,
  type CourseListItem,
  type CoursePlanItem,
} from "@/lib/api";
import { countryError, emailError, nameError, phoneError } from "@/lib/form-rules";
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
  phone?: string;
  whatsapp?: string;
  country?: string;
  preferredTime?: string;
}

/** API field (422 `loc`) → this form's field. */
const API_FIELDS: Record<string, keyof FieldErrors> = {
  name: "name",
  email: "email",
  phone: "phone",
  whatsapp: "whatsapp",
  country: "country",
  preferred_time: "preferredTime",
  course_plan_id: "plan",
};

export function EnrollmentForm({ courses, initialCourseSlug }: EnrollmentFormProps) {
  const router = useRouter();

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
  const [whatsapp, setWhatsapp] = useState("");
  const [country, setCountry] = useState("");
  const [preferredTime, setPreferredTime] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);

  function handleCourseChange(value: string) {
    setCourseId(value ? Number(value) : null);
    setPlanId(null);
  }

  function validate(): FieldErrors {
    // Same rules as the backend (lib/form-rules.ts), shown under each field.
    const next: FieldErrors = {};
    const rules: [keyof FieldErrors, string | null][] = [
      ["name", nameError(name)],
      ["email", emailError(email)],
      ["course", courseId === null ? "Please choose a course." : null],
      ["plan", planId === null ? "Please choose a plan." : null],
      ["phone", phoneError(phone, "Phone", "Please enter your phone number.")],
      ["whatsapp", phoneError(whatsapp, "WhatsApp number")],
      ["country", countryError(country)],
      ["preferredTime", preferredTime ? null : "Please select a preferred time."],
    ];
    for (const [field, message] of rules) if (message) next[field] = message;
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
      phone: phone.trim(),
      ...(whatsapp.trim() ? { whatsapp: whatsapp.trim() } : {}),
      country: country.trim(),
      course_plan_id: planId as number,
      preferred_time: preferredTime,
    });

    if (result.ok) {
      router.push(`/enroll/confirmation/${result.confirmationToken}`);
      return;
    }
    // Server-side field errors go under their fields; a form-level message only when none can be placed.
    const fromServer: FieldErrors = {};
    for (const [apiField, message] of Object.entries(result.fieldErrors ?? {})) {
      const field = API_FIELDS[apiField];
      if (field) fromServer[field] = message;
    }
    setSubmitStatus("error");
    if (Object.keys(fromServer).length > 0) {
      setErrors(fromServer);
      setSubmitError(null);
    } else {
      setSubmitError(result.message);
    }
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
            aria-invalid={errors.course ? true : undefined}
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
            aria-invalid={errors.plan ? true : undefined}
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
            aria-invalid={errors.name ? true : undefined}
            maxLength={100}
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
            aria-invalid={errors.email ? true : undefined}
            maxLength={254}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className={inputClasses}
          />
        </FormField>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label="Phone" htmlFor="enroll-phone" required error={errors.phone}>
            <input
              id="enroll-phone"
              maxLength={32}
              type="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              aria-invalid={errors.phone ? true : undefined}
              className={inputClasses}
            />
          </FormField>

          <FormField label="WhatsApp number (optional)" htmlFor="enroll-whatsapp" error={errors.whatsapp}>
            <input
              id="enroll-whatsapp"
              maxLength={32}
              type="tel"
              inputMode="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              aria-invalid={errors.whatsapp ? true : undefined}
              aria-describedby="enroll-whatsapp-hint"
              className={inputClasses}
            />
            <p id="enroll-whatsapp-hint" className="mt-1.5 text-xs text-[var(--text-muted)]">
              Leave empty if it&apos;s the same as your phone.
            </p>
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <FormField label="Country" htmlFor="enroll-country" required error={errors.country}>
            <input
              id="enroll-country"
              maxLength={64}
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              autoComplete="country-name"
              aria-invalid={errors.country ? true : undefined}
              className={inputClasses}
            />
          </FormField>

          <FormField label="Preferred time" htmlFor="enroll-time" required error={errors.preferredTime}>
            <TimePicker
              id="enroll-time"
              value={preferredTime}
              onChange={setPreferredTime}
              invalid={Boolean(errors.preferredTime)}
            />
          </FormField>
        </div>

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
