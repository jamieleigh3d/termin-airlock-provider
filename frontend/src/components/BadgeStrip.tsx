// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// BadgeStrip — horizontal display of all catalog badges, with earned
// vs unearned distinction.
//
// Used on the Profile + Results pages of the Airlock-on-Termin
// scenario. Renders one tile per catalog entry; tiles for keys
// present in the `earned` array get the earned-state styling
// (full-opacity icon, accent border, glow). Unearned tiles are
// dimmed with a dashed border and reduced opacity.
//
// Per BRD §13.4 (JL is colorblind), the earned-vs-unearned
// distinction is NEVER color-only:
//   - earned tiles: solid border, full opacity, glow
//   - unearned tiles: dashed border, reduced opacity, no glow
//   - aria-label suffix "(earned)" / "(not earned)" — screen
//     reader + keyboard-focus signal
//
// **The catalog is supplied by the caller**, NOT hardcoded in this
// repo. Per the airlock-provider product-content discipline, the
// label / description / icon for each badge is product content the
// .termin source (or runtime config) supplies via the IR fragment.
// This component renders whatever catalog it receives.

import React from "react";


export interface BadgeDef {
  /** Stable key used both as the React `key` and as the matcher
   *  against the `earned` list. */
  key: string;
  /** Human-readable badge name, displayed under the icon. */
  label: string;
  /** Tooltip-shown description of how the badge is earned. */
  description: string;
  /** Visual glyph — usually a single emoji, but any short string
   *  works (the source Airlock uses emoji; an alternate runtime
   *  might supply Material icon names or letters). */
  icon: string;
}


export interface BadgeStripProps {
  /** Full badge catalog — one entry per badge known to the
   *  scenario. Order is preserved in the rendered strip. */
  catalog: BadgeDef[];
  /** Keys of badges this user has earned. Order doesn't matter;
   *  membership is what determines the earned styling. Keys not
   *  present in the catalog are silently ignored (no orphan
   *  tiles). */
  earned: string[];
}


export const BadgeStrip: React.FC<BadgeStripProps> = ({ catalog, earned }) => {
  const earnedSet = new Set(earned);
  return (
    <div
      data-airlock-component="badge-strip"
      className="airlock-badge-strip flex flex-wrap gap-3 font-mono"
    >
      {catalog.map((badge) => {
        const isEarned = earnedSet.has(badge.key);
        return (
          <div
            key={badge.key}
            data-airlock-badge=""
            data-airlock-key={badge.key}
            data-airlock-earned={isEarned ? "true" : "false"}
            title={badge.description}
            aria-label={`${badge.label} (${isEarned ? "earned" : "not earned"})`}
            className={
              "flex flex-col items-center gap-1 px-3 py-2 rounded min-w-20 " +
              (isEarned
                ? "border-2 border-accent-cyan bg-accent-cyan/10 text-text-primary"
                : "border-2 border-dashed border-text-muted/50 bg-bg-panel/40 text-text-muted opacity-60")
            }
          >
            <span
              className={
                "text-2xl leading-none " +
                (isEarned ? "glow-cyan" : "")
              }
              aria-hidden="true"
            >
              {badge.icon}
            </span>
            <span className="text-[10px] uppercase tracking-wider whitespace-nowrap">
              {badge.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};
