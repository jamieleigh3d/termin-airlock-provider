// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// Dev-mode preview harness — NOT shipped in the production bundle.
//
// Mocks the Termin runtime API (window.Termin.registerRenderer) so
// the airlock-provider's production entry point (../index.tsx) can
// register its renderers as it normally would, then manually mounts
// each contract into a container div with a sample IR fragment that
// stands in for what the .termin source would emit at runtime.
//
// The narrative content used here is generic Termin-compiler-themed
// placeholder text — NOT the production Airlock product scenario,
// which lives in the Clarity-Intelligence-internal product spec
// and ships through .termin source in slice A3a.

import React from "react";
import { createRoot } from "react-dom/client";

import { CosmicOrb } from "../components/CosmicOrb";
import {
  ScenarioNarrative,
  NarrativeLine,
} from "../components/ScenarioNarrative";

import "../styles/airlock.css";


// Sample narrative — Termin-themed placeholder content; NOT the
// production Airlock scenario. Demonstrates the LineKind enum:
// header / subheader / body / narrative / alert / alert-pulsing.
const DEMO_LINES: NarrativeLine[] = [
  { text: "TERMIN COMPILER v0.9.4 — DEV PREVIEW", delay: 0, kind: "header" },
  { text: "AIRLOCK PRESENTATION PROVIDER", delay: 600, kind: "subheader" },
  { text: "PROVIDER SYSTEM SMOKE TEST", delay: 1100, kind: "subheader" },
  { text: "", delay: 1500, kind: "body" },
  { text: "Component: airlock.scenario-narrative", delay: 1700, kind: "body" },
  { text: "Component: airlock.cosmic-orb", delay: 2200, kind: "body" },
  { text: "", delay: 2600, kind: "body" },
  { text: "Both contracts are registered against the runtime via", delay: 2800, kind: "narrative" },
  { text: "window.Termin.registerRenderer; this dev harness mocks", delay: 3500, kind: "narrative" },
  { text: "the runtime API and mounts each contract manually.", delay: 4200, kind: "narrative" },
  { text: "", delay: 4900, kind: "body" },
  { text: "READY FOR INTEGRATION", delay: 5300, kind: "alert" },
  { text: "WIRE THIS BUNDLE INTO TERMIN-SERVER", delay: 6000, kind: "alert-pulsing" },
];


// Mock the Termin runtime API. The production index.tsx calls
// window.Termin.registerRenderer(contract, fn) at module-load time;
// our mock captures those registrations into a map so the dev
// harness can invoke them with sample IR fragments.
type Renderer = (mountPoint: HTMLElement, irFragment: unknown) => void;
const renderers = new Map<string, Renderer>();

declare global {
  interface Window {
    Termin?: {
      registerRenderer: (contract: string, renderer: Renderer) => void;
      action?: (payload: unknown) => Promise<unknown>;
      subscribe?: (channel: string, handler: (event: unknown) => void) => void;
    };
  }
}

window.Termin = {
  registerRenderer: (contract: string, renderer: Renderer) => {
    renderers.set(contract, renderer);
    console.log(`[demo harness] Registered renderer for: ${contract}`);
  },
};

// Now import the production entry point — its registerAllContracts()
// call fires the mock window.Termin.registerRenderer above and the
// six contracts get registered.
//
// Side-effect import — required for the registerAllContracts() call.
import "../index";


// Build the demo page: a labeled section per contract showing each
// in isolation. The CosmicOrb sits on top because it's positioned
// absolute (filling its container); the narrative overlays it via
// stacking + a content panel at the bottom of the viewport.
const DemoPage: React.FC = () => {
  React.useEffect(() => {
    // Mount cosmic-orb into its container. The IR fragment is empty
    // because cosmic-orb takes no props at this slice.
    const orbMount = document.getElementById("demo-cosmic-orb");
    const narrativeMount = document.getElementById("demo-scenario-narrative");

    const orbRenderer = renderers.get("airlock.cosmic-orb");
    const narrativeRenderer = renderers.get("airlock.scenario-narrative");

    if (orbMount && orbRenderer) {
      orbRenderer(orbMount, { type: "cosmic-orb", props: {} });
    }
    if (narrativeMount && narrativeRenderer) {
      narrativeRenderer(narrativeMount, {
        type: "scenario-narrative",
        props: { lines: DEMO_LINES },
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* CosmicOrb fills the viewport behind everything */}
      <div
        id="demo-cosmic-orb"
        className="absolute inset-0 w-full h-full"
      />

      {/* Narrative overlay at the bottom — same layout convention
          the production inciting-incident page uses. */}
      <div className="relative z-10 min-h-screen flex flex-col justify-end font-mono">
        <div
          className="bg-gradient-to-t from-[#020810] via-[rgba(3,8,16,0.88)] to-transparent
                     pt-20 pb-10 px-10"
        >
          <div id="demo-scenario-narrative" />
        </div>
      </div>

      {/* Top-left dev-mode label so it's obvious this is the preview
          harness, not the real runtime. */}
      <div
        className="absolute top-2 left-2 z-20 px-3 py-1 text-xs font-mono
                   bg-bg-elevated text-text-secondary border border-text-muted rounded"
      >
        DEV PREVIEW · termin-airlock-provider
      </div>
    </div>
  );
};


const rootEl = document.getElementById("airlock-demo-root");
if (rootEl) {
  createRoot(rootEl).render(<DemoPage />);
}
