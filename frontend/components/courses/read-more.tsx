"use client";

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Button, Container } from "@/components/ui";
import { cn } from "@/lib/utils";

export function ReadMore({
  image,
  children,
  extra,
}: {
  image: ReactNode;
  children: ReactNode;
  extra?: ReactNode;
}) {
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const id = useId();
  const heroRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement | HTMLAnchorElement>(null);

  useLayoutEffect(() => {
    if (expanded === null) return;
    toggleRef.current?.focus({ preventScroll: true });
    if (!expanded) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      heroRef.current?.scrollIntoView({
        block: "start",
        behavior: reducedMotion ? "instant" : "smooth",
      });
    }
  }, [expanded]);

  const toggle = extra && (
    <Button
      ref={toggleRef}
      type="button"
      variant="secondary"
      aria-expanded={expanded === true}
      aria-controls={id}
      onClick={() => setExpanded(!expanded)}
      className="motion-reduce:transition-none [&:not(:first-child)]:mt-5 [@media(scripting:none)]:hidden"
    >
      {expanded ? "Read less" : "Read more"}
    </Button>
  );

  return (
    // Include the sticky navbar's bottom border at both header sizes.
    <section ref={heroRef} className="scroll-mt-[calc(4rem+1px)] bg-[var(--bg)] py-16 lg:py-24 nav:scroll-mt-[73px]">
      <Container>
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {image}
          <div
            className={cn(
              "min-w-0 lg:order-1",
              // Reserve the button's desktop space so centering the image cannot move it on expand.
              expanded && "lg:after:block lg:after:h-12 lg:[&:not(:empty)]:after:mt-5",
            )}
          >
            {children}
            {!expanded && toggle}
          </div>
        </div>
        {extra && (
          <div
            id={id}
            inert={!expanded}
            aria-hidden={!expanded}
            className={cn(
              "-mx-2 grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
              expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="px-2 pt-5 pb-2">
                {extra}
                {expanded && toggle}
              </div>
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
