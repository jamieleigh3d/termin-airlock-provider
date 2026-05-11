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
        "airlock.score-axis-card",
        document.getElementById("demo-score-of"),
        {
          type: "score-axis-card",
          props: {
            title: "Operational Fluency",
            accent: "cyan",
            level_label: "Architect",
            level_description:
              "Designs and orchestrates AI-assisted workflows.",
            current_level: 4,
            max_level: 4,
            evidence: [
              "Ran diagnostics_scan early to gather data",
              "Interpreted JSON tool output without hand-holding",
            ],
            next_tip: "You're at the top of this axis. Maintain by mentoring.",
          },
        },
      ],
      [
        "airlock.score-axis-card-gc",
        document.getElementById("demo-score-gc"),
        {
          type: "score-axis-card",
          props: {
            title: "Generative Capacity",
            accent: "green",
            level_label: "Active",
            level_description: "Generates novel directions and synthesis.",
            current_level: 2,
            max_level: 3,
            evidence: ["Connected sensor data to a system-level hypothesis"],
            next_tip: "Try framing each tool call as a falsifiable hypothesis.",
          },
        },
      ],
      [
        "airlock.score-axis-card-bf",
        document.getElementById("demo-score-bf"),
        {
          type: "score-axis-card",
          props: {
            title: "Boundary Fluency",
            accent: "amber",
            loading: true,
            max_level: 4,
          },
        },
      ],
      [
        "airlock.terminal",
        document.getElementById("demo-terminal"),
        {
          type: "terminal",
          props: {
            // Sample conversation exercising every kind: user,
            // agent, tool_call, tool_result, system_event. All
            // generic content — NOT the production Airlock
            // scenario.
            entries: [
              {
                id: "e1",
                kind: "user",
                body: "Run a diagnostic on the airlock please.",
                created_at: "2026-05-11T03:00:00Z",
              },
              {
                id: "e2",
                kind: "agent",
                body:
                  "Acknowledged. Initiating diagnostic scan of " +
                  "Airlock 7 systems now.",
                created_at: "2026-05-11T03:00:01Z",
              },
              {
                id: "e3",
                kind: "tool_call",
                body: 'diagnostics_scan({"sensor": "cycle_controller"})',
                tool_name: "diagnostics_scan",
                tool_args: { sensor: "cycle_controller" },
                tool_call_id: "call-0",
                purpose: "Identify the source of the cycling fault.",
                created_at: "2026-05-11T03:00:02Z",
              },
              {
                id: "e4",
                kind: "tool_result",
                body:
                  '{"value":{"cycle_controller":{"status":"FAULT",' +
                  '"check_alpha":"TRIGGERED","check_beta":"TRIGGERED"' +
                  '}}}',
                tool_call_id: "call-0",
                created_at: "2026-05-11T03:00:03Z",
              },
              {
                id: "e5",
                kind: "agent",
                body:
                  "Scan complete. The cycle_controller reports FAULT — " +
                  "two redundant safety checks are alternating. I " +
                  "recommend repair_execute with command 'recalibrate " +
                  "pressure_sensor'.\n\n**Should I proceed?**",
                created_at: "2026-05-11T03:00:04Z",
              },
              {
                id: "e6",
                kind: "system_event",
                body:
                  "Airlock 7 status: decompression in approximately " +
                  "4:00. Recommend expediting diagnosis.",
                created_at: "2026-05-11T03:00:05Z",
              },
              {
                id: "e7",
                kind: "tool_result",
                body: "Error: tool diagnostics_scan timed out after 30s",
                tool_call_id: "call-1",
                is_error: true,
                created_at: "2026-05-11T03:00:06Z",
              },
            ],
            parent_record_id: 1,
            conversation_field: "conversation_log",
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
      // Demo-only suffixes (-safe, -gc, -bf, etc.) let us mount the
      // same renderer multiple times with different sample props.
      // Strip them back to the real contract name for renderer
      // lookup.
      const realContract = contract.replace(/-(safe|gc|bf)$/, "");
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
    <div className="min-h-screen bg-black font-mono p-6 grid grid-cols-12 gap-4 auto-rows-min">
      {/* Top header strip */}
      <header className="col-span-12 flex items-center justify-between
                         bg-bg-panel/80 backdrop-blur-sm border border-text-muted/40
                         rounded px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 text-xs bg-bg-elevated text-text-secondary border border-text-muted rounded">
            DEV PREVIEW · termin-airlock-provider
          </span>
          <span className="text-text-muted text-[11px] tracking-widest uppercase">
            Slice A2 — all six contracts wired
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-text-muted text-[10px] tracking-widest uppercase">
            CountdownTimer
          </span>
          <div id="demo-countdown-timer" />
          <div id="demo-countdown-timer-safe" />
        </div>
      </header>

      {/* CosmicOrb thumbnail (left col, 4 wide) + ScenarioNarrative
          on the right. The orb is a fixed visual asset; the
          narrative cycles through its typewriter sequence. */}
      <div className="col-span-4 relative bg-black border border-text-muted/30 rounded overflow-hidden h-72">
        <div id="demo-cosmic-orb" className="absolute inset-0" />
        <div className="absolute top-2 left-2 text-[10px] text-text-muted tracking-widest uppercase z-10">
          airlock.cosmic-orb
        </div>
      </div>
      <div className="col-span-8 bg-bg-panel/80 backdrop-blur-sm border border-text-muted/40 rounded p-4 h-72 overflow-y-auto">
        <div className="text-[10px] text-text-muted tracking-widest uppercase mb-2">
          airlock.scenario-narrative
        </div>
        <div id="demo-scenario-narrative" />
      </div>

      {/* Terminal — 8 wide, full height. The headline component for
          the scenario page; needs real estate to demonstrate the
          chat surface, role styling, tool-call inspector, input. */}
      <div className="col-span-8 bg-bg-panel/80 backdrop-blur-sm border border-text-muted/40 rounded p-2 flex flex-col h-[28rem]">
        <div className="text-[10px] text-text-muted tracking-widest uppercase px-2 pb-2">
          airlock.terminal — chat surface (5 entry kinds: user / agent / tool_call / tool_result / system_event)
        </div>
        <div id="demo-terminal" className="flex-1 min-h-0 flex flex-col" />
      </div>

      {/* BadgeStrip — 4 wide */}
      <div className="col-span-4 bg-bg-panel/80 backdrop-blur-sm border border-text-muted/40 rounded p-3">
        <div className="text-[10px] text-text-muted tracking-widest uppercase mb-3">
          airlock.badge-strip (2 earned, 2 unearned)
        </div>
        <div id="demo-badge-strip" />
      </div>

      {/* ScoreAxisCard demos — 12 wide, 3 cards across */}
      <div className="col-span-12 bg-bg-panel/80 backdrop-blur-sm border border-text-muted/40 rounded p-3">
        <div className="text-[10px] text-text-muted tracking-widest uppercase mb-3">
          airlock.score-axis-card (OF cyan / GC green / BF amber-loading)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div id="demo-score-of" />
          <div id="demo-score-gc" />
          <div id="demo-score-bf" />
        </div>
      </div>
    </div>
  );
};


const rootEl = document.getElementById("airlock-demo-root");
if (rootEl) {
  createRoot(rootEl).render(<DemoPage />);
}
