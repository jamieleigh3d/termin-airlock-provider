// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import {
  LiveScoreAxisCards,
  AIRLOCK_AXES,
  __test,
} from "./LiveScoreAxisCards";


describe("LiveScoreAxisCards.__test.pickScoringSession", () => {
  it("prefers complete over scoring over other", () => {
    const records = [
      { id: 1, lifecycle: "scenario" },
      { id: 2, lifecycle: "scoring" },
      { id: 3, lifecycle: "complete" },
    ];
    expect(__test.pickScoringSession(records)!.id).toBe(3);
  });

  it("returns scoring session when no complete exists", () => {
    const records = [
      { id: 1, lifecycle: "scenario" },
      { id: 2, lifecycle: "scoring" },
    ];
    expect(__test.pickScoringSession(records)!.id).toBe(2);
  });

  it("falls back to first record when neither complete nor scoring exists", () => {
    const records = [
      { id: 7, lifecycle: "scenario" },
      { id: 8, lifecycle: "survey" },
    ];
    expect(__test.pickScoringSession(records)!.id).toBe(7);
  });

  it("returns null on empty array", () => {
    expect(__test.pickScoringSession([])).toBeNull();
  });
});


describe("LiveScoreAxisCards.__test.parseScores", () => {
  it("returns empty for null/undefined", () => {
    expect(__test.parseScores(null)).toEqual({});
    expect(__test.parseScores(undefined)).toEqual({});
  });

  it("returns the object unchanged when passed an object", () => {
    const obj = { operational_fluency: { level: 3 } };
    expect(__test.parseScores(obj)).toEqual(obj);
  });

  it("parses a JSON string (aiosqlite stores structured fields as text)", () => {
    const json = JSON.stringify({ generative_capacity: { level: 2 } });
    expect(__test.parseScores(json)).toEqual({
      generative_capacity: { level: 2 },
    });
  });

  it("returns empty on malformed JSON rather than throwing", () => {
    expect(__test.parseScores("not-json{")).toEqual({});
  });
});


describe("LiveScoreAxisCards composition", () => {
  it("renders one card per axis (three for the airlock spec)", () => {
    const fetcher = vi.fn(() => new Promise<Response>(() => {/* never */}));
    const { container } = render(
      <LiveScoreAxisCards fetcher={fetcher as never} />,
    );
    expect(AIRLOCK_AXES.length).toBe(3);
    // While the fetch is pending, every card renders in loading
    // state. The card root carries data-airlock-component when the
    // ScoreAxisCard component declares one — for the smoke check
    // we count progressbar nodes.
    const progressbars = container.querySelectorAll(
      "[role='progressbar']",
    );
    expect(progressbars.length).toBe(3);
  });

  it("renders all cards in loading state while fetch pending", () => {
    const fetcher = vi.fn(() => new Promise<Response>(() => {/* never */}));
    const { container } = render(
      <LiveScoreAxisCards fetcher={fetcher as never} />,
    );
    const wrap = container.querySelector(
      "[data-airlock-component='score-axis-cards']",
    );
    expect(wrap?.getAttribute("data-airlock-state")).toBe("loading");
  });

  it("renders each card with its scoring data after fetch resolves", async () => {
    const scores = {
      operational_fluency: {
        level: 3,
        level_label: "Architect",
        level_description: "Directs rather than follows",
      },
      generative_capacity: {
        level: 2,
        level_label: "Emergent",
        level_description: "Begins to create transferable value",
      },
      boundary_fluency: {
        level: 1,
        level_label: "Compliant",
        level_description: "Stays within spec",
      },
    };
    const sessions = [
      { id: 1, lifecycle: "complete", scores },
    ];
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(sessions), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const { container } = render(
      <LiveScoreAxisCards fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-component='score-axis-cards']",
      );
      expect(wrap?.getAttribute("data-airlock-state")).toBe("ready");
    });
    expect(container.textContent).toContain("Architect");
    expect(container.textContent).toContain("Emergent");
    expect(container.textContent).toContain("Compliant");
  });

  it("renders load-failed state on fetch error", async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error("net")));
    const { container } = render(
      <LiveScoreAxisCards fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-component='score-axis-cards']",
      );
      expect(wrap?.getAttribute("data-airlock-state")).toBe("load-failed");
    });
  });

  it("renders loading per-axis when the scoring object lacks an axis", async () => {
    // Partial scoring: only OF is filled in. GC + BF should
    // render in loading state.
    const scores = {
      operational_fluency: {
        level: 3,
        level_label: "Architect",
      },
    };
    const sessions = [{ id: 1, lifecycle: "scoring", scores }];
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(sessions), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const { container } = render(
      <LiveScoreAxisCards fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain("Architect");
    });
    // GC + BF should still be in "Scoring…" placeholder.
    expect(container.textContent).toMatch(/Scoring/i);
  });
});
