import type { Metadata } from "next";
import { Logo } from "@/components/layout/logo";
import { LoginForm } from "@/components/admin/login-form";
import { sanitizeAdminNext } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { next, reason } = await searchParams;

  return (
    <main id="main-content" className="flex flex-1 items-center justify-center px-4 py-12 sm:py-16">
      <div className="w-full max-w-sm rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
        <div className="flex justify-center">
          <Logo />
        </div>

        {/* Inline: the global unlayered h1 rule would override Tailwind size utilities. */}
        <h1
          className="mt-6 text-center"
          style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--green-900)" }}
        >
          Admin sign in
        </h1>

        <LoginForm
          next={sanitizeAdminNext(typeof next === "string" ? next : undefined)}
          expired={reason === "expired"}
        />
      </div>
    </main>
  );
}
