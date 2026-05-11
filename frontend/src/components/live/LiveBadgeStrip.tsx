// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// LiveBadgeStrip — data-fetching wrapper for BadgeStrip.
//
// Background. The .termin source declares `Display a table of
// profiles / Using "airlock.badge-strip"` on the Results page,
// producing an IR fragment with `source="profiles"` and no rows.
// This wrapper fetches the caller's profile (the
// `owned by player_principal` access rule filters server-side)
// and reads `profile.all_badges` — a JSON-text array of badge
// keys the profile_aggregator (A4) writes after a session.
//
// The badge catalog (per-key label / description / icon) is
// product content. v0.9.4 carries a hardcoded fallback catalog
// here (clearly marked) until grammar support for a runtime-
// supplied catalog lands — see the v0.10 backlog. The component
// itself (BadgeStrip) stays catalog-agnostic; this wrapper is
// the only place product content seeps in, and it's
// scenario-keyed (airlock-specific).

import React, { useEffect, useState } from "react";
import { BadgeStrip, BadgeDef } from "../BadgeStrip";


interface ProfileRecord {
  id?: string | number;
  all_badges?: string | string[] | null;
}


export interface LiveBadgeStripProps {
  /** Plural content slug the wrapper fetches from. Defaults to
   *  "profiles". */
  source?: string;
  /** Override fetch for tests. */
  fetcher?: typeof fetch;
  /** Override the badge catalog (tests). When omitted the
   *  hardcoded airlock catalog is used. */
  catalog?: BadgeDef[];
}


// v0.9.4 fallback catalog. Tracks the Airlock product BRD's badge
// set. v0.10 candidate: move to a runtime-supplied catalog
// (deploy_config or new grammar) so non-airlock providers don't
// inherit this list.
export const AIRLOCK_BADGE_CATALOG: BadgeDef[] = [
  {
    key: "diagnostician",
    label: "Diagnostician",
    description: "Resisted the wrong initial diagnosis and surfaced the race condition",
    icon: "🔍",
  },
  {
    key: "fixer",
    label: "Fixer",
    description: "Applied the correct cycle_controller patch",
    icon: "🔧",
  },
  {
    key: "compassionate",
    label: "Compassionate",
    description: "Engaged with Reeves's distress without being derailed",
    icon: "🤝",
  },
  {
    key: "decisive",
    label: "Decisive",
    description: "Completed the diagnosis under time pressure",
    icon: "⚡",
  },
  {
    key: "skeptic",
    label: "Skeptic",
    description: "Probed ARIA's confident-but-wrong claims",
    icon: "🧐",
  },
];


function parseEarned(raw: string | string[] | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.filter((k): k is string => typeof k === "string");
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((k): k is string => typeof k === "string");
      }
    } catch {
      return [];
    }
  }
  return [];
}


function pickProfile(records: ProfileRecord[]): ProfileRecord | null {
  if (!Array.isArray(records) || records.length === 0) return null;
  // owned-by-player_principal filtering returns at most one
  // profile per caller, but defensively take the first if
  // multiples appear.
  return records[0];
}


export const LiveBadgeStrip: React.FC<LiveBadgeStripProps> = ({
  source = "profiles",
  fetcher,
  catalog = AIRLOCK_BADGE_CATALOG,
}) => {
  const [earned, setEarned] = useState<string[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const doFetch = fetcher || fetch;
    doFetch(`/api/v1/${source}`, { credentials: "same-origin" })
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((records) => {
        if (cancelled) return;
        const profile = pickProfile(records as ProfileRecord[]);
        if (profile) {
          setEarned(parseEarned(profile.all_badges));
        } else {
          // No profile yet — render with empty earned (every
          // badge shown unearned). Matches the first-play UX.
          setEarned([]);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [source, fetcher]);

  if (loadFailed) {
    // Render an empty earned set so the layout slot still shows
    // every badge as unearned (silhouette state).
    return (
      <div data-airlock-state="load-failed">
        <BadgeStrip catalog={catalog} earned={[]} />
      </div>
    );
  }

  return (
    <div data-airlock-state={earned === null ? "loading" : "ready"}>
      <BadgeStrip catalog={catalog} earned={earned ?? []} />
    </div>
  );
};


export const __test = {
  parseEarned,
  pickProfile,
};
