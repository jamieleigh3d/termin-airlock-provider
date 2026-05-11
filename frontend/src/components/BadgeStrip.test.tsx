// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { BadgeStrip, BadgeDef } from "./BadgeStrip";

// Sample 4-badge catalog — generic content used in tests only. The
// production catalog is supplied by the .termin source / runtime
// (NOT hardcoded in this repo — the product content lives elsewhere).
const SAMPLE_CATALOG: BadgeDef[] = [
  { key: "alpha", label: "Alpha", description: "First in alphabet.", icon: "A" },
  { key: "beta", label: "Beta", description: "Second in alphabet.", icon: "B" },
  { key: "gamma", label: "Gamma", description: "Third in alphabet.", icon: "G" },
  { key: "delta", label: "Delta", description: "Fourth in alphabet.", icon: "D" },
];

describe("BadgeStrip", () => {
  it("renders one badge tile per catalog entry", () => {
    const { container } = render(
      <BadgeStrip catalog={SAMPLE_CATALOG} earned={["alpha"]} />,
    );
    const tiles = container.querySelectorAll(
      "[data-airlock-component='badge-strip'] [data-airlock-badge]",
    );
    expect(tiles.length).toBe(4);
  });

  it("marks earned badges with data-airlock-earned='true'", () => {
    const { container } = render(
      <BadgeStrip catalog={SAMPLE_CATALOG} earned={["alpha", "gamma"]} />,
    );
    const earned = container.querySelectorAll(
      "[data-airlock-badge][data-airlock-earned='true']",
    );
    expect(earned.length).toBe(2);
    const earnedKeys = [...earned].map(
      (el) => (el as HTMLElement).getAttribute("data-airlock-key"),
    );
    expect(earnedKeys.sort()).toEqual(["alpha", "gamma"]);
  });

  it("marks unearned badges with data-airlock-earned='false'", () => {
    const { container } = render(
      <BadgeStrip catalog={SAMPLE_CATALOG} earned={["beta"]} />,
    );
    const unearned = container.querySelectorAll(
      "[data-airlock-badge][data-airlock-earned='false']",
    );
    expect(unearned.length).toBe(3);
  });

  it("renders the badge label and icon for each tile", () => {
    const { container } = render(
      <BadgeStrip catalog={SAMPLE_CATALOG} earned={[]} />,
    );
    expect(container.textContent).toContain("Alpha");
    expect(container.textContent).toContain("Beta");
    expect(container.textContent).toContain("A"); // Alpha icon
    expect(container.textContent).toContain("B"); // Beta icon
  });

  it("uses a title attribute carrying the badge description for hover", () => {
    const { container } = render(
      <BadgeStrip catalog={SAMPLE_CATALOG} earned={[]} />,
    );
    const alphaTile = container.querySelector(
      "[data-airlock-badge][data-airlock-key='alpha']",
    );
    expect(alphaTile?.getAttribute("title")).toBe("First in alphabet.");
  });

  it("annotates each tile with an aria-label that includes the earned state", () => {
    const { container } = render(
      <BadgeStrip catalog={SAMPLE_CATALOG} earned={["alpha"]} />,
    );
    const alphaTile = container.querySelector(
      "[data-airlock-badge][data-airlock-key='alpha']",
    );
    const betaTile = container.querySelector(
      "[data-airlock-badge][data-airlock-key='beta']",
    );
    expect(alphaTile?.getAttribute("aria-label")).toBe("Alpha (earned)");
    expect(betaTile?.getAttribute("aria-label")).toBe("Beta (not earned)");
  });

  it("renders an empty strip when the catalog is empty", () => {
    const { container } = render(<BadgeStrip catalog={[]} earned={["foo"]} />);
    const tiles = container.querySelectorAll("[data-airlock-badge]");
    expect(tiles.length).toBe(0);
    // The strip wrapper still renders so the contract mount-point
    // is visible in the DOM (the runtime expects something there).
    expect(
      container.querySelector("[data-airlock-component='badge-strip']"),
    ).not.toBeNull();
  });

  it("ignores 'earned' keys that don't appear in the catalog", () => {
    const { container } = render(
      <BadgeStrip catalog={SAMPLE_CATALOG} earned={["alpha", "nonexistent"]} />,
    );
    // Only Alpha matches the catalog.
    const earned = container.querySelectorAll(
      "[data-airlock-badge][data-airlock-earned='true']",
    );
    expect(earned.length).toBe(1);
    // The orphan 'nonexistent' key doesn't get its own tile.
    const tiles = container.querySelectorAll("[data-airlock-badge]");
    expect(tiles.length).toBe(4);
  });

  it("does not render text content with the unearned suffix in the tile body itself (only in aria-label)", () => {
    // The unearned distinction is visual + aria-label only; the
    // tile body shows the label cleanly so the strip reads as a
    // list of badge names without "(not earned)" noise.
    const { container } = render(
      <BadgeStrip catalog={SAMPLE_CATALOG} earned={[]} />,
    );
    const alphaTile = container.querySelector(
      "[data-airlock-badge][data-airlock-key='alpha']",
    );
    expect(alphaTile?.textContent).not.toContain("(not earned)");
    expect(alphaTile?.textContent).toContain("Alpha");
  });
});
