// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// ScenarioNarrative — typewriter text reveal for the inciting-incident
// sequence (and any other Airlock surface that needs progressive
// scripted text).
//
// IR fragment shape (consumed via window.Termin.registerRenderer):
//
//   {
//     "props": {
//       "lines": [
//         { "text": "MERIDIAN-6 ORBITAL STATION", "delay": 0, "kind": "header" },
//         { "text": "Maintenance Ticket MT-...",  "delay": 2200, "kind": "body" },
//         { "text": "AUTO-DECOMPRESSION IN 5:00", "delay": 6800, "kind": "alert-pulsing" }
//       ]
//     }
//   }
//
// Each line carries a `kind` enum that maps to a Tailwind class set
// internally — per the styling decision (semantic kind, not raw
// classNames). The .termin source authors *what the line means*, not
// *what classes it has*. New visual kinds need a code change here;
// content authoring stays separation-of-concerns clean.
//
// Slice A2 PoC scope: ships the typewriter timing + the kind→class
// map for the six kinds the existing Airlock inciting-incident uses.
// Future slices may add kinds as the .termin source needs them.

import React, { useEffect, useState } from "react";

/** Semantic styling kinds — closed enum. New kinds require a code
 *  change here AND in the kind→class map. The .termin source
 *  authors via this enum; raw Tailwind class strings are
 *  deliberately not exposed (per the 2026-05-09 styling
 *  decision). */
export type LineKind =
  | "header"
  | "subheader"
  | "body"
  | "narrative"
  | "alert"
  | "alert-pulsing";

export interface NarrativeLine {
  /** The display text. Empty string renders as a blank line
   *  (a non-breaking space is substituted so the line height
   *  is preserved). */
  text: string;
  /** Delay in milliseconds from component mount before this line
   *  becomes visible. Lines reveal in order; the .termin source
   *  authors the pacing. */
  delay: number;
  /** Semantic style kind. Maps to a Tailwind class set via
   *  KIND_CLASSES below. */
  kind: LineKind;
}

export interface ScenarioNarrativeProps {
  /** The lines to reveal, in order. Each line's `delay` is relative
   *  to component mount, NOT relative to the previous line. */
  lines: NarrativeLine[];
  /** Optional className override for the outer container. Defaults
   *  to the standard inciting-incident overlay positioning. */
  className?: string;
  /** Fired once after the LAST line in `lines` becomes visible.
   *  Useful for the .termin source to wire a state transition or
   *  show a follow-on action button. Idempotent — fires once even
   *  if React re-runs effects. */
  onComplete?: () => void;
}

/** Closed kind→class map. Keep this in lockstep with the LineKind
 *  enum above. Tests in test_scenario_narrative.test.tsx pin both
 *  the enum membership and the class assignments. */
const KIND_CLASSES: Record<LineKind, string> = {
  header:
    "text-text-muted text-xs tracking-[0.3em] uppercase",
  subheader:
    "text-text-secondary text-xs tracking-widest uppercase",
  body:
    "text-text-secondary text-sm",
  narrative:
    "text-text-primary text-base",
  alert:
    "text-accent-red text-xl font-bold",
  "alert-pulsing":
    "text-accent-red text-lg font-bold animate-pulse",
};

export const ScenarioNarrative: React.FC<ScenarioNarrativeProps> = ({
  lines,
  className = "max-w-2xl mx-auto w-full space-y-1.5",
  onComplete,
}) => {
  const [visibleCount, setVisibleCount] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    lines.forEach((line, i) => {
      timers.push(
        setTimeout(() => setVisibleCount(i + 1), line.delay),
      );
    });

    // Schedule the completion event one tick after the last line —
    // run() the callback only once.
    if (lines.length > 0) {
      const lastDelay = lines[lines.length - 1].delay;
      timers.push(
        setTimeout(() => {
          setCompleted(true);
        }, lastDelay),
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [lines]);

  // Fire onComplete ONCE when the typewriter finishes — guarded by
  // the completed state so React re-renders don't re-fire.
  useEffect(() => {
    if (completed && onComplete) {
      onComplete();
    }
  }, [completed, onComplete]);

  return (
    <div className={className} data-airlock-component="scenario-narrative">
      {lines.slice(0, visibleCount).map((line, i) => (
        <div
          key={i}
          className={KIND_CLASSES[line.kind]}
          data-airlock-line-kind={line.kind}
        >
          {line.text || " "}
        </div>
      ))}
    </div>
  );
};

export default ScenarioNarrative;
