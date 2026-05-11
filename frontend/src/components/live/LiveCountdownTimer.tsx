// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// LiveCountdownTimer — data-fetching wrapper for CountdownTimer.
//
// Background. v0.9.4 A5: the runtime's SSR path passes empty
// PresentationData to provider.render_ssr, and the CSR mount-point
// serializes the IR node without records. The .termin source
// declares `Display a table of sessions / Using "airlock.countdown-
// timer"`, which produces an IR fragment with `source="sessions"`
// but no rows. This wrapper does what the runtime doesn't yet:
// fetch the records and compute the props the inner component
// needs.
//
// The compose logic:
//   - GET /api/v1/sessions returns the caller's own sessions
//     (owned-by-player_principal filter applied server-side).
//   - Pick the most recent in-scenario session — the user is
//     looking at the Scenario page mid-game.
//   - `remainingSeconds = max(0, timer_seconds - elapsed)` where
//     elapsed = now - scenario_started_at.
//   - `isSafe = hatch_unlocked == "yes"`.
//
// Server-side bound_data plumbing is a v0.10 candidate (the
// PresentationData Protocol on the provider already accepts it; the
// runtime just doesn't thread it). Once that lands the
// fetch-on-mount here can drop in favor of a synchronous
// extraction from the fragment.

import React, { useEffect, useState } from "react";
import { CountdownTimer } from "../CountdownTimer";


/** One session record from the runtime's `/api/v1/sessions`
 *  response. Defensive: only the fields the wrapper needs are
 *  typed; the runtime may add more. */
interface SessionRecord {
  id?: string | number;
  timer_seconds?: number;
  scenario_started_at?: string | null;
  hatch_unlocked?: string | boolean;
  lifecycle?: string;
}


export interface LiveCountdownTimerProps {
  /** Plural content slug the wrapper fetches from. Defaults to
   *  "sessions" — the only source the airlock contract is bound
   *  to in v0.9.4. Exposed for tests. */
  source?: string;
  /** Override the default fetch implementation (tests inject a
   *  fake). The signature matches `window.fetch`. */
  fetcher?: typeof fetch;
}


function pickActiveSession(records: SessionRecord[]): SessionRecord | null {
  if (!Array.isArray(records) || records.length === 0) return null;
  // Prefer a session in the "scenario" lifecycle phase. Fall back
  // to the first record otherwise (single-session-per-player is
  // the typical case).
  const inScenario = records.find((r) => r.lifecycle === "scenario");
  return inScenario || records[0];
}


function computeRemaining(session: SessionRecord, now: Date = new Date()): number {
  const total =
    typeof session.timer_seconds === "number" ? session.timer_seconds : 300;
  const startedAt = session.scenario_started_at;
  if (!startedAt) return total;
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return total;
  const elapsed = (now.getTime() - started) / 1000;
  return Math.max(0, Math.floor(total - elapsed));
}


function computeIsSafe(session: SessionRecord): boolean {
  // .termin yes/no fields land as "yes"/"no" strings on aiosqlite;
  // accept both string and boolean for forward-compat with stores
  // that return native bool.
  if (typeof session.hatch_unlocked === "boolean") {
    return session.hatch_unlocked;
  }
  return session.hatch_unlocked === "yes";
}


export const LiveCountdownTimer: React.FC<LiveCountdownTimerProps> = ({
  source = "sessions",
  fetcher,
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

  if (!session) {
    // Loading or load-failed: render a 0-second placeholder so the
    // layout slot is occupied. The CRITICAL accent isn't applied
    // (no count yet) — the inner component's threshold gate handles
    // that once a real value arrives.
    return (
      <div data-airlock-state={loadFailed ? "load-failed" : "loading"}>
        <CountdownTimer remainingSeconds={0} />
      </div>
    );
  }

  return (
    <CountdownTimer
      remainingSeconds={computeRemaining(session)}
      isSafe={computeIsSafe(session)}
    />
  );
};


// Test seams — exposed for vitest direct-unit testing of the
// pure helpers without mounting React.
export const __test = {
  pickActiveSession,
  computeRemaining,
  computeIsSafe,
};
