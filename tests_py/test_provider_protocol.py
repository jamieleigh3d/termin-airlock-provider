# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""AirlockProvider satisfies the PresentationProvider Protocol.

This is the cross-package contract test — the Termin runtime expects
any registered provider to pass ``isinstance(provider, PresentationProvider)``
at startup (the Protocol is ``@runtime_checkable``). This test fails if
the Protocol surface drifts and we miss the signal.
"""

from __future__ import annotations

import pytest

from termin_core.providers.presentation_contract import PresentationProvider
from termin_airlock_provider import AirlockProvider
from termin_airlock_provider.provider import AIRLOCK_CONTRACTS


def test_airlock_provider_satisfies_protocol():
    """Runtime-checkable Protocol — isinstance must return True."""
    provider = AirlockProvider()
    assert isinstance(provider, PresentationProvider)


def test_airlock_provider_declares_six_custom_contracts():
    """Slice A1 declares all six custom contracts in the
    ``airlock.*`` namespace so the runtime's deploy-time validation
    is satisfied. Real renderers fill in over slice A2.
    """
    provider = AirlockProvider()
    declared = set(provider.declared_contracts)
    expected = {
        "airlock.cosmic-orb",
        "airlock.scenario-narrative",
        "airlock.terminal",
        "airlock.countdown-timer",
        "airlock.score-axis-card",
        "airlock.badge-strip",
    }
    assert declared == expected, (
        f"Missing: {expected - declared}; Extra: {declared - expected}"
    )


def test_airlock_provider_declares_ssr_and_csr():
    """Per tech design §5.3: SSR for fast first paint, CSR for
    everything interactive. NOT csr-only (that's Spectrum's pattern).
    """
    provider = AirlockProvider()
    assert set(provider.render_modes) == {"ssr", "csr"}


def test_airlock_constants_exposed():
    """The contract list is importable as a stable surface — alt
    runtimes / test harnesses can iterate it without instantiating
    the provider.
    """
    assert "airlock.cosmic-orb" in AIRLOCK_CONTRACTS
    assert len(AIRLOCK_CONTRACTS) == 6


def test_render_ssr_unknown_contract_raises():
    """Calling render_ssr with a contract this provider doesn't
    declare is a deployment misconfiguration — fail loud, not silent.
    """
    provider = AirlockProvider()
    with pytest.raises(ValueError, match="does not declare contract"):
        provider.render_ssr(
            contract="presentation-base.text",  # not an airlock contract
            ir_fragment={},
            data=None,
            principal_context=None,
        )


def test_render_ssr_known_contract_returns_marker():
    """Slice A1 contract: every contract returns a
    ``<div data-airlock-contract="...">`` marker the CSR bundle
    targets to mount its real React component into. The actual
    placeholder shape is asserted in test_ssr_shells.py.
    """
    provider = AirlockProvider()
    html = provider.render_ssr(
        contract="airlock.cosmic-orb",
        ir_fragment={"type": "cosmic-orb", "props": {}},
        data=None,
        principal_context=None,
    )
    assert 'data-airlock-contract="airlock.cosmic-orb"' in html
    assert "<div" in html


def test_csr_bundle_url_default():
    """Default bundle URL matches the Spectrum convention
    (``/_termin/providers/<product>/bundle.js``)."""
    provider = AirlockProvider()
    assert provider.csr_bundle_url() == "/_termin/providers/airlock/bundle.js"
