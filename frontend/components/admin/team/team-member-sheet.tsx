"use client";

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react";
import { createEditor, updateTeamMember, type TeamErrors, type TeamField } from "@/app/admin/(panel)/team/actions";
import { Button, FormField, inputClasses } from "@/components/ui";
import { cn } from "@/lib/utils";
import { EyeIcon, EyeOffIcon } from "../admin-icons";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";

export type TeamForm =
  | { kind: "add" }
  | { kind: "edit" | "reset"; member: { id: number; name: string } };

const TITLES = { add: "Add editor", edit: "Edit name", reset: "Reset password" };
const SUCCESS = { add: "Editor added.", edit: "Name updated.", reset: "Password reset." };
const FIELDS: readonly TeamField[] = ["name", "email", "password"];
const PASSWORD_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function TeamMemberSheet({
  form,
  onClose,
  onForbidden,
}: {
  form: TeamForm;
  onClose: () => void;
  onForbidden: () => void;
}) {
  const toast = useToast();
  const titleId = useId();
  const ids = { name: `${titleId}-name`, email: `${titleId}-email`, password: `${titleId}-password` };
  const hintId = `${titleId}-hint`;
  const closeSheet = useRef<(() => void) | null>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const focusAfterSave = useRef<TeamField | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<TeamErrors>({});
  const [pending, startTransition] = useTransition();
  const { kind } = form;

  useEffect(() => {
    if (!pending && focusAfterSave.current) {
      document.getElementById(`${titleId}-${focusAfterSave.current}`)?.focus();
      focusAfterSave.current = null;
    }
  }, [pending, titleId]);

  function clearError(field: TeamField) {
    setErrors((current) => ({ ...current, [field]: undefined, form: undefined }));
  }

  function clearPassword() {
    if (passwordInput.current) passwordInput.current.value = "";
    setShowPassword(false);
  }

  function generatePassword() {
    if (!passwordInput.current) return;
    // A byte maps evenly onto the 64-character alphabet.
    const bytes = crypto.getRandomValues(new Uint8Array(20));
    passwordInput.current.value = Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]).join("");
    clearError("password");
    passwordInput.current.focus();
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const password = passwordInput.current?.value ?? "";
    clearPassword();

    const validation: TeamErrors = {};
    if (kind !== "reset" && !name) validation.name = "Enter a name.";
    if (kind === "add" && !email) validation.email = "Enter an email address.";
    if (kind !== "edit" && Array.from(password).length < 10) {
      validation.password = "Use at least 10 characters.";
    }
    if (form.kind === "edit" && name === form.member.name) validation.name = "Enter a different name.";
    const first = FIELDS.find((field) => validation[field]);
    if (first) {
      setErrors(validation);
      document.getElementById(ids[first])?.focus();
      return;
    }

    setErrors({});
    startTransition(async () => {
      const result = form.kind === "add"
        ? await createEditor(name, email, password)
        : form.kind === "edit"
          ? await updateTeamMember(form.member.id, "name", name)
          : await updateTeamMember(form.member.id, "password", password);

      if (result.ok) {
        closeSheet.current?.();
        toast(SUCCESS[kind]);
      } else if (result.status === 403) {
        closeSheet.current?.();
        onForbidden();
      } else if (result.status === 404) {
        closeSheet.current?.();
        toast(result.errors.form ?? "This account no longer exists.", "error");
      } else {
        focusAfterSave.current = FIELDS.find((field) => result.errors[field]) ?? null;
        setErrors(result.errors);
      }
    });
  }

  return (
    <Sheet
      titleId={titleId}
      title={TITLES[kind]}
      closeRef={closeSheet}
      beforeClose={() => !pending}
      onClose={() => {
        clearPassword();
        onClose();
      }}
    >
      <form method="post" onSubmit={submit} noValidate className="flex flex-col gap-5">
        {form.kind !== "add" && <p className="text-sm font-medium text-[var(--text)]">{form.member.name}</p>}
        {kind !== "reset" && (
          <FormField label="Name" htmlFor={ids.name} required error={errors.name}>
            <input
              id={ids.name}
              name="name"
              defaultValue={form.kind === "edit" ? form.member.name : undefined}
              autoComplete="off"
              onChange={() => clearError("name")}
              required
              disabled={pending}
              aria-invalid={!!errors.name}
              className={inputClasses}
            />
          </FormField>
        )}
        {kind === "add" && (
          <FormField label="Email" htmlFor={ids.email} required error={errors.email}>
            <input
              id={ids.email}
              name="email"
              type="email"
              autoComplete="off"
              spellCheck={false}
              onChange={() => clearError("email")}
              required
              disabled={pending}
              aria-invalid={!!errors.email}
              className={inputClasses}
            />
          </FormField>
        )}
        {kind !== "edit" && (
          <FormField label={kind === "add" ? "Temporary password" : "New password"} htmlFor={ids.password} required error={errors.password}>
            <div className="relative">
              <input
                id={ids.password}
                ref={passwordInput}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                autoCapitalize="none"
                spellCheck={false}
                onChange={() => clearError("password")}
                required
                minLength={10}
                disabled={pending}
                aria-invalid={!!errors.password}
                aria-describedby={hintId}
                className={cn(inputClasses, "pr-12")}
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                aria-controls={ids.password}
                className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center rounded-r-[var(--radius-sm)] text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--green-700)] focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--focus-ring-color)]"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            <p id={hintId} className="mt-1.5 text-xs text-[var(--text-muted)]">At least 10 characters</p>
            {kind === "add" && (
              <Button type="button" variant="secondary" size="sm" onClick={generatePassword} disabled={pending} className="mt-3">
                Generate password
              </Button>
            )}
          </FormField>
        )}
        {errors.form && (
          <p role="alert" className="rounded-[var(--radius-sm)] border border-[var(--error)]/25 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)]">
            {errors.form}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => closeSheet.current?.()} disabled={pending}>
            {kind === "add" ? "Close form" : "Keep as is"}
          </Button>
          <Button type="submit" loading={pending}>
            {kind === "edit" ? "Save name" : TITLES[kind]}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
