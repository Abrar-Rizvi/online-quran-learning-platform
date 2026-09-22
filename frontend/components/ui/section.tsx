import { cn } from "@/lib/utils";
import { Container } from "./container";

type SectionTone = "default" | "alt" | "dark";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  tone?: SectionTone;
}

const toneStyles: Record<SectionTone, string> = {
  default: "bg-[var(--bg)] text-[var(--text)]",
  alt: "bg-[var(--surface-alt)] text-[var(--text)]",
  dark: "bg-[var(--green-900)] text-[var(--green-50)]",
};

export function Section({
  tone = "default",
  className,
  children,
  ...rest
}: SectionProps) {
  return (
    <section
      className={cn(toneStyles[tone], "py-16 md:py-24", className)}
      data-tone={tone !== "default" ? tone : undefined}
      {...rest}
    >
      <Container>{children}</Container>
    </section>
  );
}
