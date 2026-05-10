# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""SSR placeholder shells emit the markers the CSR bundle targets.

Slice A1 contract: each contract returns a single
``<div data-airlock-contract="..." data-airlock-ir="...">`` marker.
The CSR bundle (slice A2) targets ``[data-airlock-contract="..."]``
to mount its real React component into each one and consumes
``data-airlock-ir`` as the fragment input.
"""

from __future__ import annotations

import json

import pytest

from termin_airlock_provider.ssr_shells import render_shell


@pytest.mark.parametrize("contract", [
    "airlock.cosmic-orb",
    "airlock.scenario-narrative",
    "airlock.terminal",
    "airlock.countdown-timer",
    "airlock.score-axis-card",
    "airlock.badge-strip",
])
def test_each_contract_emits_marker(contract):
    """Every one of the six contracts produces a div with the
    expected data-attribute marker."""
    html = render_shell(
        contract=contract,
        ir_fragment={"type": contract.split(".", 1)[1], "props": {}},
        data=None,
        principal_context=None,
    )
    assert f'data-airlock-contract="{contract}"' in html
    assert "<div" in html


def test_contract_slug_is_css_safe():
    """The slug emitted in the class attribute strips the ``airlock.``
    prefix so CSS selectors can target by short name. The slug must
    match the contract suffix exactly."""
    html = render_shell(
        contract="airlock.cosmic-orb",
        ir_fragment={},
        data=None,
        principal_context=None,
    )
    assert 'class="airlock-shell airlock-shell--cosmic-orb"' in html


def test_ir_fragment_round_trips_via_data_attr():
    """The IR fragment is JSON-encoded and HTML-escaped into
    ``data-airlock-ir``. The CSR bundle JSON.parses it back. Verify
    a non-trivial fragment round-trips."""
    fragment = {
        "type": "terminal",
        "props": {
            "source": "session.conversation_log",
            "placeholder": 'Type your message — single quotes "and" doubles',
        },
        "children": [],
    }
    html = render_shell(
        contract="airlock.terminal",
        ir_fragment=fragment,
        data=None,
        principal_context=None,
    )
    # Find the data-airlock-ir attribute and decode it.
    marker = 'data-airlock-ir="'
    start = html.find(marker) + len(marker)
    end = html.find('"', start)
    encoded = html[start:end]
    # HTML-escaped — unescape, then JSON-decode.
    import html as _html_lib
    decoded_json = _html_lib.unescape(encoded)
    parsed = json.loads(decoded_json)
    assert parsed == fragment


def test_noscript_fallback_present():
    """JavaScript-disabled clients see a no-JS message naming the
    contract — slice A1 baseline; slice A2 may augment with a
    text-only fallback per contract."""
    html = render_shell(
        contract="airlock.cosmic-orb",
        ir_fragment={},
        data=None,
        principal_context=None,
    )
    assert "<noscript>" in html
    assert "JavaScript" in html
