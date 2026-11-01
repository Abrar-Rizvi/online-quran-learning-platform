"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion, type Transition } from "framer-motion";
import { Button } from "@/components/ui";
import { CHAT_MAX_LENGTH, detectReplyActions, type ChatErrorKind } from "@/lib/chat";
import { duration, easing } from "@/lib/motion";
import { ACADEMY_WHATSAPP_URL } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { ChatReply } from "./chat-reply";
import { useChatSession, type ChatEntry } from "./use-chat-session";

export const CHAT_PANEL_ID = "admissions-chat";
const TITLE_ID = "admissions-chat-title";

/** Client-side UI copy only: never sent to the backend. */
const WELCOME =
  "Assalamu alaikum! I'm the Adan admissions assistant. Ask me about courses, fees, or the free trial — in English, Urdu or Roman Urdu.";
const SUGGESTIONS = [
  "What courses do you offer?",
  "How much are the fees?",
  "How does the free trial work?",
  "Kya female teachers hain?",
];

const ERROR_TEXT: Record<ChatErrorKind, string> = {
  invalid: "Please type a message.",
  "not-found": "Our assistant is unavailable right now.",
  unavailable: "Our assistant is unavailable right now.",
  busy: "Our assistant is busy right now. Please try again in a moment.",
  network: "We couldn't reach our assistant. Please check your connection and try again.",
  timeout: "Our assistant is taking too long to reply. Please try again.",
};

const MOBILE_QUERY = "(max-width: 639px)";
const isMobile = () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches;

const ARABIC_FIRST = /^[^\p{L}]*\p{Script=Arabic}/u;
const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/* ── Icons (inline, like the rest of the site) ─────────────────── */

function CloseIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function NewChatIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.3 1.1 4.4 2.9 5.9L4 21l4-1.8c1.2.5 2.6.8 4 .8 5.5 0 10-3.8 10-8.5S17.5 3 12 3Z" />
    </svg>
  );
}

/* ── Bubbles ───────────────────────────────────────────────────── */

const bubbleBase = "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[0.9375rem] leading-relaxed break-words [overflow-wrap:anywhere]";
const assistantBubble = cn(bubbleBase, "mr-auto rounded-bl-md bg-[var(--surface-alt)] text-[var(--text)]");
const actionButton = "h-10! rounded-[var(--radius-full)]! px-4!";

function WhatsAppButton({ href }: { href: string }) {
  return (
    <Button href={href} variant="primary" size="sm" target="_blank" rel="noopener noreferrer" className={actionButton}>
      <WhatsAppIcon />
      Chat on WhatsApp
      <span className="sr-only"> (opens in a new tab)</span>
    </Button>
  );
}

