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

  // Placeholder renderers for the four contracts not yet implemented
  // in slice A2 PoC. Slice A2 follow-on (or A3+) replaces each.
  const placeholderContracts = AIRLOCK_CONTRACTS.filter(
    (c) => c !== "airlock.cosmic-orb" && c !== "airlock.scenario-narrative",
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
