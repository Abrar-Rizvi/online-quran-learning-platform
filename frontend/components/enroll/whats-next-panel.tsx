import { Button } from "@/components/ui";
import { getContactConfig, WHATSAPP_FALLBACK_URL } from "@/lib/site-config";

/**
 * Draft copy — mirrors the homepage's "How it Works" flow; confirm final wording with the academy.
 * Exported so the enrollment confirmation page can reuse the exact same post-submission copy
 * (steps 2–3) instead of inventing new wording.
 */
export const ENROLLMENT_NEXT_STEPS = [
  "You submit this form and choose your plan.",
  "Our team reaches out to confirm your teacher and trial time.",
  "You receive a class link for your live session.",
  "After the trial, continue with your chosen plan.",
] as const;

function MessageCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.3 1.1 4.4 2.9 5.9L4 21l4-1.8c1.2.5 2.6.8 4 .8 5.5 0 10-3.8 10-8.5S17.5 3 12 3Z" />
    </svg>
  );
}

export function WhatsNextPanel() {
  const whatsappUrl = getContactConfig().whatsappUrl ?? WHATSAPP_FALLBACK_URL;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
      <h2
        className="text-xl font-bold text-[var(--green-900)]"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        What happens next
      </h2>

      <ol className="mt-6 flex flex-col gap-5">
        {ENROLLMENT_NEXT_STEPS.map((step, i) => (
          <li key={step} className="flex items-start gap-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--green-100)] text-sm font-bold text-[var(--green-800)]">
              {i + 1}
            </span>
            <p className="pt-0.5 text-sm leading-relaxed text-[var(--text)]">{step}</p>
          </li>
        ))}
      </ol>

      <hr className="my-6 border-[var(--border)]" />

      <p className="text-sm text-[var(--text-muted)]">Prefer to talk first?</p>
      <Button
        href={whatsappUrl}
        variant="primary"
        size="md"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 w-full gap-2 sm:w-auto"
      >
        <MessageCircleIcon className="size-4" />
        Chat on WhatsApp
      </Button>
    </div>
  );
}
