import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: "div" | "section" | "article" | "main";
}

export function Container({
  as: Tag = "div",
  className,
  children,
  ...rest
}: ContainerProps) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full max-w-[var(--container-max)] px-[var(--container-px)]",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
