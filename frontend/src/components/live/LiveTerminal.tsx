// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// LiveTerminal — data-fetching wrapper for Terminal.
//
// Background. The .termin source declares `Show a chat for
// sessions.conversation_log / Using "airlock.terminal"`, producing
// an IR chat fragment with `source="sessions"` and
// `conversation_field="conversation_log"`. v0.9.4 runtime serializes
// the fragment to the mount-point without records; this wrapper
// fetches the caller's active session, reads the conversation_log
// field, and renders entries.
//
// The Terminal's compose-input fires `Termin.action({kind:
// "append", content: "sessions", record_id, field:
// "conversation_log", payload: {kind: "user", body}})` — matches
// the existing terminal renderer's onSend wiring; the wrapper
// just supplies the right session id.
//
// Streaming-in (ARIA's responses landing in conversation_log via
// the v0.9.2 conversation auto-write-back) hydrates via the
// runtime's data-termin-row-id + data-termin-field selectors that
// the Terminal component already exposes; this wrapper doesn't
// need to subscribe — the existing WebSocket hydrator does that
// once the row id + field are in the DOM.

import React, { useEffect, useState } from "react";
import { Terminal, ConversationEntry } from "../Terminal";


interface SessionRecord {
  id?: string | number;
  conversation_log?: string | ConversationEntry[] | null;
  lifecycle?: string;
}


export interface LiveTerminalProps {
  /** Plural content slug the wrapper fetches from. Defaults to
   *  "sessions". Exposed for tests. */
  source?: string;
  /** Field name on the parent record where conversation entries
   *  live. Defaults to "conversation_log". */
  conversationField?: string;
  /** Override fetch for tests. */
  fetcher?: typeof fetch;
  /** Override the action dispatcher (defaults to
   *  `window.Termin.action`). Tests inject a fake. */
  action?: (payload: unknown) => Promise<unknown>;
}


function pickActiveSession(records: SessionRecord[]): SessionRecord | null {
  if (!Array.isArray(records) || records.length === 0) return null;
  // Prefer the in-scenario session — that's the one we're chatting
  // with. Fall back to first if no scenario session exists.
  const inScenario = records.find((r) => r.lifecycle === "scenario");
  return inScenario || records[0];
}


function parseEntries(
  raw: string | ConversationEntry[] | null | undefined,
): ConversationEntry[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return [];
    }
  }
  return [];
}


export const LiveTerminal: React.FC<LiveTerminalProps> = ({
  source = "sessions",
  conversationField = "conversation_log",
  fetcher,
  action,
}) => {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const doFetch = fetcher || fetch;
    doFetch(`/api/v1/${source}`, { credentials: "same-origin" })
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((records) => {
        if (cancelled) return;
        const active = pickActiveSession(records as SessionRecord[]);
        if (active) {
          setSession(active);
        } else {
          setLoadFailed(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [source, fetcher]);

  // While loading: render an empty read-only terminal so the
  // layout slot is occupied. Read-only because the compose
  // input can't append without a parent record id.
  if (!session) {
    return (
      <div data-airlock-state={loadFailed ? "load-failed" : "loading"}>
        <Terminal entries={[]} readOnly={true} />
      </div>
    );
  }

  const entries = parseEntries(
    session[conversationField as keyof SessionRecord] as
      | string
      | ConversationEntry[]
      | null
      | undefined,
  );

  // Wire onSend to action.append. The Terminal component already
  // emits data-termin-row-id and data-termin-field attributes so
  // the runtime's WebSocket hydrator can stream ARIA's reply
  // entries back into this conversation without the wrapper
  // subscribing manually.
  const dispatch =
    action || (window.Termin?.action as typeof action) || undefined;
  const readOnly = session.lifecycle !== "scenario";
  const onSend =
    !readOnly && dispatch && session.id !== undefined
      ? (text: string) => {
          dispatch({
            kind: "append",
            content: source,
            record_id: session.id,
            field: conversationField,
            payload: { kind: "user", body: text },
          }).catch((err: unknown) => {
            // eslint-disable-next-line no-console
            console.error("[airlock.terminal] action.append failed:", err);
          });
        }
      : undefined;

  return (
    <div
      data-airlock-state="ready"
      data-termin-row-id={String(session.id ?? "")}
      data-termin-field={conversationField}
    >
      <Terminal entries={entries} readOnly={readOnly} onSend={onSend} />
    </div>
  );
};


export const __test = {
  pickActiveSession,
  parseEntries,
};
