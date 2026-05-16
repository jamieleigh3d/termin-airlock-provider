// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// LiveSessionDetail — Session Detail page wrapper.
//
// Background. The v0.9.4 Phase 2 detail-page primitive registers
// the .termin source's `Show a detail page for sessions called
// "Session Detail"` directive at the URL `/session_detail/{id}`.
// The runtime fetches the record server-side for routing + auth
// gating (404 cleanly on missing or other-principal ids); the
// React wrapper here re-fetches the record by id on mount so the
// rendered detail reflects current state (and the v0.10 bound_data
// pass will eventually thread the record straight into the IR
// fragments, at which point this wrapper degrades to a pure props
// consumer).
//
// Content: three ScoreAxisCard components in full mode (level +
// description + evidence + nextTip) + a summary section showing
// calibration + summary text + badges earned. Per-axis prefixes
// follow the same shape as LiveScoreAxisCards (OF=cyan/4 levels,
// GC=green/4 levels, BF=amber/5 levels) so the visual vocabulary
// is consistent across Landing / Scoring / Detail surfaces.

import React, { useEffect, useState } from "react";
import { ScoreAxisCard, AxisAccent } from "../ScoreAxisCard";
import { AIRLOCK_BADGE_CATALOG } from "./LiveBadgeStrip";
import { BadgeStrip } from "../BadgeStrip";


