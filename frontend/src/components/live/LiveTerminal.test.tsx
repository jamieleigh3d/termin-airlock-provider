// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import { LiveTerminal, __test } from "./LiveTerminal";


describe("LiveTerminal.__test.pickActiveSession", () => {
  it("prefers lifecycle='scenario'", () => {
    const records = [
      { id: 1, lifecycle: "complete" },
      { id: 2, lifecycle: "scenario" },
    ];
    expect(__test.pickActiveSession(records)!.id).toBe(2);
  });

  it("falls back to first when no scenario session exists", () => {
    expect(
      __test.pickActiveSession([{ id: 9, lifecycle: "scoring" }])!.id,
    ).toBe(9);
  });

  it("returns null on empty array", () => {
    expect(__test.pickActiveSession([])).toBeNull();
  });
});


describe("LiveTerminal.__test.parseEntries", () => {
  it("returns array unchanged", () => {
    const entries = [{ id: "e1", kind: "user", body: "hi" }];
    expect(__test.parseEntries(entries as never)).toEqual(entries);
  });

  it("parses JSON-text payload (aiosqlite shape)", () => {
    expect(
      __test.parseEntries('[{"id":"e1","kind":"user","body":"hi"}]'),
    ).toEqual([{ id: "e1", kind: "user", body: "hi" }]);
  });

  it("returns [] for null / undefined", () => {
    expect(__test.parseEntries(null)).toEqual([]);
    expect(__test.parseEntries(undefined)).toEqual([]);
  });

  it("returns [] for malformed JSON", () => {
    expect(__test.parseEntries("not-json[")).toEqual([]);
  });
});


describe("LiveTerminal integration", () => {
  it("renders loading state during fetch", () => {
    const fetcher = vi.fn(() => new Promise<Response>(() => {/* never */}));
    const { container } = render(
      <LiveTerminal fetcher={fetcher as never} />,
    );
    expect(
      container.querySelector("[data-airlock-state='loading']"),
    ).not.toBeNull();
  });

  it("renders conversation entries from session.conversation_log", async () => {
    const entries = [
      { id: "e1", kind: "user", body: "diagnose the airlock" },
      { id: "e2", kind: "agent", body: "Diagnostic scan complete." },
    ];
    const sessions = [
      {
        id: 42,
        lifecycle: "scenario",
        conversation_log: JSON.stringify(entries),
      },
    ];
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(sessions), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const { container } = render(
      <LiveTerminal fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      expect(
        container.querySelector("[data-airlock-state='ready']"),
      ).not.toBeNull();
    });
    expect(container.textContent).toContain("diagnose the airlock");
    expect(container.textContent).toContain("Diagnostic scan complete.");
  });

  it("emits data-termin-row-id + data-termin-field for WS hydrator", async () => {
    const sessions = [
      { id: 7, lifecycle: "scenario", conversation_log: "[]" },
    ];
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(sessions), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const { container } = render(
      <LiveTerminal fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      const wrap = container.querySelector("[data-airlock-state='ready']");
      expect(wrap).not.toBeNull();
    });
    const wrap = container.querySelector("[data-airlock-state='ready']");
    expect(wrap?.getAttribute("data-termin-row-id")).toBe("7");
    expect(wrap?.getAttribute("data-termin-field")).toBe("conversation_log");
  });

  it("fires action.append with the session id on compose submit", async () => {
    const sessions = [
      { id: 123, lifecycle: "scenario", conversation_log: "[]" },
    ];
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(sessions), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const action = vi.fn(() => Promise.resolve({ ok: true }));
    const { container } = render(
      <LiveTerminal fetcher={fetcher as never} action={action} />,
    );
    await waitFor(() => {
      expect(
        container.querySelector("[data-airlock-state='ready']"),
      ).not.toBeNull();
    });
    const input = container.querySelector(
      "input[data-airlock-state='compose']",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test message" } });
    const button = container.querySelector(
      "button[data-airlock-state='send']",
    ) as HTMLButtonElement;
    fireEvent.click(button);
    expect(action).toHaveBeenCalledWith({
      kind: "append",
      content: "sessions",
      record_id: 123,
      field: "conversation_log",
      payload: { kind: "user", body: "test message" },
    });
  });

  it("omits the compose input when session lifecycle is not 'scenario'", async () => {
    // The Terminal component omits the input region entirely when
    // its `onSend` prop is undefined. LiveTerminal passes undefined
    // when the session isn't in the live scenario phase — so no
    // input renders. The post-game transcript view (Scoring +
    // Results pages) uses this read-only path.
    const sessions = [
      { id: 99, lifecycle: "complete", conversation_log: "[]" },
    ];
    const fetcher = vi.fn(() =>
      Promise.resolve(new Response(JSON.stringify(sessions), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })),
    );
    const action = vi.fn();
    const { container } = render(
      <LiveTerminal fetcher={fetcher as never} action={action} />,
    );
    await waitFor(() => {
      expect(
        container.querySelector("[data-airlock-state='ready']"),
      ).not.toBeNull();
    });
    const input = container.querySelector(
      "input[data-airlock-state='compose']",
    );
    expect(input).toBeNull();
  });

  it("renders load-failed state on fetch error", async () => {
    const fetcher = vi.fn(() => Promise.reject(new Error("net")));
    const { container } = render(
      <LiveTerminal fetcher={fetcher as never} />,
    );
    await waitFor(() => {
      expect(
        container.querySelector("[data-airlock-state='load-failed']"),
      ).not.toBeNull();
    });
  });
});
