// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// Terminal — the chat surface for the Airlock-on-Termin scenario page.
//
// Renders the conversation_log entries (per the v0.9.2 conversation
// field type) with role-differentiated styling:
//
//   - user        → blue, right-aligned bubble, "USER" label
//   - agent       → cyan, left-aligned bubble, "ARIA" label
//   - tool_call   → cyan card, collapsible, shows tool name + args
//                   when expanded
//   - tool_result → cyan dimmed card, collapsible, shows pretty-
//                   printed JSON (or raw text for non-JSON bodies)
//   - system_event (OVERSEER) → amber, centered, "OVERSEER" label
//
// Per BRD §13.4 the role distinction is multi-channel — color is
// never the sole signal:
//   - text label ("USER" / "ARIA" / "OVERSEER") on every bubble
//   - alignment (user right / agent left / overseer center)
//   - tool_result errors carry an "ERROR" text label + data attribute
//     in addition to color, so colorblind users + screen readers see
//     the failure
//
// An optional input region at the bottom fires `onSend(text)` on
// submit. Omitted when no `onSend` callback is supplied (the Results
// page renders the conversation as a read-only transcript). Disabled
// via `readOnly` when the scenario has ended.

import React, { useEffect, useRef, useState } from "react";


/** Canonical conversation entry shape (matches v0.9.2 conversation
 *  field). The runtime hands the renderer a `props.entries` array of
 *  these. `kind` is the routing discriminator; the per-kind fields
 *  (tool_name, tool_args, tool_call_id, is_error) are populated for
 *  tool_call / tool_result entries only. */
export interface ConversationEntry {
  id: string;
  kind: string;             // "user" | "agent" | "tool_call" | "tool_result" | "system_event"
  body: string;
  created_at?: string;
  appended_by_principal_id?: string;
  /** Present on tool_call entries. */
  tool_name?: string;
  tool_args?: Record<string, unknown>;
  tool_call_id?: string;
  /** Present on tool_call when the agent supplied a stated purpose
   *  for the call — shown above the tool args when expanded. */
  purpose?: string;
  /** Present on tool_result entries; true when the underlying tool
   *  raised. */
  is_error?: boolean;
}


export interface TerminalProps {
  /** Conversation entries to display, in source order. */
  entries: ConversationEntry[];
  /** Optional callback when the user submits the compose input. The
   *  parent (the runtime via the index.tsx renderer) wires this to
   *  the conversation_log:append action. When omitted, the input
   *  region is not rendered (read-only transcript mode). */
  onSend?: (text: string) => void;
  /** When true, disables the input + send button without removing
   *  them. Used when the scenario has ended but the input region is
   *  still visually present. */
  readOnly?: boolean;
}


/** Map kinds to display defaults. The labels here are the
 *  technical-surface defaults (USER / ARIA / TOOL CALL / TOOL RESULT
 *  / OVERSEER). Per the airlock-provider product-content discipline,
 *  scenario-specific overrides (e.g. a different agent name) would
 *  come through future props. */
const KIND_META: Record<
  string,
  { label: string; align: "left" | "right" | "center" }
> = {
  user: { label: "USER", align: "right" },
  agent: { label: "ARIA", align: "left" },
  tool_call: { label: "TOOL CALL", align: "left" },
  tool_result: { label: "TOOL RESULT", align: "left" },
  system_event: { label: "OVERSEER", align: "center" },
};


function metaFor(kind: string): { label: string; align: "left" | "right" | "center" } {
  return KIND_META[kind] ?? { label: kind.toUpperCase(), align: "left" };
}


function tryFormatJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}


/** Single message bubble — covers user, agent, system_event. The
 *  tool_call / tool_result kinds use ToolEntryCard instead. */
const MessageBubble: React.FC<{ entry: ConversationEntry }> = ({ entry }) => {
  const meta = metaFor(entry.kind);
  let containerClass: string;
  let bubbleClass: string;
  let labelClass: string;
  if (entry.kind === "user") {
    containerClass = "ml-12 flex justify-end";
    bubbleClass =
      "px-4 py-2 bg-accent-blue/10 border-r-2 border-accent-blue/60 max-w-[80%]";
    labelClass = "text-accent-blue";
  } else if (entry.kind === "system_event") {
    containerClass = "mx-8";
    bubbleClass =
      "px-4 py-2 border-l-2 border-r-2 border-accent-amber/60 bg-accent-amber/5 text-center";
    labelClass = "text-accent-amber glow-amber";
  } else {
    containerClass = "mr-12";
    bubbleClass =
      "px-4 py-2 bg-accent-cyan/5 border-l-2 border-accent-cyan/60 max-w-[80%]";
    labelClass = "text-accent-cyan glow-cyan";
  }
  return (
    <div
      data-airlock-entry=""
      data-airlock-kind={entry.kind}
      data-airlock-align={meta.align}
      className={containerClass}
    >
      <div className={bubbleClass}>
        <p
          data-airlock-state="role-label"
          className={`${labelClass} text-[10px] font-bold mb-1 tracking-widest`}
        >
          {meta.label}
        </p>
        <p
          data-airlock-state="body"
          className="text-text-primary text-sm whitespace-pre-wrap break-words"
        >
          {entry.body}
        </p>
      </div>
    </div>
  );
};


