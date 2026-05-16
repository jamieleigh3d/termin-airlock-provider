# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""AirlockProvider — implements PresentationProvider for the Airlock CRT UI.

SSR + CSR hybrid (per tech design §5.3): the runtime calls
``render_ssr`` to produce a placeholder shell for fast first paint,
then loads the JS bundle URL returned by ``csr_bundle_url`` so the
React 19 frontend hydrates each shell into the interactive surface.

The provider declares six custom contracts in the ``airlock.*``
namespace — distinct from the ten built-in ``presentation-base.*``
contracts the Tailwind / Spectrum providers cover. Custom contracts
are registered into the ``ContractRegistry`` by ``registration.py``.
"""

from __future__ import annotations

from typing import Any, Mapping, Optional

# These types come from termin-core. Importing here ties this package
# to the Protocol; the runtime's deploy-time isinstance check verifies
# the binding (Protocol is @runtime_checkable).
from termin_core.providers.presentation_contract import (
    PresentationData,
    PrincipalContext,
)


# Default bundle URL — the runtime serves this from package data via
# its presentation-bundle endpoint surface. Operators override via
# ``deploy_config.bundle_url_override`` (mirrors Spectrum's pattern;
# typically used to point at a CDN).
DEFAULT_BUNDLE_URL = "/_termin/providers/airlock/bundle.js"


# The custom contracts this provider implements. Each is registered
# into the ContractRegistry by ``registration.register_airlock`` and
# the IR's ``Using "airlock.<name>"`` clause binds source-level
# component types to them.
#
# v0.9.4 Phase 1 (Landing prototype) adds airlock.profile-summary +
# airlock.session-list to the original six (slice A2). The Landing
# page binds both — profile-summary shows the player's aggregate
# fluency profile, session-list shows their attempt history.
AIRLOCK_CONTRACTS: tuple[str, ...] = (
    "airlock.cosmic-orb",
    "airlock.scenario-narrative",
    "airlock.terminal",
    "airlock.countdown-timer",
    "airlock.score-axis-card",
    "airlock.badge-strip",
    "airlock.profile-summary",
    "airlock.session-list",
)


class AirlockProvider:
    """Termin presentation provider for the Airlock CRT UI.

    Declares six custom contracts in the ``airlock.*`` namespace.
    **CSR-only** — the CSR shell path in termin-server is the
    integration surface that dispatches custom-namespace contracts
    to registered providers today (Spectrum is the precedent). The
    SSR dispatch path in ``termin_server.presentation.render_component``
    only consults ``node.type`` against a hardcoded
    ``presentation-base.*`` Jinja2 renderer table; it does not yet
    look up custom providers by ``node.contract``. A follow-up slice
    (Path C in the v0.9.4 work) wires the SSR dispatch path; this
    provider may then opt back into ``("ssr", "csr")``.

    Constructor args:
        bundle_url_override: optional URL string. When set, replaces
            the default self-hosted bundle URL — typically used to
            point at a CDN for production deployments.
    """

    declared_contracts: tuple[str, ...] = AIRLOCK_CONTRACTS
    render_modes: tuple[str, ...] = ("csr",)

    def __init__(self, bundle_url_override: Optional[str] = None) -> None:
        self._bundle_url = bundle_url_override or DEFAULT_BUNDLE_URL

    def render_ssr(
        self,
        contract: str,
        ir_fragment: Any,
        data: PresentationData,
        principal_context: PrincipalContext,
    ) -> str:
        """Calling render_ssr on a CSR-only provider is a deployment
        misconfiguration — the runtime should never reach here. Fail
        loud per the same convention as
        ``termin_spectrum.SpectrumProvider.render_ssr``.
        """
        raise NotImplementedError(
            "AirlockProvider is CSR-only. The custom airlock.* contracts "
            "are dispatched through the runtime's CSR shell path. Bind a "
            "different provider for any contract that requires SSR, or "
            "wait for the SSR dispatch path in termin-server to be wired "
            "for custom namespaces (a v0.9.4 follow-up)."
        )

    def csr_bundle_url(self) -> Optional[str]:
        """Return the JS bundle URL for CSR-mode rendering."""
        return self._bundle_url


__all__ = [
    "AirlockProvider",
    "AIRLOCK_CONTRACTS",
    "DEFAULT_BUNDLE_URL",
]
