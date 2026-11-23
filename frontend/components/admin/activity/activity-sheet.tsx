"use client";

import { useId, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "../ui/sheet";

export function ActivitySheet({
  id,
  closeHref,
  children,
}: {
  id: number;
  closeHref: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const titleId = useId();

  function close() {
    router.replace(closeHref, { scroll: false });
    requestAnimationFrame(() => {
      const trigger = Array.from(document.querySelectorAll<HTMLElement>(`[data-view-trigger="${id}"]`))
        .find((link) => link.offsetParent !== null);
      (trigger ?? document.getElementById("activity-heading"))?.focus();
    });
  }

  return <Sheet titleId={titleId} title="Activity details" onClose={close}>{children}</Sheet>;
}
