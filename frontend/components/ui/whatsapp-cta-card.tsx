import { Button } from "./button";
import { getContactConfig, WHATSAPP_FALLBACK_URL } from "@/lib/site-config";

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

interface WhatsAppCtaCardProps {
  heading: string;
  description: string;
  buttonLabel: string;
}

/**
 * Surface card with a heading + subtext on the left and a pill WhatsApp button on the right
 * (stacked on mobile). Same card treatment as the Enrollment "What happens next" panel.
 */
export function WhatsAppCtaCard({ heading, description, buttonLabel }: WhatsAppCtaCardProps) {
  const whatsappUrl = getContactConfig().whatsappUrl ?? WHATSAPP_FALLBACK_URL;

  return (
    <div className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-8">
      <div>
        {/* Inline: the global unlayered h3 rule would override Tailwind color/size utilities. */}
        <h3
          className="m-0"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "1.375rem",
            fontWeight: 600,
            lineHeight: 1.25,
            color: "var(--green-900)",
          }}
        >
          {heading}
        </h3>
        <p className="mt-1.5 text-[0.9375rem] text-[var(--text-muted)]">{description}</p>
      </div>

      <Button
        href={whatsappUrl}
        variant="primary"
        size="md"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full shrink-0 rounded-[var(--radius-full)]! sm:w-auto"
      >
        <MessageCircleIcon className="size-5" />
        {buttonLabel}
      </Button>
    </div>
  );
}
