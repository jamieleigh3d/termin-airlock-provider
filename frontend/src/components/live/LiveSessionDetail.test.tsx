// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { LiveSessionDetail, __test } from "./LiveSessionDetail";


describe("LiveSessionDetail.__test.parseScores", () => {
  it("returns null for null / undefined", () => {
    expect(__test.parseScores(null)).toBeNull();
    expect(__test.parseScores(undefined)).toBeNull();
  });

  it("returns the object unchanged when input is an object", () => {
    const obj = { of_level: 3 };
    expect(__test.parseScores(obj)).toEqual(obj);
  });

  it("parses JSON-text scores field (aiosqlite serialization shape)", () => {
    expect(__test.parseScores('{"of_level":3,"gc_level":"emergent"}'))
      .toEqual({ of_level: 3, gc_level: "emergent" });
  });

  it("returns null on malformed JSON rather than throwing", () => {
    expect(__test.parseScores("not-json{")).toBeNull();
  });
});


describe("LiveSessionDetail.__test.idFromPathname", () => {
  it("returns the last segment of /<slug>/<id>", () => {
    expect(__test.idFromPathname("/session_detail/abc-123")).toBe("abc-123");
  });

  it("strips a trailing slash", () => {
    expect(__test.idFromPathname("/session_detail/abc-123/")).toBe("abc-123");
  });

  it("returns empty string when no segments after slug", () => {
    expect(__test.idFromPathname("/session_detail")).toBe("");
    expect(__test.idFromPathname("/")).toBe("");
  });
});


describe("LiveSessionDetail integration", () => {
  beforeEach(() => {
    // Simulate the URL pathname for each test. The wrapper reads
    // window.location.pathname to determine which record to fetch.
    Object.defineProperty(window, "location", {
      writable: true,
      value: { pathname: "/session_detail/abc-123" },
    });
  });
  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { pathname: "/" },
    });
  });

  it("renders loading state during fetch", () => {
    const fetcher = vi.fn(() => new Promise<Response>(() => {/* never */}));
    const { container } = render(
      <LiveSessionDetail fetcher={fetcher as never} />,
    );
    const wrap = container.querySelector(
      "[data-airlock-component='session-detail']",
    );
    expect(wrap?.getAttribute("data-airlock-state")).toBe("loading");
  });

  it("renders load-failed when fetch errors", async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error("net")));
    const { container } = render(
      <LiveSessionDetail fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-component='session-detail']",
      );
      expect(wrap?.getAttribute("data-airlock-state")).toBe("load-failed");
    });
  });

  it("renders not-found state on 404", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response("Not found", { status: 404 })),
    );
    const { container } = render(
      <LiveSessionDetail fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-component='session-detail']",
      );
      expect(wrap?.getAttribute("data-airlock-state")).toBe("not-found");
    });
  });

  it("renders ready state with score axis cards + summary", async () => {
    const session = {
      id: "abc-123",
      created_at: "2026-05-12T10:00:00Z",
      lifecycle: "complete",
      scores: JSON.stringify({
        of_level: 3,
        of_evidence: ["caught the diagnosis flaw"],
        of_next: "direct ARIA more proactively",
        gc_level: "emergent",
        gc_evidence: ["helped Reeves"],
        gc_next: "create a script",
        bf_level: "curious",
        bf_evidence: ["asked about hidden tools"],
        bf_next: "try probing",
        badges: ["fixer", "skeptic"],
        calibration: "Self-rated 6, demonstrated Level 3 — well calibrated",
        summary: "Strong diagnostic instincts; questioned ARIA's first answer.",
      }),
    };
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(session), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const { container } = render(
      <LiveSessionDetail fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-component='session-detail']",
      );
      expect(wrap?.getAttribute("data-airlock-state")).toBe("ready");
    });
    // Per-axis labels: OF numeric → Level 3, GC/BF enum → title-cased.
    expect(container.textContent).toContain("Level 3");
    expect(container.textContent).toContain("Emergent");
    expect(container.textContent).toContain("Curious");
    // Summary + calibration display.
    expect(container.textContent).toContain(
      "Strong diagnostic instincts",
    );
    expect(container.textContent).toContain("well calibrated");
    // At least one progressbar per axis (3 axes).
    const progressbars = container.querySelectorAll(
      "[role='progressbar']",
    );
    expect(progressbars.length).toBe(3);
  });

  it("hits /api/v1/sessions/<id> with the id from the URL", async () => {
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    render(<LiveSessionDetail fetcher={fetcher as never} />);
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalled();
    });
    const callArg = (fetcher as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArg).toBe("/api/v1/sessions/abc-123");
  });

  it("renders empty-id error when URL has no id segment", async () => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { pathname: "/session_detail" },
    });
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response("[]", { status: 200 })),
    );
    const { container } = render(
      <LiveSessionDetail fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector(
        "[data-airlock-component='session-detail']",
      );
      // With no id, no fetch should fire and the component shows a
      // not-found state immediately.
      expect(wrap?.getAttribute("data-airlock-state")).toBe("not-found");
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
