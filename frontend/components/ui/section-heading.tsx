import { cn } from "@/lib/utils";

type HeadingLevel = "h1" | "h2" | "h3" | "h4";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  level?: HeadingLevel;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  level: Tag = "h2",
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "mb-12",
        align === "center" && "mx-auto max-w-2xl text-center",
        className,
      )}
    >
      {eyebrow && (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-[var(--eyebrow-color)]">
          {eyebrow}
        </p>
      )}
      <Tag>{title}</Tag>
      {description && (
        <p className="mt-4 text-[var(--body-muted-color)] leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}
