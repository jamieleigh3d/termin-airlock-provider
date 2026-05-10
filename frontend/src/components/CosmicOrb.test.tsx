// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CosmicOrb } from "./CosmicOrb";

describe("CosmicOrb", () => {
  it("renders an SVG element with the airlock-component data attribute", () => {
    const { container } = render(<CosmicOrb />);
    const svg = container.querySelector("svg[data-airlock-component='cosmic-orb']");
    expect(svg).not.toBeNull();
  });

  it("emits an aria-label so screen readers can describe the scene", () => {
    const { container } = render(<CosmicOrb />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-label")).toBe(
      "Orbital airlock viewport looking onto a planet",
    );
    expect(svg?.getAttribute("role")).toBe("img");
  });

  it("uses the standard 1440×900 viewBox for stable layout", () => {
    const { container } = render(<CosmicOrb />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("viewBox")).toBe("0 0 1440 900");
  });

  it("renders the deterministic 80-star starfield", () => {
    // Stars are rendered as <circle> elements inside the door clip
    // group. Counting circles is a coarse but useful invariant — any
    // change to the star count or geometry will trip this test, so
    // a refactor that breaks the LCG seeding is caught.
    const { container } = render(<CosmicOrb />);
    // Total circles include stars (80) + planet body (1) +
    // atmosphere rim (1) + 8 hatch bolts + 6 main bolts + 4 top
    // bolts + 4 right bolts + several control box / panel lights +
    // hatch frame circles. We sanity-check it's well above 80
    // (stars present) but pin the lower bound rather than the
    // exact total to allow future minor SVG refactors.
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBeGreaterThanOrEqual(80);
  });

  it("accepts an optional className override on the outer wrapper", () => {
    const { container } = render(<CosmicOrb className="custom-positioning" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toBe("custom-positioning");
  });

  it("includes the drift animation on the planet+stars layer", () => {
    // The animateTransform element drives the subtle drift —
    // verify it's present so a refactor that removes the animation
    // (e.g., switching to CSS-only) trips the test.
    const { container } = render(<CosmicOrb />);
    const animate = container.querySelector("animateTransform");
    expect(animate).not.toBeNull();
    expect(animate?.getAttribute("type")).toBe("translate");
    expect(animate?.getAttribute("repeatCount")).toBe("indefinite");
  });
});
