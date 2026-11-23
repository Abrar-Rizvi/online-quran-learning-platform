"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui";

export function ReadMore({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded(!expanded)}
        className="mt-5 motion-reduce:transition-none"
      >
        {expanded ? "Read less" : "Read more"}
      </Button>
      <div id={id} hidden={!expanded} className="mt-5">
        {children}
      </div>
    </>
  );
}
