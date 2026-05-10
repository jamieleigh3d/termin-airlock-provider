// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// Mock for window.Termin.registerRenderer used by the dev-mode
// preview harness only.
//
// This file MUST be imported by demo.tsx BEFORE the production
// entry point (../index). ES module imports evaluate in source
// order, so the import that comes first runs its module body first
// — this module's body assigns window.Termin, then the production
// entry point's `registerAllContracts()` call sees the global
// already populated and registers cleanly.
//
// The previous attempt (inlining the assignment in demo.tsx ABOVE
// `import "../index"`) failed because ES module imports get hoisted
// to the top of the importing module — the assignment ran AFTER
// the production entry's module body. Splitting the mock out into
// its own module forces the correct evaluation order.

type Renderer = (mountPoint: HTMLElement, irFragment: unknown) => void;

/** Renderers the production entry point registers via
 *  window.Termin.registerRenderer. demo.tsx reads this map to
 *  manually mount each contract with sample IR fragments. */
export const renderers = new Map<string, Renderer>();

declare global {
  interface Window {
    Termin?: {
      registerRenderer: (contract: string, renderer: Renderer) => void;
      action?: (payload: unknown) => Promise<unknown>;
      subscribe?: (channel: string, handler: (event: unknown) => void) => void;
    };
  }
}

window.Termin = {
  registerRenderer: (contract: string, renderer: Renderer) => {
    renderers.set(contract, renderer);
    // eslint-disable-next-line no-console
    console.log(`[demo harness] Registered renderer for: ${contract}`);
  },
};
