import { cn } from "@/lib/utils";

type BadgeVariant = "neutral" | "green" | "gold";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  neutral:
    "bg-[var(--surface-alt)] text-[var(--text-muted)] border-[var(--border)]",
  green:
    "bg-[var(--green-50)] text-[var(--green-800)] border-[var(--green-200)]",
  gold:
    "bg-[var(--gold-50)] text-[var(--gold-700)] border-[var(--gold-300)]",
};

export function Badge({
  variant = "neutral",
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border px-3 py-1 text-xs font-medium",
        variantStyles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
