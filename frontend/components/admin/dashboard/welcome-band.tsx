import { Button, IslamicPattern } from "@/components/ui";
import Link from "next/link";
import { getAdminSummary, getAdminTrialRequests } from "@/lib/admin-data";
import { cn } from "@/lib/utils";
import { PlusIcon } from "../admin-icons";
import { fadeIn } from "./widget";

const bandLink =
  "rounded-[var(--radius-sm)] underline decoration-[var(--gold-300)]/60 underline-offset-4 hover:text-[var(--gold-300)] hover:decoration-[var(--gold-300)] focus-visible:outline-3 focus-visible:outline-[var(--gold-300)] focus-visible:outline-offset-2";

function Count({ n }: { n: number }) {
  return <span className="text-[var(--gold-300)] tabular-nums">{n}</span>;
}

const fromForm = (r: number) => (
  <Link href="/admin/trial-requests" className={bandLink}>
    <Count n={r} /> from the trial form
  </Link>
);
const fromEnrollments = (e: number) => (
  <Link href="/admin/enrollments?status=on_trial" className={bandLink}>
    <Count n={e} /> from enrollments
  </Link>
);

/**
 * Everyone new starts on trial, from either form. T = R (trial requests
 * on_trial) + E (enrollments on_trial). If one source failed, only the part
 * we have is shown (never a guessed total); if both failed, nothing.
 */
function TrialsLine({ requests, enrollments }: { requests: number | null; enrollments: number | null }) {
  if (requests === null && enrollments === null) return null;
  const cls = "mt-4 font-medium text-white";
  if (requests !== null && enrollments !== null) {
    const total = requests + enrollments;
    if (total === 0) return <p className={cls}>No trials in progress.</p>;
    return (
      <p className={cls}>
        <Count n={total} /> {total === 1 ? "trial" : "trials"} in progress: {fromForm(requests)} · {fromEnrollments(enrollments)}
      </p>
    );
  }
  return (
    <p className={cls}>
      Trials in progress: {requests !== null ? fromForm(requests) : fromEnrollments(enrollments as number)}
    </p>
  );
}

/** Greeting + the one number that needs action today (people currently on trial). */
export async function WelcomeBand() {
  const [summary, trialRequests] = await Promise.all([getAdminSummary(), getAdminTrialRequests()]);
  const onTrialRequests = trialRequests.ok ? trialRequests.data.filter((r) => r.status === "on_trial").length : null;

  return (
    <section
      data-tone="dark"
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--green-900)] px-5 py-6 sm:px-8 sm:py-8",
        fadeIn,
      )}
    >
      <IslamicPattern
        className="absolute inset-0"
        color="var(--gold-400)"
        opacity={0.08}
        patternId="khatam-admin-welcome"
        variant="detailed"
      />

      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div>
          {/* Inline: the global unlayered h2 rule would override Tailwind size/color utilities. */}
          <h2 className="m-0" style={{ fontSize: "clamp(1.5rem, 3vw, 1.875rem)", fontWeight: 600, color: "#fff" }}>
            Assalamu alaikum
          </h2>
          <p className="mt-1.5 text-[var(--green-200)]">
            Here&apos;s what&apos;s happening at Adan Online Academy today.
          </p>
          {/* A failed source is left out of the line; the greeting still renders. */}
          <TrialsLine requests={onTrialRequests} enrollments={summary.ok ? summary.data.by_status.on_trial : null} />
        </div>

        {/* The trials line above links to both trial lists and the top bar has "View website". */}
        <div className="xl:shrink-0">
          <Button href="/admin/blog/new" variant="inverted" className="w-full sm:w-auto">
            <PlusIcon className="size-5" />
            New blog post
          </Button>
        </div>
      </div>
    </section>
  );
}
