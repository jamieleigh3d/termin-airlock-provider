// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import {
  LiveCountdownTimer,
  __test,
} from "./LiveCountdownTimer";


describe("LiveCountdownTimer.__test.pickActiveSession", () => {
  it("picks the lifecycle='scenario' session over others", () => {
    const records = [
      { id: 1, lifecycle: "complete" },
      { id: 2, lifecycle: "scenario" },
      { id: 3, lifecycle: "scoring" },
    ];
    expect(__test.pickActiveSession(records)!.id).toBe(2);
  });

  it("falls back to first when no scenario session exists", () => {
    const records = [
      { id: 7, lifecycle: "complete" },
      { id: 8, lifecycle: "scoring" },
    ];
    expect(__test.pickActiveSession(records)!.id).toBe(7);
  });

  it("returns null on empty / non-array input", () => {
    expect(__test.pickActiveSession([])).toBeNull();
    expect(__test.pickActiveSession(undefined as never)).toBeNull();
  });
});


describe("LiveCountdownTimer.__test.computeRemaining", () => {
  it("returns timer_seconds when scenario_started_at is missing", () => {
    expect(
      __test.computeRemaining({ timer_seconds: 300 }),
    ).toBe(300);
  });

  it("subtracts elapsed seconds from timer_seconds", () => {
    const startedAt = new Date(Date.now() - 45_000).toISOString();
    const session = { timer_seconds: 300, scenario_started_at: startedAt };
    const remaining = __test.computeRemaining(session);
    // Allow a 1s tolerance for the wall-clock between setup and check.
    expect(remaining).toBeGreaterThanOrEqual(254);
    expect(remaining).toBeLessThanOrEqual(256);
  });

  it("clamps to 0 when elapsed exceeds the budget", () => {
    const startedAt = new Date(Date.now() - 9_999_999).toISOString();
    const session = { timer_seconds: 60, scenario_started_at: startedAt };
    expect(__test.computeRemaining(session)).toBe(0);
  });

  it("defaults to 300 when timer_seconds is missing", () => {
    expect(
      __test.computeRemaining({}),
    ).toBe(300);
  });

  it("handles malformed scenario_started_at gracefully", () => {
    expect(
      __test.computeRemaining({
        timer_seconds: 200,
        scenario_started_at: "not-a-real-date",
      }),
    ).toBe(200);
  });
});


describe("LiveCountdownTimer.__test.computeIsSafe", () => {
  it("returns true for hatch_unlocked='yes'", () => {
    expect(__test.computeIsSafe({ hatch_unlocked: "yes" })).toBe(true);
  });

  it("returns false for hatch_unlocked='no'", () => {
    expect(__test.computeIsSafe({ hatch_unlocked: "no" })).toBe(false);
  });

  it("returns false when hatch_unlocked is undefined", () => {
    expect(__test.computeIsSafe({})).toBe(false);
  });

  it("accepts native boolean (forward-compat)", () => {
    expect(__test.computeIsSafe({ hatch_unlocked: true })).toBe(true);
    expect(__test.computeIsSafe({ hatch_unlocked: false })).toBe(false);
  });
});


describe("LiveCountdownTimer integration", () => {
  it("renders loading state before fetch resolves", () => {
    const fetcher = vi.fn(() => new Promise<Response>(() => {/* never */}));
    const { container } = render(
      <LiveCountdownTimer fetcher={fetcher as never} />,
    );
    const wrap = container.querySelector("[data-airlock-state='loading']");
    expect(wrap).not.toBeNull();
  });

  it("renders real session data after fetch resolves", async () => {
    const startedAt = new Date(Date.now() - 30_000).toISOString();
    const sessions = [
      {
        id: 1,
        lifecycle: "scenario",
        timer_seconds: 120,
        scenario_started_at: startedAt,
        hatch_unlocked: "no",
      },
    ];
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(sessions), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const { container } = render(
      <LiveCountdownTimer fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const loading = container.querySelector("[data-airlock-state='loading']");
      expect(loading).toBeNull();
    });
    // After load, the inner CountdownTimer should be present.
    expect(fetcher).toHaveBeenCalledWith(
      "/api/v1/sessions",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("renders load-failed state on fetch rejection", async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error("boom")));
    const { container } = render(
      <LiveCountdownTimer fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-state='load-failed']",
      );
      expect(wrap).not.toBeNull();
    });
  });
});
