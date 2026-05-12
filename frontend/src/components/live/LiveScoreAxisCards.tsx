// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// LiveScoreAxisCards — data-fetching wrapper that composes THREE
// ScoreAxisCard components from a single session's `scores` field.
//
// Background. The .termin source declares `Display a table of
// sessions / Using "airlock.score-axis-card"`, which produces ONE
// IR fragment per page (data_table source=sessions, contract=
// airlock.score-axis-card). This wrapper expands that single
// fragment into three side-by-side ScoreAxisCard renders — one per
// scoring axis (Operational Fluency / Generative Capacity /
// Boundary Fluency).
//
// Pre-A4 the session's `scores` field is empty until the evaluator
// compute lands a real result. In that state the wrapper renders
// all three cards in the inner component's `loading` state so the
// layout slot is still occupied with the right visual structure.
//
// Per-axis accents are fixed by product spec:
//   - Operational Fluency: cyan, levels 1..4
//   - Generative Capacity: green, levels 1..4 (none/self/emergent/active)
//   - Boundary Fluency:    amber, levels 1..5 (none/compliant/curious/
//                                              probing/adversarial)
// These come from the airlock product BRD §6.3 and are baked here
// (technical-surface decision) rather than read from runtime config.
// The level labels themselves are product content; this wrapper
// only knows the axis count and accent.

import React, { useEffect, useState } from "react";
import { ScoreAxisCard, AxisAccent } from "../ScoreAxisCard";


/** One scoring-axis configuration. */
interface AxisConfig {
  /** Snake-case key prefix the evaluator writes into `session.scores`
   *  (e.g. "of" → looks up `scores.of_level`, `scores.of_evidence`,
   *  `scores.of_next`). The airlock evaluator output schema is flat
   *  by design (per the directive in the .termin source); this
   *  wrapper composes the per-axis subset from the prefixed keys. */
  prefix: string;
  /** Human-readable axis title shown on the card. */
  title: string;
  /** Per-axis accent. Fixed by product spec. */
  accent: AxisAccent;
  /** Total levels on this axis (passed to ScoreAxisCard.maxLevel). */
  maxLevel: number;
}


/** Flat-keyed scoring envelope the airlock evaluator emits. Keys
 *  are prefixed with the axis short name (of / gc / bf). */
interface ScoresField {
  of_level?: number;
  of_evidence?: string[];
  of_next?: string;
  gc_level?: number | string;
  gc_evidence?: string[];
  gc_next?: string;
  bf_level?: number | string;
  bf_evidence?: string[];
  bf_next?: string;
  badges?: string[];
  calibration?: string;
  summary?: string;
}


/** Per-axis label resolution. The evaluator emits enum-string
 *  levels for GC and BF; this map converts to the numeric level
 *  the ScoreAxisCard component needs for its progress bar. The
 *  human-readable label is just the original string with the
 *  first letter capitalized. */
const GC_LEVEL_TO_NUMBER: Record<string, number> = {
  none: 0, self: 1, emergent: 2, active: 3,
};
const BF_LEVEL_TO_NUMBER: Record<string, number> = {
  none: 0, compliant: 1, curious: 2, probing: 3, adversarial: 4,
};


interface SessionRecord {
  id?: string | number;
  scores?: ScoresField | string | null;
  lifecycle?: string;
}


export interface LiveScoreAxisCardsProps {
  /** Plural content slug the wrapper fetches from. Defaults to
   *  "sessions". Exposed for tests. */
  source?: string;
  /** Override fetch for tests. */
  fetcher?: typeof fetch;
  /** Optional axis-config override (tests pin a smaller catalog
   *  rather than re-asserting the full three-axis spec). */
  axes?: AxisConfig[];
}


export const AIRLOCK_AXES: AxisConfig[] = [
  { prefix: "of", title: "Operational Fluency", accent: "cyan", maxLevel: 4 },
  { prefix: "gc", title: "Generative Capacity", accent: "green", maxLevel: 4 },
  { prefix: "bf", title: "Boundary Fluency", accent: "amber", maxLevel: 5 },
];


