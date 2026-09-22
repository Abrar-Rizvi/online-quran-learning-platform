import Link from "next/link";
import { Container, Reveal } from "@/components/ui";
import { PricingGrid, type PricingPlan } from "@/components/courses/pricing-card";
import { fetchFees, type FeePlanItem } from "@/lib/api";

function groupPlans(rows: FeePlanItem[]): PricingPlan[] {
  const groups = new Map<number, { fees: string[]; currency: string }>();

  for (const row of rows) {
    let group = groups.get(row.days_per_week);
    if (!group) {
      group = { fees: [], currency: row.currency };
      groups.set(row.days_per_week, group);
    }
    group.fees.push(row.fee);
  }

  const plans: PricingPlan[] = [];
  for (const [daysPerWeek, group] of groups) {
    const counts = new Map<string, number>();
    for (const f of group.fees) {
      counts.set(f, (counts.get(f) ?? 0) + 1);
    }
    let modeFee = group.fees[0];
    let modeCount = 0;
    for (const [f, c] of counts) {
      if (c > modeCount) {
        modeFee = f;
        modeCount = c;
      }
    }
    plans.push({
      daysPerWeek,
      fee: parseFloat(modeFee),
      currency: group.currency,
    });
  }

  return plans;
}

function ArrowRightIcon({ className }: { className?: string }) {
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
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export async function Fees() {
  const rows = await fetchFees();
  const plans = groupPlans(rows);

  if (plans.length === 0) return null;

  const headingId = "fee-heading";

  return (
    <section
      id="fee"
      aria-labelledby={headingId}
      className="scroll-mt-16 nav:scroll-mt-[72px] bg-[var(--bg)] py-16 lg:py-24"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="text-[0.78rem] font-bold uppercase tracking-[0.12em] text-[var(--gold-700)]">
              Fees
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <h2 id={headingId} className="mt-4" style={{ lineHeight: 1.15 }}>
              Simple monthly plans, no registration fee
            </h2>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mx-auto mt-4 max-w-[55ch] text-[1.0625rem] leading-relaxed text-[var(--text-muted)]">
              Every plan includes live one-to-one classes, a dedicated teacher
              and monthly progress reports. Any course, same price.
            </p>
          </Reveal>
        </div>

        <div className="mt-12">
          <PricingGrid plans={plans} />
        </div>

        <Reveal delay={0.18}>
          <p className="mt-8 text-center text-sm leading-relaxed text-[var(--text-muted)] lg:mt-10">
            Fees are billed monthly in US dollars. There is no registration fee.
            Siblings each have their own plan and teacher schedule.{" "}
            <Link
              href="/courses"
              className="group inline-flex items-center gap-1 font-semibold text-[var(--link-color)] transition-colors hover:text-[var(--link-hover-color)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
            >
              See full fee details
              <ArrowRightIcon className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </p>
        </Reveal>
      </Container>
    </section>
  );
}
