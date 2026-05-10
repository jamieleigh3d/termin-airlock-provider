// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// Build target: a single ES-module bundle that termin-server serves
// from the Python package's static/ directory. The Python wheel
// includes static/bundle.js as package data.
//
// IIFE-style global registration is delegated to src/index.tsx — Vite
// outputs a module the runtime's <script type="module"> loader picks
// up. termin.js calls into Termin.registerRenderer(...) calls our
// entry point makes at module evaluation time.

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, "../src/termin_airlock_provider/static"),
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, "src/index.tsx"),
      name: "TerminAirlockProvider",
      formats: ["iife"],
      fileName: () => "bundle.js",
    },
    rollupOptions: {
      // No externals — single all-in-one bundle (matches Spectrum Q5).
      // React + ReactDOM bundled in; the runtime doesn't expose them.
      output: {
        globals: {},
      },
    },
    sourcemap: true,
    minify: "terser",
    target: "es2020",
  },
});
