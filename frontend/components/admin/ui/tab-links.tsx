import Link from "next/link";
import { cn } from "@/lib/utils";

export interface TabLinkItem {
  label: string;
  href: string;
  count?: number;
  current: boolean;
}

/**
 * Filter tabs implemented as plain links (so every view has a shareable URL).
 * The row scrolls horizontally inside its own box on narrow screens.
 */
export function TabLinks({ label, items }: { label: string; items: TabLinkItem[] }) {
  return (
    <nav aria-label={label} className="-mx-1 overflow-x-auto px-1 py-1">
      <ul className="flex w-max gap-1.5">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              scroll={false}
              aria-current={item.current ? "page" : undefined}
              className={cn(
                "flex h-11 items-center gap-2 whitespace-nowrap rounded-[var(--radius-sm)] px-3.5 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none",
                "focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2",
                item.current
                  ? "bg-[var(--green-100)] text-[var(--green-800)]"
                  : "text-[var(--text-muted)] hover:bg-[var(--green-50)] hover:text-[var(--green-800)]",
              )}
            >
              {item.label}
              {item.count !== undefined && (
                <span
                  className={cn(
                    "min-w-6 rounded-[var(--radius-full)] px-1.5 py-0.5 text-center text-xs font-semibold tabular-nums",
                    item.current ? "bg-[var(--surface)] text-[var(--green-800)]" : "bg-[var(--surface-alt)] text-[var(--text-muted)]",
                  )}
                >
                  {item.count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
