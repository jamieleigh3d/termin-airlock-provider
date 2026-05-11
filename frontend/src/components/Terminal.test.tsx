// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import { describe, it, expect, vi } from "vitest";
import { render, fireEvent } from "@testing-library/react";
import { Terminal, ConversationEntry } from "./Terminal";


function makeEntry(
  partial: Partial<ConversationEntry> & { kind: string; id?: string },
): ConversationEntry {
  return {
    id: partial.id ?? `e-${Math.random()}`,
    kind: partial.kind,
    body: partial.body ?? "",
    created_at: partial.created_at ?? "2026-05-11T03:00:00Z",
    ...partial,
  } as ConversationEntry;
}


describe("Terminal", () => {
  it("renders an empty state when there are no entries", () => {
    const { container } = render(<Terminal entries={[]} />);
    const root = container.querySelector(
      "[data-airlock-component='terminal']",
    );
    expect(root).not.toBeNull();
    // Empty terminals still need to mount the message list region
    // for hydration; just no rows inside it.
    const rows = container.querySelectorAll("[data-airlock-entry]");
    expect(rows.length).toBe(0);
  });

  it("renders one row per entry in source order", () => {
    const entries = [
      makeEntry({ kind: "user", id: "1", body: "hello" }),
      makeEntry({ kind: "agent", id: "2", body: "hi back" }),
      makeEntry({ kind: "user", id: "3", body: "thanks" }),
    ];
    const { container } = render(<Terminal entries={entries} />);
    const rows = container.querySelectorAll("[data-airlock-entry]");
    expect(rows.length).toBe(3);
    expect(
      [...rows].map((r) => r.getAttribute("data-airlock-kind")),
    ).toEqual(["user", "agent", "user"]);
  });

  it("renders a role-label (USER/ARIA/OVERSEER) per BRD §13.4 — text-label backup for color", () => {
    // JL is colorblind. Each role's bubble must carry a text label
    // so the role is identifiable without color cues.
    const entries = [
      makeEntry({ kind: "user", id: "1", body: "uplink" }),
      makeEntry({ kind: "agent", id: "2", body: "received" }),
      makeEntry({ kind: "system_event", id: "3", body: "alert" }),
    ];
    const { container } = render(<Terminal entries={entries} />);
    expect(container.textContent).toContain("USER");
    expect(container.textContent).toContain("ARIA");
    expect(container.textContent).toContain("OVERSEER");
  });

  it("right-aligns user messages and left-aligns agent messages (alignment as a non-color signal)", () => {
    const entries = [
      makeEntry({ kind: "user", id: "1", body: "u" }),
      makeEntry({ kind: "agent", id: "2", body: "a" }),
    ];
    const { container } = render(<Terminal entries={entries} />);
    const userRow = container.querySelector(
      "[data-airlock-entry][data-airlock-kind='user']",
    );
    const agentRow = container.querySelector(
      "[data-airlock-entry][data-airlock-kind='agent']",
    );
    expect(userRow?.getAttribute("data-airlock-align")).toBe("right");
    expect(agentRow?.getAttribute("data-airlock-align")).toBe("left");
  });

  it("renders body text with whitespace preserved (multi-line ARIA responses)", () => {
    const entries = [
      makeEntry({
        kind: "agent",
        id: "1",
        body: "Line one\nLine two\n\nLine four",
      }),
    ];
    const { container } = render(<Terminal entries={entries} />);
    const body = container.querySelector(
      "[data-airlock-entry] [data-airlock-state='body']",
    );
    // CSS class governs visual whitespace handling; verify the
    // class is present (whitespace-pre-wrap) so paragraphs render
    // as authored.
    expect(body?.className).toContain("whitespace-pre-wrap");
    expect(body?.textContent).toContain("Line one");
    expect(body?.textContent).toContain("Line four");
  });

  it("renders tool_call entries as a collapsible inspector card", () => {
    const entries = [
      makeEntry({
        kind: "tool_call",
        id: "1",
        body: "diagnostics_scan({})",
        tool_name: "diagnostics_scan",
        tool_args: {},
        tool_call_id: "call-0",
      }),
    ];
    const { container } = render(<Terminal entries={entries} />);
    const row = container.querySelector(
      "[data-airlock-entry][data-airlock-kind='tool_call']",
    );
    expect(row).not.toBeNull();
    // The tool name appears in the card header.
    expect(row?.textContent).toContain("diagnostics_scan");
  });

  it("collapses tool_call cards by default and toggles on header click", () => {
    const entries = [
      makeEntry({
        kind: "tool_call",
        id: "1",
        body: "diagnostics_scan({sensor: 'cycle_controller'})",
        tool_name: "diagnostics_scan",
        tool_args: { sensor: "cycle_controller" },
        tool_call_id: "call-0",
      }),
    ];
    const { container } = render(<Terminal entries={entries} />);
    const row = container.querySelector(
      "[data-airlock-entry][data-airlock-kind='tool_call']",
    ) as HTMLElement;
    expect(row.getAttribute("data-airlock-expanded")).toBe("false");
    // The tool args are NOT visible while collapsed.
    expect(container.textContent).not.toContain("cycle_controller");

    const toggle = row.querySelector("button");
    expect(toggle).not.toBeNull();
    fireEvent.click(toggle!);
    expect(row.getAttribute("data-airlock-expanded")).toBe("true");
    expect(container.textContent).toContain("cycle_controller");
  });

  it("formats tool_result body as pretty-printed JSON when it is parseable", () => {
    const entries = [
      makeEntry({
        kind: "tool_result",
        id: "1",
        body: '{"value":{"status":"FAULT"}}',
        tool_call_id: "call-0",
      }),
    ];
    const { container } = render(<Terminal entries={entries} />);
    const row = container.querySelector(
      "[data-airlock-entry][data-airlock-kind='tool_result']",
    ) as HTMLElement;
    // Expand the card so we can inspect the body
    fireEvent.click(row.querySelector("button")!);
    const body = row.querySelector("[data-airlock-state='body']");
    // Pretty-printed JSON has at least one indented line.
    expect(body?.textContent).toMatch(/\n {2}"value"/);
  });

  it("falls back to raw text for tool_result when body is not JSON", () => {
    const entries = [
      makeEntry({
        kind: "tool_result",
        id: "1",
        body: "this is plain text",
        tool_call_id: "call-0",
      }),
    ];
    const { container } = render(<Terminal entries={entries} />);
    const row = container.querySelector(
      "[data-airlock-entry][data-airlock-kind='tool_result']",
    ) as HTMLElement;
    fireEvent.click(row.querySelector("button")!);
    expect(row.textContent).toContain("this is plain text");
  });

  it("flags tool_result with is_error using a non-color signal (data attribute + ERROR label)", () => {
    const entries = [
      makeEntry({
        kind: "tool_result",
        id: "1",
        body: "Error: boom",
        tool_call_id: "call-0",
        is_error: true,
      }),
    ];
    const { container } = render(<Terminal entries={entries} />);
    const row = container.querySelector(
      "[data-airlock-entry][data-airlock-kind='tool_result']",
    ) as HTMLElement;
    expect(row.getAttribute("data-airlock-is-error")).toBe("true");
    expect(row.textContent).toContain("ERROR");
  });

  it("system_event (OVERSEER) entries are centered, not left/right aligned", () => {
    const entries = [
      makeEntry({
        kind: "system_event",
        id: "1",
        body: "Alert: airlock cycle re-triggered",
      }),
    ];
    const { container } = render(<Terminal entries={entries} />);
    const row = container.querySelector(
      "[data-airlock-entry][data-airlock-kind='system_event']",
    );
    expect(row?.getAttribute("data-airlock-align")).toBe("center");
  });

  it("renders the input region by default and fires onSend with the typed text", () => {
    const onSend = vi.fn();
    const { container } = render(<Terminal entries={[]} onSend={onSend} />);
    const input = container.querySelector(
      "input[data-airlock-state='compose']",
    ) as HTMLInputElement;
    const button = container.querySelector(
      "button[data-airlock-state='send']",
    ) as HTMLButtonElement;
    expect(input).not.toBeNull();
    expect(button).not.toBeNull();

    fireEvent.change(input, { target: { value: "diagnose the airlock" } });
    fireEvent.click(button);
    expect(onSend).toHaveBeenCalledWith("diagnose the airlock");
  });

  it("clears the input after a successful send", () => {
    const { container } = render(<Terminal entries={[]} onSend={() => {}} />);
    const input = container.querySelector(
      "input[data-airlock-state='compose']",
    ) as HTMLInputElement;
    const button = container.querySelector(
      "button[data-airlock-state='send']",
    ) as HTMLButtonElement;

    fireEvent.change(input, { target: { value: "hi" } });
    expect(input.value).toBe("hi");
    fireEvent.click(button);
    expect(input.value).toBe("");
  });

  it("does not fire onSend when the input is empty or only whitespace", () => {
    const onSend = vi.fn();
    const { container } = render(<Terminal entries={[]} onSend={onSend} />);
    const button = container.querySelector(
      "button[data-airlock-state='send']",
    ) as HTMLButtonElement;
    fireEvent.click(button);
    const input = container.querySelector(
      "input[data-airlock-state='compose']",
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.click(button);
    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables the input region when readOnly is true (e.g. scenario ended)", () => {
    const { container } = render(
      <Terminal entries={[]} readOnly={true} onSend={() => {}} />,
    );
    const input = container.querySelector(
      "input[data-airlock-state='compose']",
    ) as HTMLInputElement;
    const button = container.querySelector(
      "button[data-airlock-state='send']",
    ) as HTMLButtonElement;
    expect(input?.disabled).toBe(true);
    expect(button?.disabled).toBe(true);
  });

  it("omits the input region when onSend is not provided", () => {
    // The Terminal can render in a read-only mode (transcript view
    // on the Results page) where no input is needed. Omit the form
    // entirely so it doesn't take page space.
    const { container } = render(<Terminal entries={[]} />);
    expect(
      container.querySelector("input[data-airlock-state='compose']"),
    ).toBeNull();
    expect(
      container.querySelector("button[data-airlock-state='send']"),
    ).toBeNull();
  });
});
