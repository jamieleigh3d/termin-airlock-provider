// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// Dev-mode preview harness — NOT shipped in the production bundle.
//
// IMPORT ORDER MATTERS:
//   1. ./setup-termin-mock — assigns window.Termin (must run FIRST).
//   2. ../index            — production entry point; calls
//                            registerAllContracts() at module-load
//                            time, which reads window.Termin set by
//                            step 1.
//   3. ./setup-termin-mock — value access for the renderers Map
//                            (deduplicated; doesn't re-evaluate).
//
// ES module imports evaluate in source order on first encounter, so
// putting the mock-setup import FIRST is what makes the timing
// correct. Inlining the window.Termin assignment ABOVE an
// `import "../index"` does NOT work — imports get hoisted to the
// top of the importing module regardless of source position.
//
// The narrative content used here is generic Termin-compiler-themed
// placeholder text — NOT the production Airlock product scenario,
// which lives in the Clarity-Intelligence-internal product spec
// and ships through .termin source in slice A3a.

import "./setup-termin-mock";  // step 1: window.Termin assignment
import "../index";              // step 2: production entry; registers renderers

import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";

import { renderers } from "./setup-termin-mock";  // step 3: value access
import { NarrativeLine } from "../components/ScenarioNarrative";

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


const DemoPage: React.FC = () => {
  useEffect(() => {
    const mounts: Array<[string, HTMLElement | null, unknown]> = [
      [
        "airlock.cosmic-orb",
        document.getElementById("demo-cosmic-orb"),
        { type: "cosmic-orb", props: {} },
      ],
      [
        "airlock.scenario-narrative",
        document.getElementById("demo-scenario-narrative"),
        { type: "scenario-narrative", props: { lines: DEMO_LINES } },
      ],
      [
        "airlock.countdown-timer",
        document.getElementById("demo-countdown-timer"),
        {
          type: "countdown-timer",
          // Set to 35 so the demo crosses the critical-threshold (30s)
          // a few seconds in — gives a live look at both states without
          // sitting around for 4½ minutes.
          props: { remaining_seconds: 35, label: "AIRLOCK 7" },
        },
      ],
      [
        "airlock.countdown-timer-safe",
        document.getElementById("demo-countdown-timer-safe"),
        {
          type: "countdown-timer",
          props: {
            remaining_seconds: 0,
            is_safe: true,
            safe_label: "UNLOCKED",
            label: "REEVES",
          },
        },
      ],
      [
        "airlock.badge-strip",
        document.getElementById("demo-badge-strip"),
        {
          type: "badge-strip",
          props: {
            // Sample 4-badge catalog (generic content for the dev
            // preview only — production catalog comes from the
            // .termin source / runtime config, not this repo).
            catalog: [
              {
                key: "first-pass",
                label: "First Pass",
                description: "Completed a full provider preview render.",
                icon: "★",
              },
              {
                key: "tdd-clean",
                label: "TDD Clean",
                description: "Test suite green before commit.",
                icon: "✓",
              },
              {
                key: "spec-aligned",
                label: "Spec Aligned",
                description: "Component matches the BRD §13.4 a11y rules.",
                icon: "◆",
              },
              {
                key: "shipped",
                label: "Shipped",
                description: "Slice landed on main.",
                icon: "▲",
              },
            ],
            // Two earned, two unearned — exercises both visual states
            // side by side.
            earned: ["first-pass", "tdd-clean"],
          },
        },
      ],
    ];

    for (const [contract, mount, fragment] of mounts) {
      if (!mount) continue;
      // The "-safe" suffix on the second countdown demo is a dev-only
      // affordance so we can mount the same renderer twice with
      // different props. Strip it back to the real contract name for
      // renderer lookup.
      const realContract = contract.replace(/-safe$/, "");
      const renderer = renderers.get(realContract);
      if (!renderer) {
        // eslint-disable-next-line no-console
        console.error(
          `[demo harness] No renderer registered for ${realContract}. ` +
            `Renderers seen: ${JSON.stringify([...renderers.keys()])}`,
        );
        continue;
      }
      renderer(mount, fragment);
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

      {/* CountdownTimer demos pinned top-right so we can see the
          critical-state transition + the safe-state variant side
          by side. */}
      <div
        className="absolute top-2 right-4 z-20 flex flex-col gap-3 items-end
                   bg-bg-panel/80 backdrop-blur-sm border border-text-muted/40
                   rounded px-4 py-3"
      >
        <div className="text-text-muted text-[10px] uppercase tracking-widest">
          CountdownTimer demos
        </div>
        <div id="demo-countdown-timer" />
        <div id="demo-countdown-timer-safe" />
      </div>

      {/* BadgeStrip demo pinned bottom-right. */}
      <div
        className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 items-end
                   bg-bg-panel/80 backdrop-blur-sm border border-text-muted/40
                   rounded px-4 py-3"
      >
        <div className="text-text-muted text-[10px] uppercase tracking-widest">
          BadgeStrip demo (2 earned, 2 unearned)
        </div>
        <div id="demo-badge-strip" />
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
