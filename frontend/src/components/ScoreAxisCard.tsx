// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// ScoreAxisCard — single-axis score display.
//
// Three of these compose the Results page (one per assessment axis:
// Operational Fluency / Generative Capacity / Boundary Fluency).
// The Scoring page uses a single instance in `loading` mode while
// the meta-evaluator runs.
//
// Visual: a bordered card with the axis title (small uppercase),
// the current level label (large + accent glow), a one-line
// description of what that level means, a level-segment progress
// bar, an optional evidence list, and an optional next-level tip.
//
// Per BRD §13.4, the accent color is never the sole signal:
//   - the level label appears as text (not just a colored bar)
//   - the progress bar carries role="progressbar" + aria-valuenow
//     so screen readers announce "Level 3 of 4"
//   - filled vs unfilled segments differ in opacity, not just hue

import React from "react";


export type AxisAccent = "cyan" | "green" | "amber";


export interface ScoreAxisCardProps {
  /** Display name of the axis ("Operational Fluency", etc.). */
  title: string;
  /** Accent color for level + progress + glow. The .termin source
   *  picks per-axis: OF=cyan, GC=green, BF=amber. */
  accent: AxisAccent;
  /** Human-readable label for the user's current level
   *  ("Architect", "Active", "Probing", etc.). Required unless
   *  `loading` is true. */
  levelLabel?: string;
  /** One-line plain-language description of what `levelLabel`
   *  means. Shown under the level. Required unless `loading`. */
  levelDescription?: string;
  /** Numeric level (1..maxLevel) for the progress bar. Clamped
   *  to [0, maxLevel]. Required unless `loading`. */
  currentLevel?: number;
  /** Total levels on this axis. OF/BF=4, GC=3 typically — varies
   *  per scenario. */
  maxLevel: number;
  /** Optional evidence excerpts ("ran diagnostics_scan", etc.) the
   *  evaluator extracted to support the level decision. */
  evidence?: string[];
  /** Optional one-liner growth tip for the next level. */
  nextTip?: string;
  /** When true, suppresses level/description/evidence/tip and
   *  shows a "scoring..." placeholder instead. Used on the Scoring
   *  page while the evaluator runs. */
  loading?: boolean;
}


const ACCENT_CLASSES: Record<AxisAccent, {
  border: string;
  text: string;
  bg: string;
  glow: string;
}> = {
  cyan: {
    border: "border-accent-cyan/40",
    text: "text-accent-cyan",
    bg: "bg-accent-cyan",
    glow: "glow-cyan",
  },
  green: {
    border: "border-accent-green/40",
    text: "text-accent-green",
    bg: "bg-accent-green",
    glow: "glow-green",
  },
  amber: {
    border: "border-accent-amber/40",
    text: "text-accent-amber",
    bg: "bg-accent-amber",
    glow: "glow-amber",
  },
};


export const ScoreAxisCard: React.FC<ScoreAxisCardProps> = ({
  title,
  accent,
  levelLabel,
  levelDescription,
  currentLevel,
  maxLevel,
  evidence,
  nextTip,
  loading = false,
}) => {
  const accentClasses = ACCENT_CLASSES[accent];
  const clampedLevel = Math.max(
    0,
    Math.min(maxLevel, currentLevel ?? 0),
  );
  const progressLabel = loading
    ? "Scoring in progress"
    : `Level ${clampedLevel} of ${maxLevel}`;

  return (
    <div
      data-airlock-component="score-axis-card"
      data-airlock-accent={accent}
      className={
        "p-4 border bg-bg-panel font-mono " +
        accentClasses.border
      }
    >
      <div className="flex items-baseline justify-between mb-2 gap-3 flex-wrap">
        <h3 className="text-text-secondary text-xs uppercase tracking-wider min-w-0">
          {title}
        </h3>
        {loading ? (
          <span
            className={`text-sm font-bold uppercase tracking-wider ${accentClasses.text} ${accentClasses.glow} animate-pulse`}
          >
            Scoring…
          </span>
        ) : (
          <span
            className={`text-lg font-bold ${accentClasses.text} ${accentClasses.glow}`}
          >
            {levelLabel}
          </span>
        )}
      </div>

      {!loading && levelDescription && (
        <p className="text-text-muted text-xs mb-3">{levelDescription}</p>
      )}

      <div
        data-airlock-state="progress-bar"
        role="progressbar"
        aria-valuenow={loading ? 0 : clampedLevel}
        aria-valuemin={0}
        aria-valuemax={maxLevel}
        aria-label={progressLabel}
        className="flex gap-1 mb-3"
      >
        {Array.from({ length: maxLevel }, (_, i) => {
          const filled = !loading && i < clampedLevel;
          return (
            <div
              key={i}
              data-airlock-state="progress-segment"
              data-airlock-filled={filled ? "true" : "false"}
              className={
                "h-1.5 flex-1 rounded-sm " +
                (filled ? accentClasses.bg : "bg-text-muted/20")
              }
            />
          );
        })}
      </div>

      {!loading && evidence && evidence.length > 0 && (
        <div className="mb-2">
          <p className="text-text-muted text-xs mb-1 uppercase tracking-wider">
            Evidence
          </p>
          <ul className="text-text-secondary text-xs space-y-0.5">
            {evidence.map((e, i) => (
              <li
                key={i}
                className="pl-2 border-l border-text-muted/30"
              >
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && nextTip && (
        <p className="text-text-muted text-xs italic mt-2">{nextTip}</p>
      )}
    </div>
  );
};
