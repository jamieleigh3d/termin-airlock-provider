# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""Theme tokens for the Airlock CRT visual surface.

Source: ``termin-compiler/docs/termin-v0.9.4-airlock-on-termin-tech-design.md``
§5.4. Mirrored here in Python because the SSR shells in
``ssr_shells.py`` need them at render time and the Tailwind config in
``frontend/tailwind.config.js`` ports them into the CSS layer. Keeping
both sides referencing the same Python source of truth means a token
change propagates through one diff.

**Accessibility (BRD #2 §13.4):** every color-coded role distinction
in the UI also carries a text-label, alignment, or icon-shape backup.
This is per JL's colorblindness — see
``ROLE_DISTINCTION_BACKUPS`` below for the canonical mapping.
"""

from __future__ import annotations

from typing import Mapping


# Color palette — CRT deep-space aesthetic, JetBrains-Mono-on-dark.
COLORS: Mapping[str, str] = {
    # Backgrounds (deep → elevated)
    "bg-deep": "#0a0e17",
    "bg-panel": "#0d1117",
    "bg-elevated": "#0d1a2d",

    # Foreground typography
    "text-primary": "#e0e8f0",
    "text-secondary": "#8899aa",
    "text-muted": "#556677",

    # Accent palette — each color has a non-color backup per
    # ROLE_DISTINCTION_BACKUPS below.
    "accent-cyan": "#00e5ff",   # ARIA, primary
    "accent-amber": "#ffab00",  # OVERSEER, warnings
    "accent-red": "#ff1744",    # decompression timer
    "accent-green": "#00e676",  # success
    "accent-blue": "#304ffe",   # user messages
}


# Typography
TYPOGRAPHY: Mapping[str, str] = {
    "font-mono": "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    "font-mono-fallback": "monospace",
}


# Role distinction backups — every color-coded role in the UI also
# carries one or more of: a text-label prefix, an alignment shift,
# an icon shape, or a border weight. Per BRD #2 §13.4 this list is
# the colorblind-accessibility contract; the React components that
# render these distinctions consume it as the source of truth.
ROLE_DISTINCTION_BACKUPS: Mapping[str, Mapping[str, str]] = {
    "aria-message": {
        "color": "accent-cyan",
        "label-prefix": "ARIA:",
        "alignment": "left",
    },
    "overseer-message": {
        "color": "accent-amber",
        "label-prefix": "[OVERSEER]",
        "alignment": "left",
    },
    "user-message": {
        "color": "accent-blue",
        "label-prefix": "",
        "alignment": "right",
    },
    "decompression-warning": {
        "color": "accent-red",
        "label-prefix": "DECOMP:",
        "alignment": "centered",
    },
    "earned-badge": {
        "color": "accent-green",
        "icon-shape": "filled",
        "border-weight": "thick",
    },
    "unearned-badge": {
        "color": "text-muted",
        "icon-shape": "outline",
        "border-weight": "thin",
    },
}


__all__ = [
    "COLORS",
    "TYPOGRAPHY",
    "ROLE_DISTINCTION_BACKUPS",
]