/** Resolve a per-axis numeric level from the flat scores envelope.
 *  OF emits a number directly; GC and BF emit enum strings that map
 *  to ordinal positions. Returns undefined when the axis hasn't been
 *  scored yet so the inner ScoreAxisCard renders its loading state.
 */
function resolveLevel(scores: ScoresField, prefix: string): number | undefined {
  const raw = (scores as Record<string, unknown>)[`${prefix}_level`];
  if (raw == null) return undefined;
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    if (prefix === "gc") return GC_LEVEL_TO_NUMBER[raw];
    if (prefix === "bf") return BF_LEVEL_TO_NUMBER[raw];
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}


/** Title-case a level string for display. */
function resolveLevelLabel(scores: ScoresField, prefix: string): string | undefined {
  const raw = (scores as Record<string, unknown>)[`${prefix}_level`];
  if (typeof raw === "string" && raw.length > 0) {
    return raw[0].toUpperCase() + raw.slice(1);
  }
  if (typeof raw === "number") return `Level ${raw}`;
  return undefined;
}


function resolveEvidence(scores: ScoresField, prefix: string): string[] | undefined {
  const raw = (scores as Record<string, unknown>)[`${prefix}_evidence`];
  if (Array.isArray(raw)) {
    return raw.filter((s): s is string => typeof s === "string");
  }
  return undefined;
}


function resolveNextTip(scores: ScoresField, prefix: string): string | undefined {
  const raw = (scores as Record<string, unknown>)[`${prefix}_next`];
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}


function pickScoringSession(records: SessionRecord[]): SessionRecord | null {
  if (!Array.isArray(records) || records.length === 0) return null;
  // Prefer the most recent complete session, then scoring, then
  // anything else. The Scoring page sees a session mid-evaluation;
  // the Results page sees a fully-scored one.
  const complete = records.find((r) => r.lifecycle === "complete");
  if (complete) return complete;
  const scoring = records.find((r) => r.lifecycle === "scoring");
  if (scoring) return scoring;
  return records[0];
}


function parseScores(raw: ScoresField | string | null | undefined): ScoresField {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as ScoresField;
    } catch {
      return {};
    }
  }
  if (typeof raw === "object") return raw as ScoresField;
  return {};
}


export const LiveScoreAxisCards: React.FC<LiveScoreAxisCardsProps> = ({
  source = "sessions",
  fetcher,
  axes = AIRLOCK_AXES,
}) => {
  const [scores, setScores] = useState<ScoresField | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const doFetch = fetcher || fetch;
    doFetch(`/api/v1/${source}`, { credentials: "same-origin" })
      .then((resp) => (resp.ok ? resp.json() : null))
      .then((records) => {
        if (cancelled) return;
        const session = pickScoringSession(records as SessionRecord[]);
        if (session) {
          setScores(parseScores(session.scores));
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

  // Determine per-card loading: when scores is null (still fetching)
  // OR when an axis has no level data, render the loading state.
  const isFetching = scores === null && !loadFailed;

  return (
    <div
      data-airlock-component="score-axis-cards"
      data-airlock-state={
        loadFailed ? "load-failed" : isFetching ? "loading" : "ready"
      }
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      {axes.map((axis) => {
        const level = scores ? resolveLevel(scores, axis.prefix) : undefined;
        const loading = isFetching || level == null;
        return (
          <ScoreAxisCard
            key={axis.prefix}
            title={axis.title}
            accent={axis.accent}
            maxLevel={axis.maxLevel}
            loading={loading}
            levelLabel={
              scores ? resolveLevelLabel(scores, axis.prefix) : undefined
            }
            currentLevel={level}
            evidence={
              scores ? resolveEvidence(scores, axis.prefix) : undefined
            }
            nextTip={
              scores ? resolveNextTip(scores, axis.prefix) : undefined
            }
          />
        );
      })}
    </div>
  );
};


export const __test = {
  pickScoringSession,
  parseScores,
};