function AssistantMessage({ text, onInternalLink }: { text: string; onInternalLink: () => void }) {
  const actions = detectReplyActions(text);
  const hasActions = actions.whatsapp || actions.enroll || actions.trial;
  return (
    <div className="flex flex-col items-start gap-2">
      <div className={assistantBubble}>
        <ChatReply text={text} onInternalLink={onInternalLink} />
      </div>
      {hasActions && (
        <div className="flex flex-wrap gap-2">
          {actions.whatsapp && <WhatsAppButton href={actions.whatsapp} />}
          {actions.enroll && (
            <Button href="/enroll" variant="secondary" size="sm" className={actionButton} onClick={onInternalLink}>
              Enroll now
            </Button>
          )}
          {actions.trial && (
            <Button href="/book-free-trial" variant="secondary" size="sm" className={actionButton} onClick={onInternalLink}>
              Book free trial
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function EntryView({
  entry,
  pending,
  onRetry,
  onInternalLink,
}: {
  entry: ChatEntry;
  pending: boolean;
  onRetry: (entry: Extract<ChatEntry, { role: "error" }>) => void;
  onInternalLink: () => void;
}) {
  switch (entry.role) {
    case "user":
      return (
        <p
          dir="auto"
          className={cn(
            bubbleBase,
            "ml-auto whitespace-pre-wrap rounded-br-md bg-[var(--green-700)] text-white",
            ARABIC_FIRST.test(entry.text) && "chat-arabic",
          )}
        >
          <span className="sr-only">You: </span>
          {entry.text}
        </p>
      );
    case "assistant":
      return <AssistantMessage text={entry.text} onInternalLink={onInternalLink} />;
    case "note":
      return <p className="text-center text-xs text-[var(--text-muted)]">{entry.text}</p>;
    case "error":
      return (
        <div className="flex flex-col items-start gap-2">
          <p className={assistantBubble}>{ERROR_TEXT[entry.kind]}</p>
          {entry.kind !== "invalid" && (
            <div className="flex flex-wrap gap-2">
              {(entry.kind === "unavailable" || entry.kind === "not-found" || entry.kind === "busy") && (
                <WhatsAppButton href={ACADEMY_WHATSAPP_URL} />
              )}
              <Button variant="secondary" size="sm" className={actionButton} disabled={pending} onClick={() => onRetry(entry)}>
                Try again
              </Button>
            </div>
          )}
        </div>
      );
  }
}

function TypingIndicator() {
  return (
    <div className={cn(assistantBubble, "flex w-fit items-center gap-1 py-3.5")}>
      <span className="sr-only">The assistant is typing…</span>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          aria-hidden="true"
          className="size-1.5 rounded-full bg-[var(--text-muted)] opacity-40 motion-safe:animate-pulse"
          style={{ animationDelay: `${i * 0.2}s` }}
        />
      ))}
    </div>
  );
}

/* ── Mobile helpers ────────────────────────────────────────────── */

/**
 * Full-screen sheet on phones: sized to the *visual* viewport, so the input stays above the
 * on-screen keyboard. Null on larger screens (the panel is a fixed-size popover there).
 */
function useMobileViewportBox(active: boolean) {
  const [box, setBox] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    if (!active) return;
    const vv = window.visualViewport;
    const update = () => setBox(isMobile() && vv ? { top: vv.offsetTop, height: vv.height } : null);
    update();
    vv?.addEventListener("resize", update);
    vv?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv?.removeEventListener("resize", update);
      vv?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [active]);
  return active ? box : null;
}

/* ── Panel ─────────────────────────────────────────────────────── */

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Lazy-loaded on the first open and then kept mounted, so the conversation (and any reply
 * still in flight) survives closing and reopening the panel.
 */
export default function ChatPanel({ open, onClose }: ChatPanelProps) {
  const { entries, pending, send, reset } = useChatSession();
  const reduceMotion = useReducedMotion();
  const [draft, setDraft] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pinnedRef = useRef(true);
  const box = useMobileViewportBox(open);

  const started = entries.some((e) => e.role === "user");

  // Page scroll is locked only while the phone full-screen sheet is open (CSS: body.chat-open).
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("chat-open");
    return () => document.body.classList.remove("chat-open");
  }, [open]);

  // Keep the newest message in view unless the visitor has scrolled up to read.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list && pinnedRef.current) list.scrollTop = list.scrollHeight;
  }, [entries, pending, open]);

  useEffect(() => {
    if (!open) return;
    pinnedRef.current = true;
    // Focus the input once the panel is in the DOM.
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open]);

  // Auto-grow the textarea up to ~5 lines.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [draft, open]);

  const closeOnMobile = useCallback(() => {
    if (isMobile()) onClose();
  }, [onClose]);

  function submit() {
    const text = draft.trim();
    if (!text || pending) return;
    pinnedRef.current = true;
    setDraft("");
    void send(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    // Focus trap only for the phone full-screen sheet; on larger screens the page stays reachable.
    if (e.key !== "Tab" || !isMobile() || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const remaining = CHAT_MAX_LENGTH - draft.length;
  const transition: Transition = reduceMotion ? { duration: 0 } : { duration: duration.base, ease: easing.easeOut };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dialogRef}
          id={CHAT_PANEL_ID}
          role="dialog"
          aria-labelledby={TITLE_ID}
          onKeyDown={handleKeyDown}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.97, y: 12 }}
          transition={transition}
          style={box ? { top: box.top, height: box.height } : undefined}
          className={cn(
            "fixed inset-x-0 top-0 z-[60] flex h-[100dvh] origin-bottom-right flex-col overflow-hidden bg-[var(--surface)]",
            "sm:inset-x-auto sm:top-auto sm:right-6 sm:bottom-[calc(1.5rem+3.5rem+0.75rem)] sm:w-[380px]",
            "sm:h-[min(600px,calc(100dvh-1.5rem-3.5rem-0.75rem-1.5rem))] sm:rounded-[var(--radius-lg)]",
            "sm:border sm:border-[var(--border)] sm:shadow-[var(--shadow-floating),var(--shadow-card-hover)]",
          )}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center gap-1 bg-[var(--green-900)] py-2 pr-2 pl-4 pt-[max(0.5rem,env(safe-area-inset-top))]">
            <div className="min-w-0 flex-1">
              {/* Inline: the global unlayered h2 rule would override Tailwind color/size utilities. */}
              <h2
                id={TITLE_ID}
                className="m-0 truncate"
                style={{ fontFamily: "var(--font-heading)", fontSize: "1.125rem", fontWeight: 600, lineHeight: 1.3, color: "#fff" }}
              >
                Admissions Assistant
              </h2>
              <p className="text-xs text-[var(--green-200)]">Adan Online Academy</p>
            </div>
            <button
              type="button"
              onClick={() => {
                reset();
                setDraft("");
                inputRef.current?.focus();
              }}
              aria-label="Start new chat"
              title="Start new chat"
              className="flex size-11 items-center justify-center rounded-[var(--radius-sm)] text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-3 focus-visible:outline-[var(--gold-400)] focus-visible:-outline-offset-3"
            >
              <NewChatIcon />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close chat"
              className="flex size-11 items-center justify-center rounded-[var(--radius-sm)] text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-3 focus-visible:outline-[var(--gold-400)] focus-visible:-outline-offset-3"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            onScroll={(e) => {
              const el = e.currentTarget;
              pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            }}
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Chat messages"
            className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4"
          >
            <p className={assistantBubble}>{WELCOME}</p>

            {!started && (
              <div className="flex flex-wrap gap-2" aria-label="Suggested questions" role="group">
                {SUGGESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={pending}
                    onClick={() => {
                      pinnedRef.current = true;
                      void send(q);
                    }}
                    className="min-h-9 rounded-[var(--radius-full)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-left text-sm text-[var(--green-800)] transition-colors hover:border-[var(--green-700)] hover:bg-[var(--green-50)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2 disabled:opacity-60"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {entries.map((entry) => (
              <motion.div
                key={entry.id}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={transition}
              >
                <EntryView
                  entry={entry}
                  pending={pending}
                  onRetry={(e) => void send(e.retryText, e.id)}
                  onInternalLink={closeOnMobile}
                />
              </motion.div>
            ))}

            {pending && <TypingIndicator />}
          </div>

          {/* Footer */}
          <div className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="flex items-end gap-2"
            >
              <label htmlFor="admissions-chat-input" className="sr-only">
                Type your question
              </label>
              <textarea
                ref={inputRef}
                id="admissions-chat-input"
                dir="auto"
                rows={1}
                value={draft}
                maxLength={CHAT_MAX_LENGTH}
                readOnly={pending}
                aria-disabled={pending || undefined}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder="Ask about courses, fees, the free trial…"
                className="max-h-[132px] min-h-11 flex-1 resize-none rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-base leading-snug text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:border-[var(--green-700)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-1 aria-disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={pending || !draft.trim()}
                aria-label="Send message"
                className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--green-700)] text-white transition-colors hover:bg-[var(--green-800)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2 disabled:opacity-50"
              >
                <SendIcon />
              </button>
            </form>
            {remaining <= 100 && (
              <p className="mt-1 text-right text-xs text-[var(--text-muted)] tabular-nums" aria-live="polite">
                {draft.length}/{CHAT_MAX_LENGTH}
              </p>
            )}
            <p className="mt-2 text-xs leading-snug text-[var(--text-muted)]">
              AI assistant — answers may not be perfect. For anything important,{" "}
              <a
                href={ACADEMY_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-[var(--green-700)] underline underline-offset-2 hover:text-[var(--green-800)]"
              >
                message us on WhatsApp
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              .
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
