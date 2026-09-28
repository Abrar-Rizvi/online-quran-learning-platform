import { Button, Reveal } from "@/components/ui";
import { MailIcon, WhatsAppIcon } from "@/components/layout/footer-icons";
import {
  ACADEMY_WHATSAPP_NUMBER,
  ACADEMY_WHATSAPP_URL,
  contactEmails,
  FREE_TRIAL_DAYS,
} from "@/lib/site-config";

/** Same hover lift used elsewhere on cards (course-card.tsx, pricing-card.tsx): 2px rise + soft shadow, 150ms. */
const hoverLiftClasses =
  "transition-[translate,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]";

function BookOpenIcon({ className }: { className?: string }) {
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
      <path d="M12 6.5c-1.6-1-3.6-1.5-5.5-1.5A2.5 2.5 0 0 0 4 7.5v10A2.5 2.5 0 0 1 6.5 16c1.9 0 3.9.5 5.5 1.5" />
      <path d="M12 6.5c1.6-1 3.6-1.5 5.5-1.5A2.5 2.5 0 0 1 20 7.5v10a2.5 2.5 0 0 0-2.5-1.5c-1.9 0-3.9.5-5.5 1.5" />
      <path d="M12 6.5v11" />
    </svg>
  );
}

/** Shared hover/focus treatment for the contact links: green-700 + underline over 150ms, visible focus ring. */
const contactLinkClasses =
  "rounded-[var(--radius-sm)] break-words text-[var(--text-muted)] underline-offset-2 transition-colors duration-150 hover:text-[var(--green-700)] hover:underline focus-visible:text-[var(--green-700)] focus-visible:underline focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2";

const contactLabelClasses =
  "block text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-[var(--text)]";

/** One icon per group, nudged so its center sits on the first label line. */
const groupIconClasses = "-mt-0.5 size-6 shrink-0 text-[var(--green-700)]";

export function ContactInfo() {
  return (
    <div className="flex flex-col">
      <Reveal>
        <p className="text-[0.78rem] font-bold uppercase tracking-[0.12em] text-[var(--gold-700)]">
          Contact
        </p>
      </Reveal>

      <Reveal delay={0.06}>
        <h2 className="mt-2" style={{ lineHeight: 1.15 }}>
          Send Us Email
        </h2>
      </Reveal>

      <Reveal delay={0.12} className="mt-6 flex gap-4">
        <MailIcon className={groupIconClasses} />
        <ul className="flex min-w-0 flex-col gap-4">
          {contactEmails.map((item) => (
            <li key={item.email}>
              <span className={contactLabelClasses}>{item.label}</span>
              <a href={`mailto:${item.email}`} className={`mt-0.5 inline-block ${contactLinkClasses}`}>
                {item.email}
              </a>
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal delay={0.18} className="mt-8 flex gap-4">
        <WhatsAppIcon className={groupIconClasses} />
        <div className="min-w-0">
          <span className={contactLabelClasses}>Send Us a Message</span>
          <a
            href={ACADEMY_WHATSAPP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Send us a message on WhatsApp: ${ACADEMY_WHATSAPP_NUMBER}`}
            className={`mt-0.5 inline-block ${contactLinkClasses}`}
          >
            {ACADEMY_WHATSAPP_NUMBER}
          </a>
        </div>
      </Reveal>

      <Reveal delay={0.24} className="mt-8">
        <div
          className={`rounded-[var(--radius-lg)] border border-[var(--green-100)] bg-[var(--green-50)] p-6 sm:p-8 ${hoverLiftClasses}`}
        >
          <BookOpenIcon className="size-8 text-[var(--green-700)]" />
          <h3
            className="mt-4 text-xl font-bold text-[var(--green-900)] sm:text-[1.375rem]"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            Start Your {FREE_TRIAL_DAYS}-Day Free Trial Today!
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            Experience the best way to learn Quran from the comfort of your home.
          </p>
          <Button href="/book-free-trial" variant="primary" size="md" className="group mt-5 gap-2">
            Claim Free Trial
            <ArrowRightIcon className="size-4 transition-transform duration-150 group-hover:translate-x-1" />
          </Button>
        </div>
      </Reveal>
    </div>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
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
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
