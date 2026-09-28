"use client";

import { useState } from "react";
import { Button, FormField, inputClasses } from "@/components/ui";
import { createTrialRequest } from "@/lib/api";
import { COUNTRIES } from "@/lib/countries";
import { countryError, emailError, nameError, phoneError } from "@/lib/form-rules";
import { cn } from "@/lib/utils";

interface FieldErrors {
  name?: string;
  email?: string;
  whatsapp?: string;
  country?: string;
}

interface TrialRequestFormProps {
  /** Card heading; pass null where the page's own h1 already says it (/book-free-trial). */
  heading?: string | null;
  subtext?: string;
  submitLabel?: string;
  successHeading?: string;
  successMessage?: string;
  /** "stacked" (default, /book-free-trial's original single-column layout) or "grid" (2-column field pairs on desktop). */
  layout?: "stacked" | "grid";
  /** Extra classes merged onto the form/success card's root (e.g. an elevated shadow for a floating placement). */
  className?: string;
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

export function TrialRequestForm({
  heading = "Book your free trial",
  subtext = "Free trial class — no card needed.",
  submitLabel = "Book free trial",
  successHeading = "Request received",
  successMessage = "Thanks! We'll reach out on WhatsApp shortly to schedule your free trial.",
  layout = "stacked",
  className,
}: TrialRequestFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [country, setCountry] = useState("");

  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitStatus, setSubmitStatus] = useState<"idle" | "submitting" | "success" | "error">(
    "idle",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): FieldErrors {
    // Same rules as the backend (lib/form-rules.ts), shown under each field.
    const next: FieldErrors = {};
    const rules: [keyof FieldErrors, string | null][] = [
      ["name", nameError(name)],
      ["email", emailError(email)],
      ["whatsapp", phoneError(whatsapp, "WhatsApp number", "Please enter your WhatsApp number.")],
      ["country", countryError(country, "Please select your country.")],
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

    const result = await createTrialRequest({
      name: name.trim(),
      email: email.trim(),
      whatsapp: whatsapp.trim(),
      country,
    });

    if (result.ok) {
      setSubmitStatus("success");
      return;
    }
    // Server-side field errors go under their fields; a form-level message only when none can be placed.
    const fromServer: FieldErrors = {};
    for (const [apiField, message] of Object.entries(result.fieldErrors ?? {})) {
      if (apiField === "name" || apiField === "email" || apiField === "whatsapp" || apiField === "country") {
        fromServer[apiField] = message;
      }
    }
    setSubmitStatus("error");
    if (Object.keys(fromServer).length > 0) {
      setErrors(fromServer);
      setSubmitError(null);
    } else {
      setSubmitError(result.message);
    }
  }

  if (submitStatus === "success") {
    return (
      <div className={cn("rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8", className)}>
        <div
          className="flex flex-col items-center gap-3 py-6 text-center"
          role="status"
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-[var(--green-100)] text-[var(--green-800)]">
            <CheckIcon className="size-6" />
          </span>
          <h2
            className="text-xl font-bold text-[var(--green-900)]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            {successHeading}
          </h2>
          <p className="max-w-[40ch] text-sm leading-relaxed text-[var(--text-muted)]">
            {successMessage}
          </p>
        </div>
      </div>
    );
  }

  const isSubmitting = submitStatus === "submitting";
  const isGrid = layout === "grid";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8", className)}
    >
      {heading && (
        <h2
          className="text-xl font-bold text-[var(--green-900)]"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {heading}
        </h2>
      )}
      <p className={cn("text-sm text-[var(--text-muted)]", heading && "mt-1.5")}>{subtext}</p>

      <div className="mt-6 flex flex-col gap-5">
        <div className={isGrid ? "grid grid-cols-1 gap-5 sm:grid-cols-2" : "flex flex-col gap-5"}>
          <FormField label="Full name" htmlFor="trial-name" required error={errors.name}>
            <input
              id="trial-name"
              aria-invalid={errors.name ? true : undefined}
              maxLength={100}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              disabled={isSubmitting}
              className={inputClasses}
            />
          </FormField>

          <FormField label="Email" htmlFor="trial-email" required error={errors.email}>
            <input
              id="trial-email"
              aria-invalid={errors.email ? true : undefined}
              maxLength={254}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={isSubmitting}
              className={inputClasses}
            />
          </FormField>
        </div>

        <div className={isGrid ? "grid grid-cols-1 gap-5 sm:grid-cols-2" : "flex flex-col gap-5"}>
          <FormField label="WhatsApp Number" htmlFor="trial-whatsapp" required error={errors.whatsapp}>
            <input
              id="trial-whatsapp"
              aria-invalid={errors.whatsapp ? true : undefined}
              maxLength={32}
              type="tel"
              inputMode="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              autoComplete="tel"
              placeholder="e.g. +1 555 010 2030"
              disabled={isSubmitting}
              className={inputClasses}
            />
          </FormField>

          <FormField label="Country" htmlFor="trial-country" required error={errors.country}>
            <select
              id="trial-country"
              aria-invalid={errors.country ? true : undefined}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              autoComplete="country-name"
              disabled={isSubmitting}
              className={cn(inputClasses, "appearance-none")}
            >
              <option value="">Select your country</option>
              {COUNTRIES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
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
          {isSubmitting ? "Submitting…" : submitStatus === "error" ? "Try again" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
