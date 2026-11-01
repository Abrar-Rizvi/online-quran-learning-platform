"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";

const loadPanel = () => import("./chat-panel");
/** The panel (and react-markdown with it) is only downloaded when the visitor first opens the chat. */
const ChatPanel = dynamic(loadPanel, { ssr: false });

/** Same id as CHAT_PANEL_ID in chat-panel.tsx (not imported, so this file stays out of the panel chunk). */
const PANEL_ID = "admissions-chat";

function ChatIcon() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

/** Floating admissions-chat button on every public page (mounted in app/(site)/layout.tsx). */
export function ChatLauncher() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Focus returns to the launcher whenever the panel closes.
  useEffect(() => {
    if (wasOpen.current && !open) buttonRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setLoaded(true);
          setOpen((v) => !v);
        }}
        onPointerEnter={() => void loadPanel()}
        onFocus={() => void loadPanel()}
        aria-label={open ? "Close admissions chat" : "Open admissions chat"}
        aria-expanded={open}
        aria-controls={PANEL_ID}
        className={cn(
          // z-30: under the mobile menu (z-40) and the chat panel (z-60).
          "fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-full sm:right-6 sm:bottom-6",
          "bg-[var(--green-700)] text-white shadow-[var(--shadow-floating),0_4px_12px_rgb(8_53_42/0.25)] transition-colors hover:bg-[var(--green-800)]",
          "focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-3",
        )}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>

      {loaded && <ChatPanel open={open} onClose={() => setOpen(false)} />}
    </>
  );
}
