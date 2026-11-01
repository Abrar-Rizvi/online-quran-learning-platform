"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { sendChatMessage, type ChatErrorKind } from "@/lib/chat";

export type ChatEntry =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; text: string }
  /** Small muted system line, e.g. "Started a new conversation." */
  | { id: string; role: "note"; text: string }
  /** A failed send; `retryText` is the user message a "Try again" resends (no new user bubble). */
  | { id: string; role: "error"; kind: ChatErrorKind; retryText: string };

interface StoredChat {
  conversationId: number | null;
  entries: ChatEntry[];
}

const STORAGE_KEY = "adan-admissions-chat";
const EMPTY: StoredChat = { conversationId: null, entries: [] };

let nextId = 0;
const newId = () => `${Date.now().toString(36)}-${(nextId++).toString(36)}`;

function isEntry(value: unknown): value is ChatEntry {
  if (typeof value !== "object" || value === null) return false;
  const e = value as Record<string, unknown>;
  return typeof e.id === "string" && (e.role === "user" || e.role === "assistant" || e.role === "note") && typeof e.text === "string";
}

/** sessionStorage only: survives reloads and page changes, ends with the browser session. Missing or corrupt → fresh. */
function load(): StoredChat {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const data = JSON.parse(raw) as Partial<StoredChat>;
    const conversationId = typeof data.conversationId === "number" ? data.conversationId : null;
    if (!Array.isArray(data.entries) || !data.entries.every(isEntry)) return EMPTY;
    return { conversationId, entries: data.entries };
  } catch {
    return EMPTY;
  }
}

function save(chat: StoredChat) {
  try {
    // Error bubbles are transient: after a reload the visitor just sends again.
    const entries = chat.entries.filter((e) => e.role !== "error");
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...chat, entries }));
  } catch {
    // Storage full or blocked (private mode): the chat still works for this page view.
  }
}

function clearStorage() {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore: nothing stored or storage blocked.
  }
}

export function useChatSession() {
  // The panel is client-only (dynamic import, ssr: false), so reading storage here can't mismatch hydration.
  const [chat, setChat] = useState<StoredChat>(load);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const conversationRef = useRef(chat.conversationId);
  /** Bumped by "Start new chat" so a reply still in flight for the old chat is dropped. */
  const generationRef = useRef(0);

  useEffect(() => {
    save(chat);
  }, [chat]);

  const send = useCallback(async (text: string, retryOf?: string) => {
    const message = text.trim();
    if (!message || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    const generation = generationRef.current;

    setChat((c) => ({
      ...c,
      entries: retryOf
        ? c.entries.filter((e) => e.id !== retryOf)
        : [...c.entries.filter((e) => e.role !== "error"), { id: newId(), role: "user", text: message }],
    }));

    let result = await sendChatMessage(message, conversationRef.current);
    let restarted = false;
    if (!result.ok && result.kind === "not-found" && generation === generationRef.current) {
      // The stored conversation is gone on the server: resend once as a new conversation.
      conversationRef.current = null;
      restarted = true;
      result = await sendChatMessage(message, null);
    }

    if (generation === generationRef.current) {
      if (result.ok) conversationRef.current = result.conversationId;
      const outcome: ChatEntry = result.ok
        ? { id: newId(), role: "assistant", text: result.reply }
        : { id: newId(), role: "error", kind: result.kind, retryText: message };
      setChat((c) => ({
        conversationId: conversationRef.current,
        entries: [
          ...c.entries,
          ...(restarted ? [{ id: newId(), role: "note", text: "Started a new conversation." } as const] : []),
          outcome,
        ],
      }));
      pendingRef.current = false;
      setPending(false);
    }
  }, []);

  const reset = useCallback(() => {
    generationRef.current += 1;
    conversationRef.current = null;
    pendingRef.current = false;
    setPending(false);
    clearStorage();
    setChat(EMPTY);
  }, []);

  return { entries: chat.entries, pending, send, reset };
}
