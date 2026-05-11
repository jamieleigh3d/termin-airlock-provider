// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// Entry point for the termin-airlock-provider CSR bundle.
//
// At module evaluation time, registers one renderer per declared
// contract via the global Termin runtime API. The runtime walks the
// page's component-IR fragments and dispatches to the renderer
// registered against each contract name.
//
// Slice A1 (this scaffold): every renderer is a labeled-placeholder
// React component that mounts into the SSR shell, JSON-decodes the
// fragment from `data-airlock-ir`, and renders a placeholder with
// the contract name. Slice A2 replaces each placeholder with the
// real React component ported from the existing Airlock frontend.

import React from "react";
import { createRoot } from "react-dom/client";

import { CosmicOrb } from "./components/CosmicOrb";
import { ScenarioNarrative, NarrativeLine } from "./components/ScenarioNarrative";
import { CountdownTimer } from "./components/CountdownTimer";
import { BadgeStrip, BadgeDef } from "./components/BadgeStrip";
import {
  ScoreAxisCard,
  ScoreAxisCardProps,
  AxisAccent,
} from "./components/ScoreAxisCard";
import { Terminal, ConversationEntry } from "./components/Terminal";

import "./styles/airlock.css";

// The Termin runtime exposes a global API for renderer registration.
// See termin-server's static/termin.js for the full surface.
declare global {
  interface Window {
    Termin?: {
      registerRenderer: (
        contract: string,
        renderer: (mountPoint: HTMLElement, irFragment: unknown) => void,
      ) => void;
      action?: (payload: unknown) => Promise<unknown>;
      subscribe?: (channel: string, handler: (event: unknown) => void) => void;
    };
  }
}

// The six contracts this provider implements. Mirrors
// AIRLOCK_CONTRACTS in src/termin_airlock_provider/provider.py —
// keep both lists in lockstep until slice A2 introduces a build-
// time generator that derives one from the other.
const AIRLOCK_CONTRACTS = [
  "airlock.cosmic-orb",
  "airlock.scenario-narrative",
  "airlock.terminal",
  "airlock.countdown-timer",
  "airlock.score-axis-card",
  "airlock.badge-strip",
] as const;

// Slice A1 placeholder component — used for contracts that don't yet
// have a real React component implemented. Slice A2 PoC adds real
// renderers for `airlock.cosmic-orb` and `airlock.scenario-narrative`;
// the other four contracts continue to mount this placeholder until
// their slice lands.
const PlaceholderRenderer: React.FC<{ contract: string; ir: unknown }> = ({
  contract,
  ir,
}) => {
  return (
    <div className="airlock-placeholder font-mono text-text-secondary p-4 border border-text-muted rounded">
      <div className="text-accent-cyan font-bold">
        Airlock contract: {contract}
      </div>
      <div className="text-xs mt-2">
        Slice A1 placeholder. Real renderer lands in a later slice.
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-text-muted">
          IR fragment (debug)
        </summary>
        <pre className="mt-1 overflow-auto text-text-muted">
          {JSON.stringify(ir, null, 2)}
        </pre>
      </details>
    </div>
  );
};

/** Pull the typed `lines` prop out of the runtime-supplied IR
 *  fragment for the scenario-narrative contract. Defensive: an
 *  authoring error in .termin source might omit lines or supply a
 *  wrong type — fall back to an empty list rather than crashing the
 *  page render. */
function extractNarrativeLines(irFragment: unknown): NarrativeLine[] {
  if (!irFragment || typeof irFragment !== "object") return [];
  const fragment = irFragment as { props?: { lines?: unknown } };
  const candidate = fragment.props?.lines;
  if (!Array.isArray(candidate)) return [];
  return candidate as NarrativeLine[];
}

/** Pull countdown-timer props out of the runtime-supplied IR fragment.
 *  The .termin source binds this contract via `Using "airlock.countdown-timer"`
 *  on a sessions page; the runtime computes the props from the bound
 *  record (e.g. `remaining_seconds = session.timer_seconds - elapsed`,
 *  `is_safe = session.hatch_unlocked == "yes"`). Defensive defaults
 *  guarantee the component renders something even when an authoring
 *  error omits a prop. */
