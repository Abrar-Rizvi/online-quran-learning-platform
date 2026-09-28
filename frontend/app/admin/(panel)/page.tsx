import { Suspense } from "react";
import type { Metadata } from "next";
import { KpiRow, KpiRowSkeleton } from "@/components/admin/dashboard/kpi-row";
import { PopularCourses } from "@/components/admin/dashboard/popular-courses";
import { RecentEnrollments } from "@/components/admin/dashboard/recent-enrollments";
import { BlogCard, ConversationsCard, TrialRequestsCard } from "@/components/admin/dashboard/small-cards";
import { StatusBreakdown } from "@/components/admin/dashboard/status-breakdown";
import { WeeklyEnrollments } from "@/components/admin/dashboard/weekly-enrollments";
import { WelcomeBand } from "@/components/admin/dashboard/welcome-band";
import { WidgetSkeleton } from "@/components/admin/dashboard/widget";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Each widget is its own async Server Component behind its own Suspense
 * boundary: they fetch in parallel (memoized per request, see lib/admin-data)
 * and a failing endpoint only affects its own card.
 */
export default function AdminDashboardPage() {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 lg:gap-8">
      <Suspense fallback={<WidgetSkeleton className="rounded-[var(--radius-xl)]" bodyClassName="h-16" />}>
        <WelcomeBand />
      </Suspense>

      <Suspense fallback={<KpiRowSkeleton />}>
        <KpiRow />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="flex flex-col lg:col-span-2">
          <Suspense fallback={<WidgetSkeleton bodyClassName="h-56" />}>
            <WeeklyEnrollments />
          </Suspense>
        </div>
        <div className="flex flex-col">
          <Suspense fallback={<WidgetSkeleton bodyClassName="h-56" />}>
            <StatusBreakdown />
          </Suspense>
        </div>
      </div>

      {/* xl, not lg: at 1024px a 2/3 column is too narrow for the table's five columns. */}
      <div className="grid gap-6 lg:gap-8 xl:grid-cols-3">
        <div className="flex flex-col xl:col-span-2">
          <Suspense fallback={<WidgetSkeleton bodyClassName="h-72" />}>
            <RecentEnrollments />
          </Suspense>
        </div>
        {/* Top-aligned: sizes to its own content instead of stretching to the table's height. */}
        <div className="flex flex-col xl:self-start">
          <Suspense fallback={<WidgetSkeleton bodyClassName="h-72" />}>
            <PopularCourses />
          </Suspense>
        </div>
      </div>

      <div className="grid gap-6 lg:gap-8 xl:grid-cols-3">
        <Suspense fallback={<WidgetSkeleton bodyClassName="h-12" />}>
          <TrialRequestsCard />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton bodyClassName="h-12" />}>
          <BlogCard />
        </Suspense>
        <Suspense fallback={<WidgetSkeleton bodyClassName="h-12" />}>
          <ConversationsCard />
        </Suspense>
      </div>
    </div>
  );
}