/** Collapsible tool_call / tool_result card. Collapsed by default
 *  so the chat scroll stays readable; click the header to expand
 *  the full args / output. */
const ToolEntryCard: React.FC<{ entry: ConversationEntry }> = ({ entry }) => {
  const [expanded, setExpanded] = useState(false);
  const meta = metaFor(entry.kind);
  const isError = entry.kind === "tool_result" && entry.is_error === true;
  // Header text shown after the kind label. For tool_call: the tool
  // name. For tool_result: the originating call id (or empty if not
  // supplied — the kind label alone is enough). Avoid duplicating
  // "TOOL RESULT" on both sides of the >.
  const headerLabel =
    entry.kind === "tool_call"
      ? entry.tool_name || ""
      : entry.tool_call_id
        ? `← ${entry.tool_call_id}`
        : "";
  const formatted =
    entry.kind === "tool_result" ? tryFormatJson(entry.body) : entry.body;

  return (
    <div
      data-airlock-entry=""
      data-airlock-kind={entry.kind}
      data-airlock-align={meta.align}
      data-airlock-expanded={expanded ? "true" : "false"}
      data-airlock-is-error={isError ? "true" : "false"}
      className="mr-12"
    >
      <div
        className={
          "border bg-bg-deep/60 max-w-[80%] " +
          (isError
            ? "border-accent-red/60"
            : "border-text-muted/30")
        }
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-text-muted/5 transition-colors gap-3"
          aria-expanded={expanded}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span
              className={
                "text-[10px] font-bold tracking-widest " +
                (isError ? "text-accent-red" : "text-accent-cyan")
              }
            >
              {meta.label}
            </span>
            {headerLabel && (
              <span
                className={
                  "text-xs font-mono truncate " +
                  (isError ? "text-accent-red glow-red" : "text-accent-cyan glow-cyan")
                }
              >
                &gt; {headerLabel}
              </span>
            )}
            {isError && (
              <span className="text-accent-red text-[10px] uppercase tracking-widest font-bold border border-accent-red/60 px-1.5 py-0.5 rounded ml-1">
                ERROR
              </span>
            )}
          </span>
          <span className="text-text-muted text-xs flex-shrink-0">
            {expanded ? "▲" : "▼"}
          </span>
        </button>
        {expanded && (
          <div className="px-3 pb-2 pt-1 space-y-2">
            {entry.kind === "tool_call" && entry.tool_args &&
              Object.keys(entry.tool_args).length > 0 && (
                <div className="text-xs space-y-0.5">
                  {Object.entries(entry.tool_args).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="text-text-muted font-mono">{k}:</span>
                      <span className="text-text-secondary font-mono break-all">
                        {typeof v === "string" ? v : JSON.stringify(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            {entry.kind === "tool_call" && entry.purpose && (
              <p className="text-xs italic text-text-muted">
                purpose: {entry.purpose}
              </p>
            )}
            <pre
              data-airlock-state="body"
              className="text-xs text-text-secondary font-mono whitespace-pre-wrap break-all max-h-48 overflow-y-auto border-t border-text-muted/10 pt-1.5"
            >
              {formatted}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};


export const Terminal: React.FC<TerminalProps> = ({
  entries,
  onSend,
  readOnly = false,
}) => {
  const [composeText, setComposeText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries arrive. Tracks the entry
  // count rather than the array reference so a parent rerendering
  // with the same content doesn't cause spurious scroll jumps.
  const entryCount = entries.length;
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entryCount]);

  function handleSubmit() {
    const text = composeText.trim();
    if (!text || !onSend) return;
    onSend(text);
    setComposeText("");
  }

  return (
    <div
      data-airlock-component="terminal"
      className="airlock-terminal flex flex-col h-full font-mono bg-bg-deep border border-text-muted/30 rounded"
    >
      <div
        ref={scrollRef}
        data-airlock-state="messages"
        className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0"
      >
        {entries.map((entry) => {
          if (entry.kind === "tool_call" || entry.kind === "tool_result") {
            return <ToolEntryCard key={entry.id} entry={entry} />;
          }
          return <MessageBubble key={entry.id} entry={entry} />;
        })}
      </div>
      {onSend && (
        <form
          className="flex items-center gap-2 p-2 border-t border-text-muted/20 bg-bg-panel"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <input
            data-airlock-state="compose"
            type="text"
            value={composeText}
            onChange={(e) => setComposeText(e.target.value)}
            placeholder={
              readOnly ? "Session ended" : "Type a message…"
            }
            disabled={readOnly}
            className="flex-1 min-w-0 bg-bg-deep border border-text-muted/30 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted disabled:opacity-50 focus:outline-none focus:border-accent-cyan"
          />
          <button
            type="submit"
            data-airlock-state="send"
            disabled={readOnly || composeText.trim() === ""}
            className="px-4 py-1.5 border border-accent-cyan text-accent-cyan text-sm tracking-wider hover:bg-accent-cyan/10 disabled:opacity-40 disabled:cursor-not-allowed glow-cyan transition-colors"
          >
            SEND
          </button>
        </form>
      )}
    </div>
  );
};