interface ScoresShape {
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


interface SessionRecord {
  id?: string | number;
  created_at?: string;
  lifecycle?: string;
  scores?: ScoresShape | string | null;
}


export interface LiveSessionDetailProps {
  /** Override fetch for tests. */
  fetcher?: typeof fetch;
  /** Override the URL pathname (tests). When omitted reads
   *  window.location.pathname. */
  pathnameOverride?: string;
}


/** Map enum-string level → ordinal position so the ScoreAxisCard's
 *  progress bar can render visually. OF is already numeric. */
const GC_LEVEL_TO_NUMBER: Record<string, number> = {
  none: 0, self: 1, emergent: 2, active: 3,
};
const BF_LEVEL_TO_NUMBER: Record<string, number> = {
  none: 0, compliant: 1, curious: 2, probing: 3, adversarial: 4,
};


function parseScores(
  raw: ScoresShape | string | null | undefined,
): ScoresShape | null {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed as ScoresShape;
      return null;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw;
  return null;
}


/** Extract the record id from `/<slug>/<id>` (the standard detail-page
 *  route shape). Returns "" when no id segment is present so the
 *  wrapper can render a not-found state immediately rather than
 *  fetching with a malformed URL. */
function idFromPathname(pathname: string): string {
  if (!pathname) return "";
  const parts = pathname.split("/").filter((s) => s.length > 0);
  // Standard detail shape: ["<slug>", "<id>"]. Anything shorter
  // means no id.
  if (parts.length < 2) return "";
  return parts[parts.length - 1];
}


function resolveLevel(scores: ScoresShape, prefix: string): number | undefined {
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


function resolveLevelLabel(
  scores: ScoresShape, prefix: string,
): string | undefined {
  const raw = (scores as Record<string, unknown>)[`${prefix}_level`];
  if (typeof raw === "string" && raw.length > 0) {
    return raw[0].toUpperCase() + raw.slice(1);
  }
  if (typeof raw === "number") return `Level ${raw}`;
  return undefined;
}


function resolveEvidence(
  scores: ScoresShape, prefix: string,
): string[] | undefined {
  const raw = (scores as Record<string, unknown>)[`${prefix}_evidence`];
  if (Array.isArray(raw)) {
    return raw.filter((s): s is string => typeof s === "string");
  }
  return undefined;
}


function resolveNextTip(
  scores: ScoresShape, prefix: string,
): string | undefined {
  const raw = (scores as Record<string, unknown>)[`${prefix}_next`];
  return typeof raw === "string" && raw.length > 0 ? raw : undefined;
}


interface AxisConfig {
  prefix: string;
  title: string;
  accent: AxisAccent;
  maxLevel: number;
}


const AIRLOCK_AXES: AxisConfig[] = [
  { prefix: "of", title: "Operational Fluency", accent: "cyan", maxLevel: 4 },
  { prefix: "gc", title: "Generative Capacity", accent: "green", maxLevel: 4 },
  { prefix: "bf", title: "Boundary Fluency", accent: "amber", maxLevel: 5 },
];


export const LiveSessionDetail: React.FC<LiveSessionDetailProps> = ({
  fetcher,
  pathnameOverride,
}) => {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // Resolve the record id from the URL. Done once at mount; if the
  // URL is missing the id segment, render not-found immediately.
  const pathname = pathnameOverride
    ?? (typeof window !== "undefined" ? window.location.pathname : "");
  const recordId = idFromPathname(pathname);

  useEffect(() => {
    if (!recordId) {
      setNotFound(true);
      return;
    }
    let cancelled = false;
    const doFetch = fetcher || fetch;
    doFetch(
      `/api/v1/sessions/${recordId}`,
      { credentials: "same-origin" },
    )
      .then((resp) => {
        if (cancelled) return null;
        if (resp.status === 404) {
          setNotFound(true);
          return null;
        }
        if (!resp.ok) {
          setLoadFailed(true);
          return null;
        }
        return resp.json();
      })
      .then((record) => {
        if (cancelled || record == null) return;
        setSession(record as SessionRecord);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [recordId, fetcher]);

  const state = loadFailed
    ? "load-failed"
    : notFound
      ? "not-found"
      : session === null
        ? "loading"
        : "ready";

  const scores = state === "ready" ? parseScores(session?.scores) : null;
  const badges = scores?.badges ?? [];

  return (
    <div
      data-airlock-component="session-detail"
      data-airlock-state={state}
      className="font-mono"
    >
      {state === "loading" && (
        <div className="text-text-muted text-sm p-4">
          Loading session detail…
        </div>
      )}
      {state === "load-failed" && (
        <div className="text-text-secondary text-sm p-4">
          Couldn't load this session. The id may be invalid or you may
          not have access. Try going back to your history.
        </div>
      )}
      {state === "not-found" && (
        <div className="text-text-secondary text-sm p-4">
          Session not found. It may have been deleted or you may be
          looking for a session that belongs to another player.
        </div>
      )}
      {state === "ready" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {AIRLOCK_AXES.map((axis) => {
              const level = scores ? resolveLevel(scores, axis.prefix) : undefined;
              const label = scores ? resolveLevelLabel(scores, axis.prefix) : undefined;
              const evidence = scores ? resolveEvidence(scores, axis.prefix) : undefined;
              const tip = scores ? resolveNextTip(scores, axis.prefix) : undefined;
              return (
                <ScoreAxisCard
                  key={axis.prefix}
                  title={axis.title}
                  accent={axis.accent}
                  maxLevel={axis.maxLevel}
                  currentLevel={level}
                  levelLabel={label}
                  evidence={evidence}
                  nextTip={tip}
                  loading={level == null}
                />
              );
            })}
          </div>
          {(scores?.summary || scores?.calibration) && (
            <div
              data-airlock-component="session-detail-summary"
              className="p-4 border border-text-muted rounded bg-bg-elevated mb-4"
            >
              {scores?.summary && (
                <p className="text-text-primary text-sm mb-2">
                  {scores.summary}
                </p>
              )}
              {scores?.calibration && (
                <p className="text-text-secondary text-xs">
                  Calibration: {scores.calibration}
                </p>
              )}
            </div>
          )}
          <div
            data-airlock-component="session-detail-badges"
            className="p-4 border border-text-muted rounded bg-bg-elevated"
          >
            <BadgeStrip
              catalog={AIRLOCK_BADGE_CATALOG}
              earned={badges}
            />
          </div>
        </>
      )}
    </div>
  );
};


export const __test = {
  parseScores,
  idFromPathname,
};
