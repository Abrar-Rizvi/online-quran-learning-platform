/** Admissions chat: the POST /chat call, its error mapping, and helpers for reply links. */

import { SITE_URL } from "@/lib/seo";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** The backend has no max length for a message (only min 1), so this is the client-side limit. */
export const CHAT_MAX_LENGTH = 1000;
const CHAT_TIMEOUT_MS = 30_000;

interface ChatRequestBody {
  message: string;
  conversation_id: number | null;
}

interface ChatResponseBody {
  reply: string;
  conversation_id: number;
}

/**
 * Why a send failed, without any backend text (the API's `detail` can contain raw exception
 * messages, which are never shown to visitors):
 * - invalid:      422 (blank message — client validation should prevent it)
 * - not-found:    404 for a stored conversation_id that no longer exists
 * - unavailable:  503 (AI not configured), other 5xx, or /chat not enabled (404 on a new chat)
 * - busy:         429
 * - network:      the request never got an HTTP response
 * - timeout:      no response within CHAT_TIMEOUT_MS
 */
export type ChatErrorKind = "invalid" | "not-found" | "unavailable" | "busy" | "network" | "timeout";

export type ChatResult =
  | { ok: true; reply: string; conversationId: number }
  | { ok: false; kind: ChatErrorKind };

function isChatResponse(value: unknown): value is ChatResponseBody {
  if (typeof value !== "object" || value === null) return false;
  const body = value as Record<string, unknown>;
  return typeof body.reply === "string" && typeof body.conversation_id === "number";
}

/** Client-safe: sends one visitor message to POST /chat. Never throws — every outcome is in the result. */
export async function sendChatMessage(message: string, conversationId: number | null): Promise<ChatResult> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, CHAT_TIMEOUT_MS);

  try {
    const body: ChatRequestBody = { message, conversation_id: conversationId };
    const res = await fetch(`${BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (res.ok) {
      const data: unknown = await res.json();
      return isChatResponse(data)
        ? { ok: true, reply: data.reply, conversationId: data.conversation_id }
        : { ok: false, kind: "unavailable" };
    }
    if (res.status === 422) return { ok: false, kind: "invalid" };
    // Without a conversation_id a 404 can only mean the /chat route itself is off (CHAT_ENABLED=false).
    if (res.status === 404) return { ok: false, kind: conversationId === null ? "unavailable" : "not-found" };
    if (res.status === 429) return { ok: false, kind: "busy" };
    return { ok: false, kind: "unavailable" };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[chat] Request failed:", err);
    }
    return { ok: false, kind: timedOut ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

/* ── Links in replies ─────────────────────────────────────────── */

const SITE_HOSTS = new Set([new URL(SITE_URL).hostname, new URL(SITE_URL).hostname.replace(/^www\./, "")]);
const WHATSAPP_HOSTS = new Set(["wa.me", "api.whatsapp.com", "chat.whatsapp.com", "whatsapp.com", "www.whatsapp.com"]);

/**
 * A reply link, classified: our own pages become site paths (opened with Next Link in the same
 * tab), other http(s) URLs stay external (new tab), anything else is not a link at all.
 */
export type ChatLink = { kind: "internal"; path: string } | { kind: "external"; href: string; whatsapp: boolean };

export function classifyChatLink(href: string | undefined): ChatLink | null {
  if (!href) return null;
  if (/^\/(?!\/)/.test(href)) return { kind: "internal", path: href };
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (SITE_HOSTS.has(url.hostname)) return { kind: "internal", path: `${url.pathname}${url.search}${url.hash}` || "/" };
  return { kind: "external", href: url.href, whatsapp: WHATSAPP_HOSTS.has(url.hostname) };
}

export interface ChatReplyActions {
  /** The WhatsApp URL exactly as it appears in the reply. */
  whatsapp: string | null;
  enroll: boolean;
  trial: boolean;
}

/** Bare URLs, Markdown link targets `](...)` and angle-bracket autolinks in a reply. */
const URL_PATTERN = /https?:\/\/[^\s<>()"'\]]+|\]\((\/[^)\s]*)\)/g;

/** Action buttons to show under a reply — only for links the reply itself contains. */
export function detectReplyActions(reply: string): ChatReplyActions {
  const actions: ChatReplyActions = { whatsapp: null, enroll: false, trial: false };
  for (const match of reply.matchAll(URL_PATTERN)) {
    const raw = (match[1] ?? match[0]).replace(/[.,;:!?]+$/, "");
    const link = classifyChatLink(raw);
    if (!link) continue;
    if (link.kind === "external") {
      if (link.whatsapp && !actions.whatsapp) actions.whatsapp = link.href;
    } else {
      const path = link.path.split(/[?#]/)[0].replace(/\/+$/, "");
      if (path === "/enroll") actions.enroll = true;
      if (path === "/book-free-trial") actions.trial = true;
    }
  }
  return actions;
}
