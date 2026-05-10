# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""Theme tokens cover the v0.9.4 tech design §5.4 palette and the
BRD #2 §13.4 colorblind-accessibility backups.

The tokens are sourced into both the SSR shells (Python) and the
Tailwind config (Node) — pinning their shape here keeps them in
lockstep across the two toolchains.
"""

from __future__ import annotations

from termin_airlock_provider.theme_tokens import (
    COLORS,
    TYPOGRAPHY,
    ROLE_DISTINCTION_BACKUPS,
)


def test_color_palette_complete():
    """All 11 tokens from tech design §5.4 are present."""
    expected = {
        "bg-deep", "bg-panel", "bg-elevated",
        "text-primary", "text-secondary", "text-muted",
        "accent-cyan", "accent-amber", "accent-red",
        "accent-green", "accent-blue",
    }
    assert set(COLORS.keys()) == expected


def test_color_values_are_hex():
    """Every color is a valid hex triple — string-typed, lowercase,
    leading ``#``, six hex digits."""
    for name, value in COLORS.items():
        assert isinstance(value, str), f"{name}: expected str, got {type(value)}"
        assert value.startswith("#"), f"{name}: missing # prefix"
        assert len(value) == 7, f"{name}: expected #RRGGBB, got {value!r}"
        # Hex digits valid
        int(value[1:], 16)


def test_typography_uses_jetbrains_mono():
    """Per tech design §5.4: JetBrains Mono primary, monospace
    fallback. The CRT aesthetic depends on monospace."""
    assert "JetBrains Mono" in TYPOGRAPHY["font-mono"]
    assert "monospace" in TYPOGRAPHY["font-mono-fallback"]


def test_role_distinction_backups_have_non_color_signal():
    """BRD #2 §13.4 contract: every color-coded role distinction has
    at least one non-color backup (label-prefix, alignment,
    icon-shape, or border-weight). This is the colorblind
    accessibility guarantee — assert it structurally."""
    non_color_keys = {"label-prefix", "alignment", "icon-shape", "border-weight"}
    for role, spec in ROLE_DISTINCTION_BACKUPS.items():
        backups = set(spec.keys()) & non_color_keys
        assert backups, (
            f"{role!r}: no non-color backup. Has only {set(spec.keys())}. "
            f"Need at least one of {non_color_keys} per BRD #2 §13.4."
        )


def test_role_distinction_backups_reference_real_colors():
    """Every role's ``color`` key references a defined token in
    COLORS (or a text-token like ``text-muted``). Catches typos
    that would silently fall through to default styling."""
    for role, spec in ROLE_DISTINCTION_BACKUPS.items():
        color_token = spec["color"]
        assert color_token in COLORS, (
            f"{role!r}: color {color_token!r} not in COLORS palette"
        )


def test_aria_distinction_left_aligned_with_label():
    """ARIA messages: left-aligned, ``ARIA:`` prefix label.
    Mirrors the production Airlock convention so the port preserves
    the visual contract users expect."""
    spec = ROLE_DISTINCTION_BACKUPS["aria-message"]
    assert spec["alignment"] == "left"
    assert spec["label-prefix"] == "ARIA:"


def test_user_distinction_right_aligned():
    """User messages right-align — the alignment IS the
    distinguishing signal independent of color."""
    spec = ROLE_DISTINCTION_BACKUPS["user-message"]
    assert spec["alignment"] == "right"