function extractCountdownTimerProps(irFragment: unknown): {
  remainingSeconds: number;
  criticalThreshold?: number;
  isSafe?: boolean;
  safeLabel?: string;
  label?: string;
} {
  const fallback = { remainingSeconds: 0 };
  if (!irFragment || typeof irFragment !== "object") return fallback;
  const props = (irFragment as { props?: Record<string, unknown> }).props ?? {};
  const remaining = props.remaining_seconds ?? props.remainingSeconds;
  const result: ReturnType<typeof extractCountdownTimerProps> = {
    remainingSeconds: typeof remaining === "number" ? remaining : 0,
  };
  if (typeof (props.critical_threshold ?? props.criticalThreshold) === "number") {
    result.criticalThreshold = (props.critical_threshold ??
      props.criticalThreshold) as number;
  }
  if (typeof props.is_safe === "boolean" || typeof props.isSafe === "boolean") {
    result.isSafe = (props.is_safe ?? props.isSafe) as boolean;
  } else if (typeof props.is_safe === "string") {
    // .termin yes/no fields land as strings — accept "yes" as truthy.
    result.isSafe = props.is_safe === "yes";
  }
  if (typeof (props.safe_label ?? props.safeLabel) === "string") {
    result.safeLabel = (props.safe_label ?? props.safeLabel) as string;
  }
  if (typeof props.label === "string") {
    result.label = props.label;
  }
  return result;
}

/** Pull badge-strip props out of the IR fragment.
 *
 *  The .termin source binds this contract via `Using "airlock.badge-strip"`
 *  on a profile-shaped page; the runtime supplies:
 *
 *    - `catalog`: the full badge catalog (label / description / icon
 *      per badge). The badge spec is product content, not technical
 *      surface — it lives in the .termin source or a runtime config,
 *      NOT hardcoded in this provider repo.
 *    - `earned`: the keys earned by this user. Often comes from a
 *      `profile.all_badges` field on the runtime side that holds a
 *      JSON-serialized list of keys.
 *
 *  Defensive defaults so a misconfigured fragment renders an empty
 *  strip rather than crashing the page. */
function extractBadgeStripProps(irFragment: unknown): {
  catalog: BadgeDef[];
  earned: string[];
} {
  const result = { catalog: [] as BadgeDef[], earned: [] as string[] };
  if (!irFragment || typeof irFragment !== "object") return result;
  const props = (irFragment as { props?: Record<string, unknown> }).props ?? {};

  // catalog: array of {key, label, description, icon} — anything else
  // gets dropped silently per the existing "rendering errors must
  // not crash the page" pattern.
  const rawCatalog = props.catalog;
  if (Array.isArray(rawCatalog)) {
    for (const entry of rawCatalog) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      if (
        typeof e.key === "string" &&
        typeof e.label === "string" &&
        typeof e.icon === "string"
      ) {
        result.catalog.push({
          key: e.key,
          label: e.label,
          description: typeof e.description === "string" ? e.description : "",
          icon: e.icon,
        });
      }
    }
  }

  // earned: array of strings, OR a JSON-serialized string of an
  // array (the .termin `text` field shape for `profile.all_badges`).
  const rawEarned = props.earned ?? props.all_badges;
  if (Array.isArray(rawEarned)) {
    result.earned = rawEarned.filter((k): k is string => typeof k === "string");
  } else if (typeof rawEarned === "string" && rawEarned.length > 0) {
    try {
      const parsed = JSON.parse(rawEarned);
      if (Array.isArray(parsed)) {
        result.earned = parsed.filter(
          (k): k is string => typeof k === "string",
        );
      }
    } catch {
      // Malformed JSON in the field — render with no earned badges
      // rather than crashing.
    }
  }
  return result;
}

/** Pull score-axis-card props out of the IR fragment.
 *
 *  The .termin source binds this contract via `Using "airlock.score-axis-card"`
 *  on a sessions or profiles page; the runtime supplies one fragment
 *  per axis (the page composes 3 instances for OF/GC/BF). Each
 *  fragment carries `title`, `accent`, `level_label`, `level_description`,
 *  `current_level`, `max_level`, optional `evidence` (string[]) and
 *  `next_tip`, plus optional `loading`.
 *
 *  Defensive: an authoring or wiring error must not crash the page;
 *  missing required fields fall back to a loading-state render so
 *  the layout slot still occupies space. */
