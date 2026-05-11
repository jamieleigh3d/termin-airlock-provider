// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// CountdownTimer — the always-visible top-bar timer for the
// Airlock-on-Termin scenario page.
//
// Counts down once per second from `remainingSeconds` (the
// authoritative count the runtime supplies; the .termin source
// computes `session.timer_seconds - elapsed` and binds it to the
// `airlock.countdown-timer` contract). When the count drops at or
// below `criticalThreshold` (default 30), the time switches to the
// red accent, flips aria-live to assertive, and surfaces a CRITICAL
// text label so the visual cue is not color-only (BRD §13.4 — JL is
// colorblind, every color-coded state needs a text-label backup).
//
// When `isSafe` is true (typically `session.hatch_unlocked == "yes"`),
// the time is replaced by `safeLabel` ("SAFE" by default) and the
// internal countdown is suppressed.
//
// The component re-syncs to the prop when the parent (runtime) pushes
// a fresh authoritative count — internal state never wins over the
// server's number.

import React, { useEffect, useState } from "react";


export interface CountdownTimerProps {
  /** The number of seconds remaining at component mount (or at the
   *  most recent prop update from the runtime). The component
   *  decrements internally once per second; the parent can override
   *  by passing a new value. */
  remainingSeconds: number;
  /** Below or at this threshold (in seconds) the timer enters its
   *  critical visual + aria-live=assertive state. Default 30. */
  criticalThreshold?: number;
  /** When true, suppresses the countdown and shows `safeLabel`
   *  instead of the time. Used when `session.hatch_unlocked == "yes"`. */
  isSafe?: boolean;
  /** The text to show in place of the time when `isSafe` is true.
   *  Defaults to "SAFE". */
  safeLabel?: string;
  /** Optional caller-supplied label rendered as a small uppercase
   *  prefix to the time (e.g. "AIRLOCK 7", "REEVES"). */
  label?: string;
}


function formatTime(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}


export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  remainingSeconds,
  criticalThreshold = 30,
  isSafe = false,
  safeLabel = "SAFE",
  label,
}) => {
  // Internal countdown state. Initialized from the prop and re-synced
  // whenever the prop changes (the parent pushing an authoritative
  // count from the server overrides any internal drift).
  const [seconds, setSeconds] = useState(remainingSeconds);

  // Re-sync to the prop on every change. Without this, internal
  // drift would silently win over the server's authoritative count.
  useEffect(() => {
    setSeconds(remainingSeconds);
  }, [remainingSeconds]);

  // Tick once per second while not in safe mode. Stops at 0:00 — no
  // negative values land in the display.
  useEffect(() => {
    if (isSafe) return;
    const id = setInterval(() => {
      setSeconds((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [isSafe]);

  const isCritical = !isSafe && seconds <= criticalThreshold;
  const displayText = isSafe ? safeLabel : formatTime(seconds);

  return (
    <div
      data-airlock-component="countdown-timer"
      className="airlock-countdown-timer flex items-center gap-3 font-mono"
    >
      {label && (
        <span className="text-text-muted text-xs tracking-widest uppercase">
          {label}
        </span>
      )}
      <span
        data-airlock-state="time"
        data-airlock-critical={isCritical ? "true" : "false"}
        aria-live={isCritical ? "assertive" : "polite"}
        aria-atomic="true"
        className={
          "text-2xl font-bold tracking-wider " +
          (isSafe
            ? "text-accent-cyan glow-cyan"
            : isCritical
              ? "text-accent-red glow-red animate-pulse"
              : "text-accent-cyan glow-cyan")
        }
      >
        {displayText}
      </span>
      {isCritical && (
        <span
          data-airlock-state="critical-label"
          className="text-accent-red text-[10px] uppercase tracking-widest font-bold border border-accent-red/60 px-1.5 py-0.5 rounded"
          aria-hidden="false"
        >
          CRITICAL
        </span>
      )}
    </div>
  );
};
