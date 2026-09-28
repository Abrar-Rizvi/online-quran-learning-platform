"use server";

import { redirect } from "next/navigation";
import { requestAdminToken } from "@/lib/admin-api";
import { ADMIN_LOGIN_PATH, sanitizeAdminNext } from "@/lib/admin-auth";
import { clearAdminToken, setAdminToken } from "@/lib/admin-session";

export type LoginState = { error: string | null };

const LOGIN_ERRORS = {
  missing: "Please enter your username and password.",
  invalid: "Incorrect username or password.",
  not_configured: "Admin sign-in isn't configured on the server yet.",
  unavailable: "Couldn't reach the server. Please try again.",
} as const;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Re-validated here: the hidden field is user-controlled.
  const next = sanitizeAdminNext(formData.get("next"));

  if (!username || !password) {
    return { error: LOGIN_ERRORS.missing };
  }

  const result = await requestAdminToken(username, password);
  if (!result.ok) {
    if (result.reason === "rate_limited") {
      return { error: `Too many attempts. Try again in ${result.minutes} ${result.minutes === 1 ? "minute" : "minutes"}.` };
    }
    return { error: LOGIN_ERRORS[result.reason] };
  }

  await setAdminToken(result.token);
  redirect(next);
}

export async function logout(): Promise<void> {
  await clearAdminToken();
  redirect(ADMIN_LOGIN_PATH);
}
