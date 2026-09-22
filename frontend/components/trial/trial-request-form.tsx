"use client";

import { useState } from "react";
import { Button, FormField, inputClasses } from "@/components/ui";
import { createTrialRequest } from "@/lib/api";

interface FieldErrors {
  name?: string;
  email?: string;
  whatsapp?: string;
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

export function TrialRequestForm() {
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
    const next: FieldErrors = {};
    if (!name.trim()) next.name = "Please enter your name.";
    if (!email.trim()) {
      next.email = "Please enter your email.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      next.email = "Please enter a valid email address.";
    }
    if (!whatsapp.trim()) next.whatsapp = "Please enter your WhatsApp number.";
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
      country: country.trim() || undefined,
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
            Request received
          </h2>
          <p className="max-w-[40ch] text-sm leading-relaxed text-[var(--text-muted)]">
            Thanks! We&apos;ll reach out on WhatsApp shortly to schedule your free trial.
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
        Book your free trial
      </h2>
      <p className="mt-1.5 text-sm text-[var(--text-muted)]">Free trial class — no card needed.</p>

      <div className="mt-6 flex flex-col gap-5">
        <FormField label="Full name" htmlFor="trial-name" required error={errors.name}>
          <input
            id="trial-name"
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
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={isSubmitting}
            className={inputClasses}
          />
        </FormField>

        <FormField label="WhatsApp Number" htmlFor="trial-whatsapp" required error={errors.whatsapp}>
          <input
            id="trial-whatsapp"
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            autoComplete="tel"
            placeholder="e.g. +1 555 010 2030"
            disabled={isSubmitting}
            className={inputClasses}
          />
        </FormField>

        <FormField label="Country" htmlFor="trial-country">
          <input
            id="trial-country"
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            autoComplete="country-name"
            disabled={isSubmitting}
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
          {isSubmitting ? "Submitting…" : submitStatus === "error" ? "Try again" : "Book free trial"}
        </Button>
      </div>
    </form>
  );
}
