import { Button, Reveal } from "@/components/ui";
import {
  classesPerMonth,
  getPlanCopy,
  getPlanCtaLabel,
  getScheduleLabel,
} from "@/lib/courses";
import { cn } from "@/lib/utils";

const BASE_FEATURES = [
  "One-to-one live classes",
  "Dedicated teacher",
  "Monthly progress report",
  "Male or female teacher",
] as const;

export function formatPrice(
  fee: number,
  currency: string,
): { amount: string; symbol: string } {
  const amount = fee % 1 === 0 ? String(fee) : fee.toFixed(2);
  const symbol = currency === "USD" ? "$" : "";
  if (currency !== "USD") {
    return { amount: `${amount} ${currency}`, symbol: "" };
  }
  return { amount, symbol };
}

export function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "size-5 shrink-0 text-[var(--green-500)]"}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

/** Filled green circle with a white tick, for the "What's Included" rows. */
function FeatureCheck() {
  return (
    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--green-700)] text-white">
      <svg
        className="size-3"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="m5 12 5 5 9-10" />
      </svg>
    </span>
  );
}

export interface PricingPlan {
  daysPerWeek: number;
  fee: number;
  currency: string;
}

interface PricingCardProps extends PricingPlan {
  featured?: boolean;
  /** When given, the enroll CTA pre-selects this course too (/enroll?course=slug&plan=N). */
  courseSlug?: string;
}

export function PricingCard({
  daysPerWeek,
  fee,
  currency,
  featured = false,
  courseSlug,
}: PricingCardProps) {
  const price = formatPrice(fee, currency);
  const copy = getPlanCopy(daysPerWeek);
  const features = [
    `${classesPerMonth(daysPerWeek)} classes a month`,
    ...BASE_FEATURES,
    ...(featured ? ["Fastest progress"] : []),
  ];
  const enrollHref = courseSlug
    ? `/enroll?course=${courseSlug}&plan=${daysPerWeek}`
    : `/enroll?plan=${daysPerWeek}`;

  return (
    <article
      className={cn(
        "relative flex w-full flex-col rounded-[var(--radius-lg)] bg-[var(--surface)] transition-[translate,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]",
        featured
          ? "border-2 border-[var(--green-700)] shadow-[var(--shadow-card-hover)]"
          : "border border-[var(--border)]",
      )}
    >
      {featured && (
        <span className="absolute -top-3 right-4 rounded-[var(--radius-full)] bg-[var(--gold-500)] px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.1em] text-[var(--green-950)]">
          Best Progress
        </span>
      )}

      <div
        className={cn(
          "rounded-t-[calc(var(--radius-lg)-2px)] px-6 py-5",
          featured
            ? "bg-[var(--green-900)] text-white"
            : "bg-[var(--green-50)] text-[var(--green-900)]",
        )}
      >
        <h3
          className={cn("text-xl font-bold", featured ? "text-white!" : "text-[var(--green-900)]")}
          style={{ fontFamily: "var(--font-heading)" }}
        >
          {copy.name}
        </h3>
        {copy.subtitle && (
          <p className={cn("mt-1 text-sm", featured ? "text-[var(--green-100)]" : "text-[var(--text-muted)]")}>
            {copy.subtitle}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <p className="text-sm text-[var(--text-muted)]">
          {getScheduleLabel(daysPerWeek)} · 30 minutes a class
        </p>

        <p className="mt-4 flex items-baseline gap-1.5">
          <span
            className="text-[2.75rem] font-bold text-[var(--green-900)]"
            style={{ fontFamily: "var(--font-heading)", lineHeight: 1 }}
          >
            {price.symbol}
            {price.amount}
          </span>
          <span className="text-sm font-medium text-[var(--text-muted)]">/ Per Month</span>
        </p>

        {copy.description && (
          <p className="mt-4 text-sm leading-relaxed text-[var(--text-muted)]">
            {copy.description}
          </p>
        )}

        <p className="mt-6 text-[0.78rem] font-bold uppercase tracking-[0.12em] text-[var(--green-800)]">
          What&apos;s Included
        </p>
        <ul className="mt-2 divide-y divide-[var(--border)]">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-3 py-2.5 text-sm">
              <FeatureCheck />
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-6">
          <Button
            href={enrollHref}
            variant={featured ? "primary" : "secondary"}
            size="md"
            className="w-full"
          >
            {getPlanCtaLabel(daysPerWeek)}
          </Button>
        </div>
      </div>
    </article>
  );
}

const GRID_COLUMNS: Record<number, string> = {
  1: "max-w-sm grid-cols-1",
  2: "max-w-3xl grid-cols-1 sm:grid-cols-2",
};
const GRID_COLUMNS_MANY = "max-w-5xl grid-cols-1 md:grid-cols-3";

/**
 * Shared layout for the homepage Fees section and the course detail page.
 * Renders whatever plans it's given (1, 2 or 3+), sorted ascending by days_per_week;
 * the plan with the highest days_per_week is the featured one.
 */
export function PricingGrid({
  plans,
  courseSlug,
}: {
  plans: PricingPlan[];
  courseSlug?: string;
}) {
  const sorted = [...plans].sort((a, b) => a.daysPerWeek - b.daysPerWeek);
  const featuredDays = sorted.length > 0 ? sorted[sorted.length - 1].daysPerWeek : null;

  return (
    <div
      className={cn(
        "mx-auto grid items-stretch gap-6 md:gap-5 lg:gap-8",
        GRID_COLUMNS[sorted.length] ?? GRID_COLUMNS_MANY,
      )}
    >
      {sorted.map((plan, i) => {
        const featured = plan.daysPerWeek === featuredDays;
        return (
          <Reveal
            key={plan.daysPerWeek}
            staggerIndex={i}
            // Featured card is slightly taller on desktop only; stacked cards stay flush on mobile/tablet.
            className={cn("flex", featured && sorted.length > 1 && "lg:-my-3")}
          >
            <PricingCard {...plan} featured={featured} courseSlug={courseSlug} />
          </Reveal>
        );
      })}
    </div>
  );
}