function extractScoreAxisCardProps(irFragment: unknown): ScoreAxisCardProps {
  const fallback: ScoreAxisCardProps = {
    title: "",
    accent: "cyan",
    maxLevel: 4,
    loading: true,
  };
  if (!irFragment || typeof irFragment !== "object") return fallback;
  const props = (irFragment as { props?: Record<string, unknown> }).props ?? {};

  const accentRaw = props.accent;
  const accent: AxisAccent =
    accentRaw === "green" || accentRaw === "amber" ? accentRaw : "cyan";

  const result: ScoreAxisCardProps = {
    title: typeof props.title === "string" ? props.title : "",
    accent,
    maxLevel:
      typeof (props.max_level ?? props.maxLevel) === "number"
        ? (props.max_level ?? props.maxLevel) as number
        : 4,
  };

  if (typeof (props.level_label ?? props.levelLabel) === "string") {
    result.levelLabel = (props.level_label ?? props.levelLabel) as string;
  }
  if (
    typeof (props.level_description ?? props.levelDescription) === "string"
  ) {
    result.levelDescription = (props.level_description ??
      props.levelDescription) as string;
  }
  if (
    typeof (props.current_level ?? props.currentLevel) === "number"
  ) {
    result.currentLevel = (props.current_level ?? props.currentLevel) as number;
  }
  if (Array.isArray(props.evidence)) {
    result.evidence = props.evidence.filter(
      (e): e is string => typeof e === "string",
    );
  }
  if (typeof (props.next_tip ?? props.nextTip) === "string") {
    result.nextTip = (props.next_tip ?? props.nextTip) as string;
  }
  if (typeof props.loading === "boolean") {
    result.loading = props.loading;
  }
  return result;
}

/** Pull terminal props out of the IR fragment.
 *
 *  The .termin source binds this contract via `Show a chat for
 *  sessions.conversation_log` + `Using "airlock.terminal"`. The
 *  runtime supplies:
 *    - `entries`: the conversation_log entries (the v0.9.2
 *      conversation field shape — kind/body + optional tool fields).
 *    - `parent_record_id`: the session id, used as the append-target
 *      when the user submits the compose input.
 *    - `conversation_field`: usually "conversation_log" — the field
 *      name on the parent record.
 *    - `read_only` (optional): true when the scenario has ended
 *      (e.g. lifecycle != "scenario"). */
function extractTerminalProps(irFragment: unknown): {
  entries: ConversationEntry[];
  readOnly?: boolean;
  parentRecordId?: string | number;
  conversationField?: string;
} {
  const result = {
    entries: [] as ConversationEntry[],
    readOnly: false as boolean | undefined,
    parentRecordId: undefined as string | number | undefined,
    conversationField: undefined as string | undefined,
  };
  if (!irFragment || typeof irFragment !== "object") return result;
  const props = (irFragment as { props?: Record<string, unknown> }).props ?? {};

  // entries: an array, OR a JSON-serialized string (conversation
  // fields ride as JSON text on aiosqlite per the storage layer
  // serialization boundary).
  let raw: unknown = props.entries;
  if (typeof raw === "string" && raw.length > 0) {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = [];
    }
  }
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      if (typeof e.kind !== "string" || typeof e.id !== "string") continue;
      result.entries.push({
        id: e.id,
        kind: e.kind,
        body: typeof e.body === "string" ? e.body : "",
        created_at:
          typeof e.created_at === "string" ? e.created_at : undefined,
        appended_by_principal_id:
          typeof e.appended_by_principal_id === "string"
            ? e.appended_by_principal_id
            : undefined,
        tool_name:
          typeof e.tool_name === "string" ? e.tool_name : undefined,
        tool_args:
          e.tool_args && typeof e.tool_args === "object"
            ? (e.tool_args as Record<string, unknown>)
            : undefined,
        tool_call_id:
          typeof e.tool_call_id === "string" ? e.tool_call_id : undefined,
        purpose: typeof e.purpose === "string" ? e.purpose : undefined,
        is_error: e.is_error === true,
      });
    }
  }

  if (typeof (props.read_only ?? props.readOnly) === "boolean") {
    result.readOnly = (props.read_only ?? props.readOnly) as boolean;
  }
  if (
    typeof (props.parent_record_id ?? props.parentRecordId) === "string" ||
    typeof (props.parent_record_id ?? props.parentRecordId) === "number"
  ) {
    result.parentRecordId = (props.parent_record_id ??
      props.parentRecordId) as string | number;
  }
  if (typeof (props.conversation_field ?? props.conversationField) === "string") {
    result.conversationField = (props.conversation_field ??
      props.conversationField) as string;
  }
  return result;
}

