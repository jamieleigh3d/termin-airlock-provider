// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import {
  ScenarioNarrative,
  NarrativeLine,
  LineKind,
} from "./ScenarioNarrative";

describe("ScenarioNarrative", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing initially before any line's delay elapses", () => {
    const lines: NarrativeLine[] = [
      { text: "First", delay: 100, kind: "header" },
      { text: "Second", delay: 200, kind: "body" },
    ];
    const { container } = render(<ScenarioNarrative lines={lines} />);
    const narrative = container.querySelector(
      "[data-airlock-component='scenario-narrative']",
    );
    expect(narrative?.children.length).toBe(0);
  });

  it("reveals lines progressively as timers fire", () => {
    const lines: NarrativeLine[] = [
      { text: "First", delay: 100, kind: "header" },
      { text: "Second", delay: 300, kind: "body" },
      { text: "Third", delay: 500, kind: "alert" },
    ];
    const { container } = render(<ScenarioNarrative lines={lines} />);
    const narrative = () =>
      container.querySelector(
        "[data-airlock-component='scenario-narrative']",
      ) as HTMLElement;

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(narrative().children.length).toBe(1);
    expect(narrative().children[0].textContent).toBe("First");

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(narrative().children.length).toBe(2);
    expect(narrative().children[1].textContent).toBe("Second");

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(narrative().children.length).toBe(3);
    expect(narrative().children[2].textContent).toBe("Third");
  });

  it("maps each kind to a Tailwind class via the data-airlock-line-kind attribute", () => {
    const allKinds: LineKind[] = [
      "header",
      "subheader",
      "body",
      "narrative",
      "alert",
      "alert-pulsing",
    ];
    const lines: NarrativeLine[] = allKinds.map((kind, i) => ({
      text: `Line ${i}`,
      delay: 0,
      kind,
    }));
    const { container } = render(<ScenarioNarrative lines={lines} />);

    act(() => {
      vi.advanceTimersByTime(0);
    });

    const rendered = container.querySelectorAll(
      "[data-airlock-line-kind]",
    );
    expect(rendered.length).toBe(allKinds.length);
    allKinds.forEach((kind, i) => {
      expect(rendered[i].getAttribute("data-airlock-line-kind")).toBe(kind);
      // Every kind has a non-empty class — the kind→class map is
      // consulted; default Tailwind classes don't bleed through.
      const classes = rendered[i].getAttribute("class") || "";
      expect(classes.length).toBeGreaterThan(0);
    });
  });

  it("renders empty text as a non-breaking space placeholder", () => {
    const lines: NarrativeLine[] = [
      { text: "", delay: 0, kind: "body" },
    ];
    const { container } = render(<ScenarioNarrative lines={lines} />);

    act(() => {
      vi.advanceTimersByTime(0);
    });

    const rendered = container.querySelectorAll(
      "[data-airlock-line-kind]",
    );
    expect(rendered.length).toBe(1);
    // Non-breaking space (U+00A0) vs regular space — preserves
    // line height when text is empty.
    expect(rendered[0].textContent).toBe(" ");
  });

  it("fires onComplete after the last line's delay elapses", () => {
    const onComplete = vi.fn();
    const lines: NarrativeLine[] = [
      { text: "First", delay: 100, kind: "header" },
      { text: "Last", delay: 500, kind: "alert" },
    ];
    render(<ScenarioNarrative lines={lines} onComplete={onComplete} />);

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("does not fire onComplete twice on re-render", () => {
    const onComplete = vi.fn();
    const lines: NarrativeLine[] = [
      { text: "Only", delay: 200, kind: "header" },
    ];
    const { rerender } = render(
      <ScenarioNarrative lines={lines} onComplete={onComplete} />,
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);

    // Re-render with the same props — should NOT re-fire.
    rerender(<ScenarioNarrative lines={lines} onComplete={onComplete} />);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("does not crash when handed an empty lines list", () => {
    const onComplete = vi.fn();
    const { container } = render(
      <ScenarioNarrative lines={[]} onComplete={onComplete} />,
    );
    const narrative = container.querySelector(
      "[data-airlock-component='scenario-narrative']",
    );
    expect(narrative).not.toBeNull();
    expect(narrative?.children.length).toBe(0);

    act(() => {
      vi.advanceTimersByTime(10000);
    });
    // onComplete must not fire on empty input — no last line means
    // no completion semantically.
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("accepts a className override on the outer container", () => {
    const lines: NarrativeLine[] = [
      { text: "Line", delay: 0, kind: "body" },
    ];
    const { container } = render(
      <ScenarioNarrative lines={lines} className="custom-layout" />,
    );
    const narrative = container.querySelector(
      "[data-airlock-component='scenario-narrative']",
    );
    expect(narrative?.getAttribute("class")).toBe("custom-layout");
  });

  it("alert kinds carry the accent-red color class", () => {
    const lines: NarrativeLine[] = [
      { text: "Warning!", delay: 0, kind: "alert" },
      { text: "Pulse warn", delay: 0, kind: "alert-pulsing" },
    ];
    const { container } = render(<ScenarioNarrative lines={lines} />);

    act(() => {
      vi.advanceTimersByTime(0);
    });

    const rendered = container.querySelectorAll(
      "[data-airlock-line-kind]",
    );
    rendered.forEach((el) => {
      const classes = el.getAttribute("class") || "";
      expect(classes).toContain("accent-red");
    });
    // alert-pulsing additionally has the animate-pulse class.
    expect(rendered[1].getAttribute("class")).toContain("animate-pulse");
  });
});
