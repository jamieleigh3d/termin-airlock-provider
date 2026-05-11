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
  /** Snake-case key the evaluator writes into `session.scores`. */
  key: string;
  /** Human-readable axis title shown on the card. */
  title: string;
  /** Per-axis accent. Fixed by product spec. */
  accent: AxisAccent;
  /** Total levels on this axis (passed to ScoreAxisCard.maxLevel). */
  maxLevel: number;
}


/** Per-axis scoring evidence the evaluator emits into the session
 *  scores field. Defensive: every field is optional so we can render
 *  partial / loading states. */
interface AxisScore {
  level?: number;
  level_label?: string;
  level_description?: string;
  evidence?: string[];
  next_tip?: string;
}


interface ScoresField {
  operational_fluency?: AxisScore;
  generative_capacity?: AxisScore;
  boundary_fluency?: AxisScore;
}


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
  {
    key: "operational_fluency",
    title: "Operational Fluency",
    accent: "cyan",
    maxLevel: 4,
  },
  {
    key: "generative_capacity",
    title: "Generative Capacity",
    accent: "green",
    maxLevel: 4,
  },
  {
    key: "boundary_fluency",
    title: "Boundary Fluency",
    accent: "amber",
    maxLevel: 5,
  },
];


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
        const axisScores = scores?.[axis.key as keyof ScoresField];
        const loading = isFetching || !axisScores || axisScores.level == null;
        return (
          <ScoreAxisCard
            key={axis.key}
            title={axis.title}
            accent={axis.accent}
            maxLevel={axis.maxLevel}
            loading={loading}
            levelLabel={axisScores?.level_label}
            levelDescription={axisScores?.level_description}
            currentLevel={axisScores?.level}
            evidence={axisScores?.evidence}
            nextTip={axisScores?.next_tip}
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
