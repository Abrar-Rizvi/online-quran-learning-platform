import { forwardRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "link" | "inverted";
type ButtonSize = "sm" | "md";

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

type ButtonAsButton = ButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> & {
    href?: undefined;
  };

type ButtonAsLink = ButtonBaseProps &
  Omit<React.ComponentPropsWithoutRef<typeof Link>, keyof ButtonBaseProps> & {
    href: string;
    disabled?: boolean;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--btn-primary-bg)] text-[var(--btn-primary-fg)] hover:bg-[var(--btn-primary-hover)] active:bg-[var(--btn-primary-active)]",
  secondary: [
    "bg-[var(--btn-secondary-bg)] text-[var(--btn-secondary-fg)]",
    "border-[1.5px] border-[var(--btn-secondary-border)]",
    "hover:bg-[var(--btn-secondary-hover)] active:bg-[var(--btn-secondary-active)]",
  ].join(" "),
  ghost:
    "bg-transparent text-[var(--btn-ghost-fg)] hover:bg-[var(--btn-ghost-hover)] active:bg-[var(--btn-ghost-active)]",
  link: "bg-transparent text-[var(--btn-link-fg)] underline underline-offset-4 hover:text-[var(--btn-link-hover-fg)] p-0 h-auto",
  /** Solid white/surface on dark green text — for primary actions on a dark (e.g. green-900) background. */
  inverted:
    "bg-[var(--surface)] text-[var(--green-900)] hover:bg-[var(--green-50)] active:bg-[var(--green-100)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-12 px-6 text-base gap-2",
};

/** Keys to strip when spreading props onto the underlying element. */
const STRIP_KEYS = new Set([
  "variant",
  "size",
  "loading",
  "disabled",
  "className",
  "children",
  "href",
]);

/** Return a new object without STRIP_KEYS entries. */
function getNativeProps(obj: object): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k in obj) {
    if (!STRIP_KEYS.has(k)) out[k] = (obj as Record<string, unknown>)[k];
  }
  return out;
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export const Button = forwardRef<
  HTMLButtonElement | HTMLAnchorElement,
  ButtonProps
>(function Button(props, ref) {
  const {
    variant = "primary",
    size = "md",
    loading = false,
    className,
    children,
    disabled,
  } = props;

  const isLink = "href" in props && props.href !== undefined;
  const isDisabled = disabled || loading;
  const nativeProps = getNativeProps(props);

  const classes = cn(
    "inline-flex items-center justify-center font-medium rounded-[var(--radius-sm)] transition-colors duration-150 cursor-pointer select-none whitespace-nowrap",
    "focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2",
    variantStyles[variant],
    variant !== "link" && sizeStyles[size],
    isDisabled && "pointer-events-none opacity-50",
    className,
  );

  if (isLink) {
    const { href } = props as ButtonAsLink;
    return (
      <Link
        ref={ref as React.Ref<HTMLAnchorElement>}
        href={href}
        className={classes}
        aria-disabled={isDisabled || undefined}
        tabIndex={isDisabled ? -1 : undefined}
        {...nativeProps}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      className={classes}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...nativeProps}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
});
