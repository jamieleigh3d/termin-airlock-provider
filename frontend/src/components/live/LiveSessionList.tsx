// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// LiveSessionList — Landing-page attempt-history list.
//
// Background. The .termin source declares `Display a table of
// sessions / Using "airlock.session-list"` on the Landing page,
// producing an IR fragment with `source="sessions"` and no rows.
// The owned-by-player_principal access rule means a player sees
// only their own sessions; this wrapper fetches them, sorts
// most-recent-first, and renders one row per attempt with a
// compact summary (date / lifecycle / top-line OF level).
//
// Per-row "View Detail" links are rendered as inert controls in
// Phase 1; Phase 2 wires them once the detail-page grammar
// primitive (Show a detail page for <plural>) lands. The carry-
// through is the `data-airlock-action="view-detail"` selector
// plus the `data-airlock-row="<id>"` row attribute so the wiring
// is a one-line click handler later.

import React, { useEffect, useState } from "react";


interface ScoresShape {
  of_level?: number;
  gc_level?: number | string;
  bf_level?: number | string;
}


interface SessionRecord {
  id?: string | number;
  created_at?: string;
  lifecycle?: string;
  scores?: ScoresShape | string | null;
}


export interface LiveSessionListProps {
  /** Plural content slug the wrapper fetches from. Defaults to
   *  "sessions". Exposed for tests. */
  source?: string;
  /** Override fetch for tests. */
  fetcher?: typeof fetch;
}


/** Sort records by `created_at` descending (most recent first).
 *  Records missing `created_at` sort to the end of the list, in
 *  their original relative order. Returns a new array; does not
 *  mutate the input. */
function sortByCreatedDesc<T extends { created_at?: string }>(
  records: T[],
): T[] {
  // Stable two-pass sort: timestamped records by date desc, then
  // any missing-timestamp records in their original order at the
  // tail. Array.prototype.sort isn't guaranteed stable across
  // every JS engine for all input sizes pre-2019, but modern V8
  // (which jsdom uses) is — so this is safe in the test bed and
  // in production browsers. The two-pass form also makes the
  // missing-timestamp behavior obvious.
  const withDate: T[] = [];
  const withoutDate: T[] = [];
  for (const r of records) {
    if (typeof r.created_at === "string" && r.created_at.length > 0) {
      withDate.push(r);
    } else {
      withoutDate.push(r);
    }
  }
  withDate.sort((a, b) => (b.created_at! < a.created_at! ? -1 : 1));
  return [...withDate, ...withoutDate];
}


/** Parse the scores field. The .termin source declares it as
 *  `structured`; aiosqlite stores structured fields as JSON text,
 *  so the wire shape is either a JSON-text string or (when the
 *  server has already parsed) an object. Returns null for any
 *  unrecoverable input. */
function parseScores(
  raw: ScoresShape | string | null | undefined,
): ScoresShape | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed as ScoresShape;
      }
      return null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw;
  return null;
}


/** One-line OF summary for a row. Numeric of_level renders as
 *  "Level N"; missing renders as a dash placeholder so the row's
 *  score column still occupies space (colorblind-friendly: the
 *  empty state has a glyph rather than nothing). */
function summarizeOfLevel(scores: ScoresShape | null): string {
  if (!scores) return "—";
  const v = scores.of_level;
  if (typeof v === "number") return `Level ${v}`;
  return "—";
}


/** Display a date with locale-appropriate formatting. Falls back
 *  to the raw string on parse failure so an unexpected timestamp
 *  format still shows something rather than crashing. */
function formatDateForDisplay(raw: string | undefined): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  // Short locale date — full timestamp belongs on Detail.
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}


export const LiveSessionList: React.FC<LiveSessionListProps> = ({
  source = "sessions",
  fetcher,
}) => {
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const doFetch = fetcher || fetch;
    doFetch(`/api/v1/${source}`, { credentials: "same-origin" })
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((records) => {
        if (cancelled) return;
        if (Array.isArray(records)) {
          setSessions(records as SessionRecord[]);
        } else {
          setSessions([]);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [source, fetcher]);

  const state = loadFailed
    ? "load-failed"
    : sessions === null
      ? "loading"
      : sessions.length === 0
        ? "empty"
        : "ready";

  const sorted = sessions ? sortByCreatedDesc(sessions) : [];

  return (
    <div
      data-airlock-component="session-list"
      data-airlock-state={state}
      className="font-mono p-4 border border-text-muted rounded bg-bg-elevated"
    >
      <div className="text-text-secondary text-xs uppercase tracking-wider mb-2">
        Your Attempts
      </div>
      {state === "load-failed" && (
        <div className="text-text-secondary text-sm">
          Couldn't load your attempt history. Retry later.
        </div>
      )}
      {state === "loading" && (
        <div className="text-text-muted text-sm">Loading…</div>
      )}
      {state === "empty" && (
        <div className="text-text-muted text-sm">
          No attempts yet. Begin your first assessment to see your
          history here.
        </div>
      )}
      {state === "ready" && (
        <ul className="flex flex-col gap-2">
          {sorted.map((s) => {
            const scores = parseScores(s.scores);
            const ofLabel = summarizeOfLevel(scores);
            const lifecycle = s.lifecycle ?? "—";
            const date = formatDateForDisplay(s.created_at);
            const rowKey = String(s.id ?? "");
            return (
              <li
                key={rowKey || `idx-${Math.random()}`}
                data-airlock-row={rowKey}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 py-2 border-b border-text-muted/30 last:border-b-0"
              >
                <span className="text-text-secondary text-sm">
                  {date}
                </span>
                <span
                  data-airlock-lifecycle={lifecycle}
                  className="text-xs px-2 py-0.5 rounded border border-text-muted text-text-secondary uppercase tracking-wide"
                >
                  {lifecycle}
                </span>
                <span className="text-accent-cyan text-sm font-bold tabular-nums">
                  {ofLabel}
                </span>
                <button
                  type="button"
                  data-airlock-action="view-detail"
                  data-airlock-target={rowKey}
                  disabled
                  className="text-xs px-2 py-1 border border-text-muted text-text-muted rounded cursor-not-allowed"
                  title="Detail view lands in Phase 2"
                >
                  View Detail
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};


export const __test = {
  sortByCreatedDesc,
  parseScores,
  summarizeOfLevel,
  formatDateForDisplay,
};
