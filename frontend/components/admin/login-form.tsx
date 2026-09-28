"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "@/app/admin/actions";
import { Button, FormField, inputClasses } from "@/components/ui";
import { cn } from "@/lib/utils";
import { EyeIcon, EyeOffIcon } from "./admin-icons";

const INITIAL_STATE: LoginState = { error: null };

export function LoginForm({ next, expired }: { next: string; expired: boolean }) {
  const [state, formAction, pending] = useActionState(login, INITIAL_STATE);
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // The expiry notice only makes sense until the admin tries again.
  const notice = state.error ? null : expired ? "Your session has expired. Please sign in again." : null;

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-5">
      <input type="hidden" name="next" value={next} />

      <div aria-live="polite" aria-atomic="true">
        {state.error && (
          <p className="rounded-[var(--radius-sm)] border border-[var(--error)]/25 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)]">
            {state.error}
          </p>
        )}
        {notice && (
          <p className="rounded-[var(--radius-sm)] border border-[var(--info)]/25 bg-[var(--info-bg)] px-4 py-3 text-sm text-[var(--info)]">
            {notice}
          </p>
        )}
      </div>

      <FormField label="Username" htmlFor="admin-username" required>
        <input
          id="admin-username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          required
          disabled={pending}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          aria-invalid={state.error ? true : undefined}
          className={inputClasses}
        />
      </FormField>

      <FormField label="Password" htmlFor="admin-password" required>
        <div className="relative">
          <input
            id="admin-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            disabled={pending}
            aria-invalid={state.error ? true : undefined}
            className={cn(inputClasses, "pr-12")}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            aria-controls="admin-password"
            className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center rounded-r-[var(--radius-sm)] text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--green-700)] focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--focus-ring-color)]"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </FormField>

      <Button type="submit" loading={pending} className="w-full">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
