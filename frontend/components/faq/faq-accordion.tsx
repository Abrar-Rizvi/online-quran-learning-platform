"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import type { FaqItem } from "@/lib/faq-data";

function ChevronIcon({ className }: { className?: string }) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/** Single-open accordion. Every panel starts closed, so first paint never flashes open content. */
export function FaqAccordion({ items }: { items: readonly FaqItem[] }) {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <ul className="border-t border-[var(--border)]">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        const buttonId = `${baseId}-q-${i}`;
        const panelId = `${baseId}-a-${i}`;

        return (
          <li key={item.question} className="border-b border-[var(--border)]">
            <h3 className="m-0">
              <button
                id={buttonId}
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="flex min-h-14 w-full items-center justify-between gap-4 py-4 text-left text-[1.0625rem] font-semibold text-[var(--green-900)] transition-colors duration-150 hover:text-[var(--green-700)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2 sm:text-lg"
              >
                {item.question}
                <ChevronIcon
                  className={cn(
                    "size-5 shrink-0 text-[var(--green-700)] transition-transform duration-150",
                    isOpen && "rotate-180",
                  )}
                />
              </button>
            </h3>

            {/* grid-rows 0fr -> 1fr animates height without measuring; inert keeps closed answers out of the tab order and a11y tree. */}
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              inert={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="pb-5 pr-9 text-[1.0625rem] leading-[1.65] text-[var(--text-muted)]">
                  {item.answer}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
