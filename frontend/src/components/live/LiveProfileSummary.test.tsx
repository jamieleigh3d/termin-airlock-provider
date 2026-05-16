// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { LiveProfileSummary, __test } from "./LiveProfileSummary";


describe("LiveProfileSummary.__test.pickProfile", () => {
  it("returns the first record when records present", () => {
    expect(
      __test.pickProfile([{ id: 1 }, { id: 2 }]),
    ).toEqual({ id: 1 });
  });

  it("returns null on empty array", () => {
    expect(__test.pickProfile([])).toBeNull();
  });

  it("returns null on non-array input", () => {
    expect(__test.pickProfile(null as never)).toBeNull();
    expect(__test.pickProfile(undefined as never)).toBeNull();
  });
});


describe("LiveProfileSummary.__test.formatLevelLabel", () => {
  it("title-cases enum strings (emergent → Emergent)", () => {
    expect(__test.formatLevelLabel("emergent")).toBe("Emergent");
    expect(__test.formatLevelLabel("curious")).toBe("Curious");
  });

  it("renders numeric level as Level N", () => {
    expect(__test.formatLevelLabel(3)).toBe("Level 3");
    expect(__test.formatLevelLabel(0)).toBe("Level 0");
  });

  it("renders the none sentinel as a placeholder dash", () => {
    expect(__test.formatLevelLabel("none")).toBe("—");
  });

  it("renders undefined / null as a placeholder dash", () => {
    expect(__test.formatLevelLabel(undefined)).toBe("—");
    expect(__test.formatLevelLabel(null as never)).toBe("—");
  });
});


describe("LiveProfileSummary.__test.parseBadgeCount", () => {
  it("returns 0 for null / undefined / empty", () => {
    expect(__test.parseBadgeCount(null)).toBe(0);
    expect(__test.parseBadgeCount(undefined)).toBe(0);
    expect(__test.parseBadgeCount("")).toBe(0);
  });

  it("returns array length when input is already an array", () => {
    expect(__test.parseBadgeCount(["a", "b", "c"])).toBe(3);
  });

  it("parses JSON-text array (aiosqlite serialization shape)", () => {
    expect(__test.parseBadgeCount('["fixer","skeptic"]')).toBe(2);
  });

  it("returns 0 on malformed JSON rather than throwing", () => {
    expect(__test.parseBadgeCount("not-json[")).toBe(0);
  });
});


describe("LiveProfileSummary integration", () => {
  it("renders loading state during fetch", () => {
    const fetcher = vi.fn(() => new Promise<Response>(() => {/* never */}));
    const { container } = render(
      <LiveProfileSummary fetcher={fetcher as never} />,
    );
    const wrap = container.querySelector(
      "[data-airlock-component='profile-summary']",
    );
    expect(wrap?.getAttribute("data-airlock-state")).toBe("loading");
  });

  it("renders empty-profile state when no records returned (first play)", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const { container } = render(
      <LiveProfileSummary fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-component='profile-summary']",
      );
      expect(wrap?.getAttribute("data-airlock-state")).toBe("empty");
    });
    // Empty state should mention zero attempts so a first-time
    // player understands the page rather than seeing only dashes.
    expect(container.textContent).toMatch(/0\s+attempts/i);
  });

  it("renders ready state with filled profile fields", async () => {
    const profiles = [{
      id: 1,
      best_of_level: 3,
      best_gc_level: "emergent",
      best_bf_level: "curious",
      total_attempts: 7,
      all_badges: '["fixer","skeptic","decisive"]',
    }];
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(profiles), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const { container } = render(
      <LiveProfileSummary fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-component='profile-summary']",
      );
      expect(wrap?.getAttribute("data-airlock-state")).toBe("ready");
    });
    // Per-axis labels — OF is numeric, GC/BF are enum strings.
    expect(container.textContent).toContain("Level 3");
    expect(container.textContent).toContain("Emergent");
    expect(container.textContent).toContain("Curious");
    // Counts.
    expect(container.textContent).toMatch(/7\s+attempts/i);
    expect(container.textContent).toMatch(/3\s+badges/i);
  });

  it("renders the none sentinel as a dash placeholder", async () => {
    const profiles = [{
      id: 1,
      best_of_level: 0,
      best_gc_level: "none",
      best_bf_level: "none",
      total_attempts: 0,
      all_badges: null,
    }];
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(profiles), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const { container } = render(
      <LiveProfileSummary fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-component='profile-summary']",
      );
      expect(wrap?.getAttribute("data-airlock-state")).toBe("ready");
    });
    // OF reads as Level 0 (numeric); GC/BF read as the dash
    // placeholder so the visual "you have no record yet" signal is
    // not a colorblind-hostile blank space.
    expect(container.textContent).toContain("Level 0");
    expect(container.textContent).toContain("—");
  });

  it("renders load-failed state on fetch error", async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error("net")));
    const { container } = render(
      <LiveProfileSummary fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-component='profile-summary']",
      );
      expect(wrap?.getAttribute("data-airlock-state")).toBe("load-failed");
    });
  });
});