// Bootstrap: register one renderer per contract. Slice A2 PoC wires
// real renderers for cosmic-orb + scenario-narrative; the other four
// fall back to the slice-A1 placeholder until their slice lands.
function registerAllContracts(): void {
  if (!window.Termin || !window.Termin.registerRenderer) {
    // Bundle was loaded outside a Termin runtime — log and bail
    // so the failure is visible in the browser console rather than
    // silent.
    console.warn(
      "[termin-airlock-provider] Termin runtime API not detected. " +
        "The bundle expects window.Termin.registerRenderer to be " +
        "defined by termin-server's static/termin.js before the " +
        "bundle loads.",
    );
    return;
  }

  // Real renderers (slice A2 PoC).
  window.Termin.registerRenderer("airlock.cosmic-orb", (mountPoint) => {
    const root = createRoot(mountPoint);
    root.render(<CosmicOrb />);
  });

  window.Termin.registerRenderer(
    "airlock.scenario-narrative",
    (mountPoint, irFragment) => {
      const root = createRoot(mountPoint);
      root.render(
        <ScenarioNarrative lines={extractNarrativeLines(irFragment)} />,
      );
    },
  );

  window.Termin.registerRenderer(
    "airlock.countdown-timer",
    (mountPoint, irFragment) => {
      const root = createRoot(mountPoint);
      root.render(<CountdownTimer {...extractCountdownTimerProps(irFragment)} />);
    },
  );

  window.Termin.registerRenderer(
    "airlock.badge-strip",
    (mountPoint, irFragment) => {
      const { catalog, earned } = extractBadgeStripProps(irFragment);
      const root = createRoot(mountPoint);
      root.render(<BadgeStrip catalog={catalog} earned={earned} />);
    },
  );

  window.Termin.registerRenderer(
    "airlock.score-axis-card",
    (mountPoint, irFragment) => {
      const props = extractScoreAxisCardProps(irFragment);
      const root = createRoot(mountPoint);
      root.render(<ScoreAxisCard {...props} />);
    },
  );

  window.Termin.registerRenderer(
    "airlock.terminal",
    (mountPoint, irFragment) => {
      const { entries, readOnly, parentRecordId, conversationField } =
        extractTerminalProps(irFragment);
      const root = createRoot(mountPoint);
      // The runtime exposes window.Termin.action for the chat-input
      // wiring (see termin-server's static/termin.js). When available,
      // submitting the input fires an append-to-conversation action.
      // When absent (rare — tests / preview without action support)
      // the terminal renders read-only by omitting onSend.
      const onSend =
        window.Termin?.action && parentRecordId && conversationField
          ? (text: string) => {
              window.Termin!.action!({
                kind: "append",
                content: "sessions",
                record_id: parentRecordId,
                field: conversationField,
                payload: { kind: "user", body: text },
              }).catch((err: unknown) => {
                // eslint-disable-next-line no-console
                console.error("[airlock.terminal] action.append failed:", err);
              });
            }
          : undefined;
      root.render(
        <Terminal entries={entries} readOnly={readOnly} onSend={onSend} />,
      );
    },
  );

  // All six contracts have real renderers — slice A2 complete.
  const realContracts = new Set(AIRLOCK_CONTRACTS);
  const placeholderContracts = AIRLOCK_CONTRACTS.filter(
    (c) => !realContracts.has(c),
  );
  for (const contract of placeholderContracts) {
    window.Termin.registerRenderer(contract, (mountPoint, irFragment) => {
      const root = createRoot(mountPoint);
      root.render(
        <PlaceholderRenderer contract={contract} ir={irFragment} />,
      );
    });
  }
}

registerAllContracts();
