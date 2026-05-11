// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import {
  LiveBadgeStrip,
  AIRLOCK_BADGE_CATALOG,
  __test,
} from "./LiveBadgeStrip";


describe("LiveBadgeStrip.__test.parseEarned", () => {
  it("returns [] for null / undefined / empty", () => {
    expect(__test.parseEarned(null)).toEqual([]);
    expect(__test.parseEarned(undefined)).toEqual([]);
    expect(__test.parseEarned("")).toEqual([]);
  });

  it("returns the array unchanged when given an array of strings", () => {
    expect(__test.parseEarned(["a", "b"])).toEqual(["a", "b"]);
  });

  it("filters non-strings out of an array input", () => {
    expect(__test.parseEarned(["a", 1 as never, "b"])).toEqual(["a", "b"]);
  });

  it("parses a JSON-text array (aiosqlite serialization shape)", () => {
    expect(__test.parseEarned('["fixer","skeptic"]')).toEqual([
      "fixer",
      "skeptic",
    ]);
  });

  it("returns [] on malformed JSON rather than throwing", () => {
    expect(__test.parseEarned("not-json[")).toEqual([]);
  });
});


describe("LiveBadgeStrip.__test.pickProfile", () => {
  it("picks the first record", () => {
    expect(__test.pickProfile([{ id: 1 }, { id: 2 }])).toEqual({ id: 1 });
  });

  it("returns null on empty array", () => {
    expect(__test.pickProfile([])).toBeNull();
  });
});


describe("LiveBadgeStrip integration", () => {
  it("renders loading state during fetch", () => {
    const fetcher = vi.fn(() => new Promise<Response>(() => {/* never */}));
    const { container } = render(
      <LiveBadgeStrip fetcher={fetcher as never} />,
    );
    const wrap = container.querySelector("[data-airlock-state='loading']");
    expect(wrap).not.toBeNull();
  });

  it("renders earned badges after fetch resolves", async () => {
    const profiles = [{ id: 1, all_badges: '["fixer","skeptic"]' }];
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(profiles), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const { container } = render(
      <LiveBadgeStrip fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector("[data-airlock-state='ready']");
      expect(wrap).not.toBeNull();
    });
    // The Fixer + Skeptic badges should render as earned. Check
    // for the aria-label suffix the underlying BadgeStrip emits.
    expect(container.innerHTML).toContain("Fixer (earned)");
    expect(container.innerHTML).toContain("Skeptic (earned)");
  });

  it("renders the full catalog even when earned is empty (first play)", async () => {
    const profiles = [{ id: 1, all_badges: null }];
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(profiles), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const { container } = render(
      <LiveBadgeStrip fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector("[data-airlock-state='ready']");
      expect(wrap).not.toBeNull();
    });
    // All five fallback-catalog badges are present as
    // unearned silhouettes.
    for (const def of AIRLOCK_BADGE_CATALOG) {
      expect(container.innerHTML).toContain(`${def.label} (not earned)`);
    }
  });

  it("renders empty profile (no records) as no badges earned", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const { container } = render(
      <LiveBadgeStrip fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector("[data-airlock-state='ready']");
      expect(wrap).not.toBeNull();
    });
    // Every catalog entry is unearned.
    expect(container.innerHTML).toContain("(not earned)");
    expect(container.innerHTML).not.toContain("(earned)");
  });

  it("renders load-failed state on fetch error", async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error("net")));
    const { container } = render(
      <LiveBadgeStrip fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-state='load-failed']",
      );
      expect(wrap).not.toBeNull();
    });
  });

  it("accepts a catalog override (tests / future grammar support)", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const customCatalog = [
      { key: "x", label: "Xenobiology", description: "alt", icon: "🦠" },
    ];
    const { container } = render(
      <LiveBadgeStrip fetcher={fetcher as never} catalog={customCatalog} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector("[data-airlock-state='ready']");
      expect(wrap).not.toBeNull();
    });
    expect(container.innerHTML).toContain("Xenobiology");
    // The default-catalog badges must NOT appear.
    expect(container.innerHTML).not.toContain("Diagnostician");
  });
});
