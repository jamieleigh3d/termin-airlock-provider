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

from termin_airlock_provider.ssr_shells import render_shell


# Default bundle URL — the runtime serves this from package data via
# its presentation-bundle endpoint surface. Operators override via
# ``deploy_config.bundle_url_override`` (mirrors Spectrum's pattern;
# typically used to point at a CDN).
DEFAULT_BUNDLE_URL = "/_termin/providers/airlock/bundle.js"


# The six custom contracts this provider implements. Each is registered
# into the ContractRegistry by ``registration.register_airlock`` and
# the IR's ``Using "airlock.<name>"`` clause binds source-level
# component types to them.
AIRLOCK_CONTRACTS: tuple[str, ...] = (
    "airlock.cosmic-orb",
    "airlock.scenario-narrative",
    "airlock.terminal",
    "airlock.countdown-timer",
    "airlock.score-axis-card",
    "airlock.badge-strip",
)


class AirlockProvider:
    """Termin presentation provider for the Airlock CRT UI.

    Declares six custom contracts in the ``airlock.*`` namespace.
    Render mode is SSR + CSR hybrid: SSR for the initial paint
    placeholder shell, CSR for everything interactive (typewriter
    animation, terminal chat, timer countdown, tool-call inspector,
    badge hover).

    Constructor args:
        bundle_url_override: optional URL string. When set, replaces
            the default self-hosted bundle URL — typically used to
            point at a CDN for production deployments.
    """

    declared_contracts: tuple[str, ...] = AIRLOCK_CONTRACTS
    render_modes: tuple[str, ...] = ("ssr", "csr")

    def __init__(self, bundle_url_override: Optional[str] = None) -> None:
        self._bundle_url = bundle_url_override or DEFAULT_BUNDLE_URL

    def render_ssr(
        self,
        contract: str,
        ir_fragment: Any,
        data: PresentationData,
        principal_context: PrincipalContext,
    ) -> str:
        """Render a contract's SSR placeholder shell.

        Slice A1 (this scaffold): every contract returns a
        ``<div data-airlock-contract="...">`` marker the CSR bundle
        targets to mount its real React component into. Slice A2
        replaces these with hydration-ready containers carrying the
        critical-CSS for the CRT aesthetic so first-paint isn't a
        white flash.
        """
        if contract not in self.declared_contracts:
            raise ValueError(
                f"AirlockProvider does not declare contract {contract!r}. "
                f"Declared: {self.declared_contracts}"
            )
        return render_shell(contract, ir_fragment, data, principal_context)

    def csr_bundle_url(self) -> Optional[str]:
        """Return the JS bundle URL for CSR-mode rendering."""
        return self._bundle_url


__all__ = [
    "AirlockProvider",
    "AIRLOCK_CONTRACTS",
    "DEFAULT_BUNDLE_URL",
]
