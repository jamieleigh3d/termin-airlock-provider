// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { ScoreAxisCard } from "./ScoreAxisCard";

describe("ScoreAxisCard", () => {
  it("renders the axis title and current-level label", () => {
    const { container } = render(
      <ScoreAxisCard
        title="Operational Fluency"
        accent="cyan"
        levelLabel="Architect"
        levelDescription="Designs and orchestrates AI workflows."
        currentLevel={4}
        maxLevel={4}
      />,
    );
    expect(container.textContent).toContain("Operational Fluency");
    expect(container.textContent).toContain("Architect");
    expect(container.textContent).toContain(
      "Designs and orchestrates AI workflows.",
    );
  });

  it("renders the progress bar with one segment per level", () => {
    const { container } = render(
      <ScoreAxisCard
        title="Generative Capacity"
        accent="green"
        levelLabel="Active"
        levelDescription="Generates novel directions."
        currentLevel={2}
        maxLevel={3}
      />,
    );
    const segments = container.querySelectorAll(
      "[data-airlock-component='score-axis-card'] [data-airlock-state='progress-segment']",
    );
    expect(segments.length).toBe(3);
  });

  it("marks segments at or below currentLevel as filled", () => {
    const { container } = render(
      <ScoreAxisCard
        title="Boundary Fluency"
        accent="amber"
        levelLabel="Probing"
        levelDescription="Tests assumptions."
        currentLevel={3}
        maxLevel={4}
      />,
    );
    const filled = container.querySelectorAll(
      "[data-airlock-state='progress-segment'][data-airlock-filled='true']",
    );
    expect(filled.length).toBe(3);
    const empty = container.querySelectorAll(
      "[data-airlock-state='progress-segment'][data-airlock-filled='false']",
    );
    expect(empty.length).toBe(1);
  });

  it("applies the accent prop to the data attribute so the runtime can verify routing", () => {
    const { container } = render(
      <ScoreAxisCard
        title="OF"
        accent="cyan"
        levelLabel="L1"
        levelDescription="d"
        currentLevel={1}
        maxLevel={3}
      />,
    );
    const root = container.querySelector(
      "[data-airlock-component='score-axis-card']",
    );
    expect(root?.getAttribute("data-airlock-accent")).toBe("cyan");
  });

  it("renders evidence list when evidence is non-empty", () => {
    const { container } = render(
      <ScoreAxisCard
        title="OF"
        accent="cyan"
        levelLabel="L2"
        levelDescription="d"
        currentLevel={2}
        maxLevel={3}
        evidence={["ran diagnostics_scan", "interpreted JSON output"]}
      />,
    );
    expect(container.textContent).toContain("Evidence");
    expect(container.textContent).toContain("ran diagnostics_scan");
    expect(container.textContent).toContain("interpreted JSON output");
  });

  it("omits the evidence section when evidence is empty or undefined", () => {
    const { container } = render(
      <ScoreAxisCard
        title="OF"
        accent="cyan"
        levelLabel="L2"
        levelDescription="d"
        currentLevel={2}
        maxLevel={3}
      />,
    );
    expect(container.textContent).not.toContain("Evidence");
  });

  it("renders the next-level tip when supplied", () => {
    const { container } = render(
      <ScoreAxisCard
        title="OF"
        accent="cyan"
        levelLabel="L2"
        levelDescription="d"
        currentLevel={2}
        maxLevel={3}
        nextTip="Try chaining two tools together."
      />,
    );
    expect(container.textContent).toContain("Try chaining two tools together.");
  });

  it("supports a loading state with no level data", () => {
    // Used on the Scoring page (Phase 3 transitional view) — the
    // evaluator hasn't returned yet so no level is available.
    const { container } = render(
      <ScoreAxisCard
        title="Operational Fluency"
        accent="cyan"
        loading={true}
        maxLevel={4}
      />,
    );
    expect(container.textContent).toContain("Operational Fluency");
    expect(container.textContent?.toLowerCase()).toContain("scoring");
    // Progress bar still renders so the layout doesn't shift on
    // hydration; segments are all unfilled in loading mode.
    const filled = container.querySelectorAll(
      "[data-airlock-state='progress-segment'][data-airlock-filled='true']",
    );
    expect(filled.length).toBe(0);
  });

  it("aria-label on the progress bar communicates the level rather than relying on color", () => {
    const { container } = render(
      <ScoreAxisCard
        title="OF"
        accent="cyan"
        levelLabel="L3"
        levelDescription="d"
        currentLevel={3}
        maxLevel={4}
      />,
    );
    const bar = container.querySelector(
      "[data-airlock-state='progress-bar']",
    );
    expect(bar?.getAttribute("role")).toBe("progressbar");
    expect(bar?.getAttribute("aria-valuenow")).toBe("3");
    expect(bar?.getAttribute("aria-valuemax")).toBe("4");
    expect(bar?.getAttribute("aria-valuemin")).toBe("0");
    expect(bar?.getAttribute("aria-label")).toContain("Level 3 of 4");
  });

  it("clamps currentLevel below 0 to 0", () => {
    const { container } = render(
      <ScoreAxisCard
        title="OF"
        accent="cyan"
        levelLabel="L0"
        levelDescription="d"
        currentLevel={-2}
        maxLevel={3}
      />,
    );
    const filled = container.querySelectorAll(
      "[data-airlock-state='progress-segment'][data-airlock-filled='true']",
    );
    expect(filled.length).toBe(0);
  });

  it("clamps currentLevel above maxLevel to maxLevel", () => {
    const { container } = render(
      <ScoreAxisCard
        title="OF"
        accent="cyan"
        levelLabel="MAX"
        levelDescription="d"
        currentLevel={99}
        maxLevel={4}
      />,
    );
    const filled = container.querySelectorAll(
      "[data-airlock-state='progress-segment'][data-airlock-filled='true']",
    );
    expect(filled.length).toBe(4);
  });
});
