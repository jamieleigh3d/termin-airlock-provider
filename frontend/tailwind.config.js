// Copyright 2026 Jamie-Leigh Blake and Termin project contributors
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.

// Tailwind v4 config — airlock theme tokens mirror
// src/termin_airlock_provider/theme_tokens.py (Python source of
// truth). Slice A2 should add a build-time check that the two are
// in sync; for now they're maintained side-by-side.

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{ts,tsx,js,jsx,html}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds (deep → elevated)
        "bg-deep": "#0a0e17",
        "bg-panel": "#0d1117",
        "bg-elevated": "#0d1a2d",

        // Foreground typography
        "text-primary": "#e0e8f0",
        "text-secondary": "#8899aa",
        "text-muted": "#556677",

        // Accent palette — every color also has a non-color
        // backup per BRD #2 §13.4 (label prefix, alignment, icon
        // shape). See theme_tokens.ROLE_DISTINCTION_BACKUPS for
        // the canonical mapping.
        "accent-cyan": "#00e5ff",
        "accent-amber": "#ffab00",
        "accent-red": "#ff1744",
        "accent-green": "#00e676",
        "accent-blue": "#304ffe",
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Cascadia Code",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
