// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// LiveProfileSummary — Landing-page aggregate profile display.
//
// Background. The .termin source declares `Display a table of
// profiles / Using "airlock.profile-summary"` on the Landing page,
// producing an IR fragment with `source="profiles"` and no rows.
// The owned-by-player_principal access rule means a player sees at
// most one profile (their own); this wrapper fetches that row and
// renders an aggregate one-line-per-axis summary suitable for a
// landing page (not the full ScoreAxisCard treatment, which belongs
// on Session Detail / Results).
//
// Per BRD §13.4 colorblind discipline:
//   - the level label appears as text, not just an accent color
//   - the per-axis prefix label ("Operational Fluency / Generative
//     Capacity / Boundary Fluency") is always rendered
//   - the "none" sentinel renders as a dash placeholder rather than
//     leaving a blank that depends on context to interpret
//
// The badge catalog total (badges earned vs available) is a v0.10
// candidate — Phase 1 ships with just the earned count.

import React, { useEffect, useState } from "react";


interface ProfileRecord {
  id?: string | number;
  best_of_level?: number;
  best_gc_level?: number | string;
  best_bf_level?: number | string;
  total_attempts?: number;
  all_badges?: string | string[] | null;
}


export interface LiveProfileSummaryProps {
  /** Plural content slug the wrapper fetches from. Defaults to
   *  "profiles". Exposed for tests. */
  source?: string;
  /** Override fetch for tests. */
  fetcher?: typeof fetch;
}


/** Resolve the display label for an axis level. OF emits numeric
 *  levels ("Level 3"); GC and BF emit enum strings ("Emergent",
 *  "Curious"). The "none" sentinel and missing values render as a
 *  dash so the per-axis slot still occupies space and a colorblind
 *  player sees a clear "no level yet" signal rather than an
 *  ambiguous blank. */
function formatLevelLabel(
  raw: number | string | null | undefined,
): string {
  if (raw == null) return "—";
  if (typeof raw === "number") return `Level ${raw}`;
  if (typeof raw === "string") {
    if (raw === "" || raw === "none") return "—";
    return raw[0].toUpperCase() + raw.slice(1);
  }
  return "—";
}


/** Parse the badge count from the profile's `all_badges` field. The
 *  field is declared `text` in .termin but holds a JSON array per the
 *  airlock storage convention; this helper accepts either a native
 *  array (in-memory shape) or a JSON-text string (aiosqlite shape)
 *  and returns the count. Malformed JSON yields 0 rather than throwing
 *  per the "rendering errors must not crash the page" pattern. */
function parseBadgeCount(
  raw: string | string[] | null | undefined,
): number {
  if (!raw) return 0;
  if (Array.isArray(raw)) return raw.length;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.length;
    } catch {
      return 0;
    }
  }
  return 0;
}


function pickProfile(records: ProfileRecord[]): ProfileRecord | null {
  if (!Array.isArray(records) || records.length === 0) return null;
  // Owned-by filtering returns at most one profile per caller.
  // Defensively take the first if multiple appear.
  return records[0];
}


interface AxisDisplay {
  title: string;
  shortLabel: string;
  rawValue: number | string | null | undefined;
}


export const LiveProfileSummary: React.FC<LiveProfileSummaryProps> = ({
  source = "profiles",
  fetcher,
}) => {
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [empty, setEmpty] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const doFetch = fetcher || fetch;
    doFetch(`/api/v1/${source}`, { credentials: "same-origin" })
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((records) => {
        if (cancelled) return;
        const found = pickProfile(records as ProfileRecord[]);
        if (found) {
          setProfile(found);
        } else {
          setEmpty(true);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [source, fetcher]);

  const isLoading = profile === null && !empty && !loadFailed;

  const state = loadFailed
    ? "load-failed"
    : isLoading
      ? "loading"
      : empty
        ? "empty"
        : "ready";

  // Per-axis prefixes are fixed by product spec (matches
  // LiveScoreAxisCards / AIRLOCK_AXES).
  const axes: AxisDisplay[] = [
    {
      title: "Operational Fluency",
      shortLabel: "OF",
      rawValue: profile?.best_of_level,
    },
    {
      title: "Generative Capacity",
      shortLabel: "GC",
      rawValue: profile?.best_gc_level,
    },
    {
      title: "Boundary Fluency",
      shortLabel: "BF",
      rawValue: profile?.best_bf_level,
    },
  ];

  const attempts = profile?.total_attempts ?? 0;
  const badgeCount = parseBadgeCount(profile?.all_badges);

  return (
    <div
      data-airlock-component="profile-summary"
      data-airlock-state={state}
      className="font-mono p-4 border border-text-muted rounded bg-bg-elevated"
    >
      <div className="text-text-secondary text-xs uppercase tracking-wider mb-2">
        Your AI Fluency
      </div>
      {state === "load-failed" && (
        <div className="text-text-secondary text-sm">
          Couldn't load your profile. Retry later.
        </div>
      )}
      {state === "loading" && (
        <div className="text-text-muted text-sm">Loading…</div>
      )}
      {(state === "ready" || state === "empty") && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {axes.map((axis) => (
              <div
                key={axis.shortLabel}
                data-airlock-axis={axis.shortLabel}
                className="flex flex-col"
              >
                <span className="text-text-muted text-xs">
                  {axis.title}
                </span>
                <span className="text-accent-cyan text-lg font-bold">
                  {formatLevelLabel(axis.rawValue)}
                </span>
              </div>
            ))}
          </div>
          <div className="text-text-secondary text-xs">
            {attempts} attempts · {badgeCount} badges
          </div>
        </>
      )}
    </div>
  );
};


export const __test = {
  pickProfile,
  formatLevelLabel,
  parseBadgeCount,
};
