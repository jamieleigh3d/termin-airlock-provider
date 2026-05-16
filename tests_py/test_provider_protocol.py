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


def test_airlock_provider_declares_all_custom_contracts():
    """The provider declares every custom contract in the
    ``airlock.*`` namespace so the runtime's deploy-time validation
    is satisfied. Slice A1 declared six (the gameplay surface);
    v0.9.4 Phase 1 added two more (profile-summary + session-list)
    for the Landing page.
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
        "airlock.profile-summary",
        "airlock.session-list",
        "airlock.session-detail",
    }
    assert declared == expected, (
        f"Missing: {expected - declared}; Extra: {declared - expected}"
    )


def test_airlock_provider_declares_csr_only():
    """CSR-only — the runtime's CSR shell path is what dispatches
    custom-namespace contracts to registered providers today
    (Spectrum is the precedent). The SSR dispatch path in
    ``termin_server.presentation.render_component`` does not yet
    look up custom providers by ``node.contract``; a follow-up slice
    in the v0.9.4 work wires that, after which this provider may
    opt back into ``("ssr", "csr")``. Until then, declaring SSR
    would silently fall through to the Jinja2 default renderer.
    """
    provider = AirlockProvider()
    assert provider.render_modes == ("csr",)


def test_airlock_constants_exposed():
    """The contract list is importable as a stable surface — alt
    runtimes / test harnesses can iterate it without instantiating
    the provider.
    """
    assert "airlock.cosmic-orb" in AIRLOCK_CONTRACTS
    # v0.9.4 Phase 1 added profile-summary + session-list to the
    # original six for the Landing page; Phase 2 will add
    # session-detail when the detail-page grammar primitive lands.
    assert "airlock.profile-summary" in AIRLOCK_CONTRACTS
    assert "airlock.session-list" in AIRLOCK_CONTRACTS
    assert "airlock.session-detail" in AIRLOCK_CONTRACTS
    assert len(AIRLOCK_CONTRACTS) == 9


def test_render_ssr_raises_not_implemented():
    """Calling render_ssr on a CSR-only provider is a deployment
    misconfiguration — fail loud per the same convention as
    SpectrumProvider. The runtime should never reach this method
    for a provider whose render_modes excludes ``"ssr"``.
    """
    provider = AirlockProvider()
    with pytest.raises(NotImplementedError, match="CSR-only"):
        provider.render_ssr(
            contract="airlock.cosmic-orb",
            ir_fragment={},
            data=None,
            principal_context=None,
        )


def test_csr_bundle_url_default():
    """Default bundle URL matches the Spectrum convention
    (``/_termin/providers/<product>/bundle.js``)."""
    provider = AirlockProvider()
    assert provider.csr_bundle_url() == "/_termin/providers/airlock/bundle.js"
