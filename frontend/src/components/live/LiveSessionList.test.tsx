// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import { describe, it, expect, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { LiveSessionList, __test } from "./LiveSessionList";


describe("LiveSessionList.__test.sortByCreatedDesc", () => {
  it("returns most-recent first when given mixed order", () => {
    const records = [
      { id: 1, created_at: "2026-05-10T10:00:00Z" },
      { id: 2, created_at: "2026-05-12T10:00:00Z" },
      { id: 3, created_at: "2026-05-11T10:00:00Z" },
    ];
    const sorted = __test.sortByCreatedDesc(records);
    expect(sorted.map((r) => r.id)).toEqual([2, 3, 1]);
  });

  it("places records missing created_at last (stable for the rest)", () => {
    const records = [
      { id: 1, created_at: "2026-05-10T10:00:00Z" },
      { id: 2 },
      { id: 3, created_at: "2026-05-12T10:00:00Z" },
    ];
    const sorted = __test.sortByCreatedDesc(records);
    expect(sorted.map((r) => r.id)).toEqual([3, 1, 2]);
  });

  it("does not mutate the input array", () => {
    const records = [
      { id: 1, created_at: "2026-05-10T10:00:00Z" },
      { id: 2, created_at: "2026-05-12T10:00:00Z" },
    ];
    const snapshot = records.map((r) => r.id);
    __test.sortByCreatedDesc(records);
    expect(records.map((r) => r.id)).toEqual(snapshot);
  });
});


describe("LiveSessionList.__test.parseScores", () => {
  it("returns null for null / undefined", () => {
    expect(__test.parseScores(null)).toBeNull();
    expect(__test.parseScores(undefined)).toBeNull();
  });

  it("returns the object unchanged when input is an object", () => {
    const obj = { of_level: 3 };
    expect(__test.parseScores(obj)).toEqual(obj);
  });

  it("parses a JSON-text scores field (aiosqlite serialization shape)", () => {
    expect(__test.parseScores('{"of_level":3,"gc_level":"emergent"}'))
      .toEqual({ of_level: 3, gc_level: "emergent" });
  });

  it("returns null on malformed JSON rather than throwing", () => {
    expect(__test.parseScores("not-json{")).toBeNull();
  });
});


describe("LiveSessionList.__test.summarizeOfLevel", () => {
  it("formats a numeric OF level as Level N", () => {
    expect(__test.summarizeOfLevel({ of_level: 3 })).toBe("Level 3");
  });

  it("renders a dash when scores is null (incomplete session)", () => {
    expect(__test.summarizeOfLevel(null)).toBe("—");
  });

  it("renders a dash when of_level is missing", () => {
    expect(__test.summarizeOfLevel({})).toBe("—");
  });
});


describe("LiveSessionList integration", () => {
  it("renders loading state during fetch", () => {
    const fetcher = vi.fn(() => new Promise<Response>(() => {/* never */}));
    const { container } = render(
      <LiveSessionList fetcher={fetcher as never} />,
    );
    const wrap = container.querySelector(
      "[data-airlock-component='session-list']",
    );
    expect(wrap?.getAttribute("data-airlock-state")).toBe("loading");
  });

  it("renders empty state when no sessions returned (first-time player)", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response("[]", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const { container } = render(
      <LiveSessionList fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-component='session-list']",
      );
      expect(wrap?.getAttribute("data-airlock-state")).toBe("empty");
    });
    // The empty state must give a first-time player a clue what
    // they're seeing rather than only a blank box.
    expect(container.textContent).toMatch(/no\s+attempts/i);
  });

  it("renders one row per session with lifecycle + OF score", async () => {
    const sessions = [
      {
        id: 11,
        created_at: "2026-05-12T10:00:00Z",
        lifecycle: "complete",
        scores: '{"of_level":3,"gc_level":"emergent","bf_level":"curious"}',
      },
      {
        id: 12,
        created_at: "2026-05-10T10:00:00Z",
        lifecycle: "expired",
        scores: null,
      },
    ];
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(sessions), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const { container } = render(
      <LiveSessionList fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-component='session-list']",
      );
      expect(wrap?.getAttribute("data-airlock-state")).toBe("ready");
    });
    const rows = container.querySelectorAll("[data-airlock-row]");
    expect(rows.length).toBe(2);
    // Lifecycle badges visible.
    expect(container.textContent).toContain("complete");
    expect(container.textContent).toContain("expired");
    // OF Level 3 on the completed row.
    expect(container.textContent).toContain("Level 3");
    // Expired row renders a dash placeholder (no scores).
    expect(container.textContent).toContain("—");
  });

  it("sorts rows most-recent-first regardless of API order", async () => {
    // Out-of-order API response on purpose.
    const sessions = [
      { id: 1, created_at: "2026-05-10T10:00:00Z", lifecycle: "complete" },
      { id: 2, created_at: "2026-05-12T10:00:00Z", lifecycle: "complete" },
    ];
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(sessions), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const { container } = render(
      <LiveSessionList fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-component='session-list']",
      );
      expect(wrap?.getAttribute("data-airlock-state")).toBe("ready");
    });
    const rows = container.querySelectorAll("[data-airlock-row]");
    expect(rows[0].getAttribute("data-airlock-row")).toBe("2");
    expect(rows[1].getAttribute("data-airlock-row")).toBe("1");
  });

  it("renders a View Detail control per row (inert in Phase 1)", async () => {
    const sessions = [{
      id: 99,
      created_at: "2026-05-12T10:00:00Z",
      lifecycle: "complete",
      scores: '{"of_level":3}',
    }];
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(sessions), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const { container } = render(
      <LiveSessionList fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-component='session-list']",
      );
      expect(wrap?.getAttribute("data-airlock-state")).toBe("ready");
    });
    // The View Detail affordance is rendered as a control with a
    // testable selector; Phase 2 wires the click handler once the
    // detail-page grammar primitive lands.
    const detail = container.querySelector(
      "[data-airlock-action='view-detail']",
    );
    expect(detail).not.toBeNull();
  });

  it("renders load-failed state on fetch error", async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error("net")));
    const { container } = render(
      <LiveSessionList fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-component='session-list']",
      );
      expect(wrap?.getAttribute("data-airlock-state")).toBe("load-failed");
    });
  });
});
