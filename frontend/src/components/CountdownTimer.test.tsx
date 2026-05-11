// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { CountdownTimer } from "./CountdownTimer";

describe("CountdownTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the initial time as M:SS", () => {
    const { container } = render(<CountdownTimer remainingSeconds={300} />);
    const root = container.querySelector(
      "[data-airlock-component='countdown-timer']",
    );
    expect(root?.textContent).toContain("5:00");
  });

  it("counts down once per second", () => {
    const { container } = render(<CountdownTimer remainingSeconds={300} />);
    const root = () =>
      container.querySelector(
        "[data-airlock-component='countdown-timer']",
      ) as HTMLElement;
    expect(root().textContent).toContain("5:00");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(root().textContent).toContain("4:59");

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(root().textContent).toContain("4:57");
  });

  it("formats single-digit seconds with a leading zero", () => {
    const { container } = render(<CountdownTimer remainingSeconds={65} />);
    expect(container.textContent).toContain("1:05");
  });

  it("clamps at 0:00 and stops counting down", () => {
    const { container } = render(<CountdownTimer remainingSeconds={2} />);
    const root = () =>
      container.querySelector(
        "[data-airlock-component='countdown-timer']",
      ) as HTMLElement;

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(root().textContent).toContain("0:00");

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(root().textContent).toContain("0:00");
  });

  it("applies the critical class when remaining seconds drop at or below the critical threshold", () => {
    const { container } = render(
      <CountdownTimer remainingSeconds={31} criticalThreshold={30} />,
    );
    const time = () =>
      container.querySelector(
        "[data-airlock-state='time']",
      ) as HTMLElement;
    expect(time().getAttribute("data-airlock-critical")).toBe("false");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(time().getAttribute("data-airlock-critical")).toBe("true");
  });

  it("displays the safe label instead of time when isSafe is true", () => {
    const { container } = render(
      <CountdownTimer remainingSeconds={30} isSafe={true} safeLabel="UNLOCKED" />,
    );
    expect(container.textContent).toContain("UNLOCKED");
    expect(container.textContent).not.toContain("0:30");
  });

  it("defaults the safe label to 'SAFE' when not supplied", () => {
    const { container } = render(
      <CountdownTimer remainingSeconds={30} isSafe={true} />,
    );
    expect(container.textContent).toContain("SAFE");
  });

  it("does not start its countdown interval when isSafe is true at mount", () => {
    const { container } = render(
      <CountdownTimer remainingSeconds={300} isSafe={true} />,
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    // Time should still display the safe label, not 4:55.
    expect(container.textContent).toContain("SAFE");
    expect(container.textContent).not.toContain("4:55");
  });

  it("renders the optional label prefix when supplied", () => {
    const { container } = render(
      <CountdownTimer remainingSeconds={120} label="AIRLOCK 7" />,
    );
    expect(container.textContent).toContain("AIRLOCK 7");
    expect(container.textContent).toContain("2:00");
  });

  it("uses an aria-live region so screen readers announce the count", () => {
    const { container } = render(<CountdownTimer remainingSeconds={300} />);
    const time = container.querySelector("[data-airlock-state='time']");
    expect(time?.getAttribute("aria-live")).toBe("polite");
  });

  it("flips aria-live to assertive when in critical state", () => {
    const { container } = render(
      <CountdownTimer remainingSeconds={31} criticalThreshold={30} />,
    );
    const time = () =>
      container.querySelector(
        "[data-airlock-state='time']",
      ) as HTMLElement;
    expect(time().getAttribute("aria-live")).toBe("polite");

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(time().getAttribute("aria-live")).toBe("assertive");
  });

  it("renders a critical-state text label (not color-only) per BRD §13.4", () => {
    const { container } = render(
      <CountdownTimer remainingSeconds={20} criticalThreshold={30} />,
    );
    // The component must surface the critical state via a text label in
    // addition to color so colorblind users (and screen readers) can see
    // it. Per BRD §13.4 and JL's colorblindness — color is never the
    // sole signal.
    expect(container.textContent).toContain("CRITICAL");
  });

  it("re-syncs to a new remainingSeconds prop when the parent updates it", () => {
    // The parent (e.g. the runtime) may push an authoritative count
    // back from the server. The component must accept the override
    // without ignoring it because of internal state.
    const { container, rerender } = render(
      <CountdownTimer remainingSeconds={300} />,
    );
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(container.textContent).toContain("4:50");

    rerender(<CountdownTimer remainingSeconds={120} />);
    expect(container.textContent).toContain("2:00");
  });
});
