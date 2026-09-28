import Link from "next/link";
import { getAdminBlogPosts, getAdminConversations, getAdminTrialRequests } from "@/lib/admin-data";
import { ArrowRightIcon, BlogIcon, ConversationsIcon, InboxIcon } from "../admin-icons";
import { WidgetCard, WidgetError } from "./widget";

function CardIcon({ icon: Icon }: { icon: React.ComponentType<{ className?: string }> }) {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-full)] bg-[var(--green-50)] text-[var(--green-700)]">
      <Icon className="size-5" />
    </span>
  );
}

const cardLink =
  "ml-auto inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--green-700)] hover:text-[var(--green-800)] hover:underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2";

export async function TrialRequestsCard() {
  const requests = await getAdminTrialRequests();
  if (!requests.ok) return <WidgetError title="Trial requests" />;

  const onTrial = requests.data.filter((r) => r.status === "on_trial").length;
  const total = requests.data.length;

  return (
    <WidgetCard title="Trial requests">
      <div className="flex flex-1 items-center gap-4">
        <CardIcon icon={InboxIcon} />
        <p className="text-[var(--text)] tabular-nums">
          {total === 0 ? (
            "No requests yet"
          ) : (
            <>
              <span className="font-semibold text-[var(--green-900)]">{onTrial}</span> on trial ·{" "}
              <span className="font-semibold text-[var(--green-900)]">{total}</span> total
            </>
          )}
        </p>
        <Link href="/admin/trial-requests" className={cardLink}>
          Go to Trial requests
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </WidgetCard>
  );
}

export async function BlogCard() {
  const posts = await getAdminBlogPosts();
  if (!posts.ok) return <WidgetError title="Blog" />;

  const published = posts.data.filter((p) => p.status === "published").length;
  const drafts = posts.data.length - published;

  return (
    <WidgetCard title="Blog">
      <div className="flex flex-1 items-center gap-4">
        <CardIcon icon={BlogIcon} />
        <p className="text-[var(--text)] tabular-nums">
          {posts.data.length === 0 ? (
            "No posts yet"
          ) : (
            <>
              <span className="font-semibold text-[var(--green-900)]">{published}</span> published ·{" "}
              <span className="font-semibold text-[var(--green-900)]">{drafts}</span>{" "}
              {drafts === 1 ? "draft" : "drafts"}
            </>
          )}
        </p>
        <Link
          href="/admin/blog"
          className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--green-700)] hover:text-[var(--green-800)] hover:underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
        >
          Go to Blog
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    </WidgetCard>
  );
}

export async function ConversationsCard() {
  const conversations = await getAdminConversations();
  if (!conversations.ok) return <WidgetError title="Chat conversations" />;

  const total = conversations.data.length;

  return (
    <WidgetCard title="Chat conversations">
      <div className="flex flex-1 items-center gap-4">
        <CardIcon icon={ConversationsIcon} />
        {total === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            The admission chatbot isn&apos;t live yet. Conversations will appear here.
          </p>
        ) : (
          <p className="text-[var(--text)] tabular-nums">
            <span className="font-semibold text-[var(--green-900)]">{total}</span>{" "}
            {total === 1 ? "conversation" : "conversations"} in total
          </p>
        )}
      </div>
    </WidgetCard>
  );
}
