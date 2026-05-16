# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""register_airlock — registers all custom Airlock contracts in
the runtime ContractRegistry and the provider records in the
ProviderRegistry against them.

Mirrors ``register_spectrum`` in termin-spectrum-provider with two
differences: this provider declares CUSTOM contracts (in the
``airlock`` namespace) rather than the built-in ``presentation-base.*``
set, and registers SSR + CSR hybrid render mode rather than CSR-only.

Auto-invoked by the Termin runtime via the ``termin.providers``
entry-point group declared in setup.py; explicit invocation is
supported but not required.
"""

from __future__ import annotations

from termin_core.providers import Category
from termin_core.providers.contracts import (
    ContractDefinition,
    ContractRegistry,
    Tier,
)

from termin_airlock_provider.factory import airlock_factory
from termin_airlock_provider.provider import AIRLOCK_CONTRACTS
from termin_airlock_provider import __version__


PRODUCT_NAME = "airlock"


def register_airlock(
    provider_registry, contract_registry: ContractRegistry | None = None
) -> None:
    """Register the Airlock provider against all declared contracts.

    Side effect: also registers each declared contract in the
    ``contract_registry`` if one is provided. The contracts live in
    the ``airlock`` namespace per BRD #2 §10.4 ("Mandatory Using
    for non-default namespaces") — source-level binding requires an
    explicit ``Using "airlock.<name>"`` clause.

    Idempotent — safe to call multiple times if the underlying
    registry is the same one (matches the Spectrum registration
    pattern; the runtime should never double-register but defensive
    handling here avoids surprises in test fixtures).
    """
    if contract_registry is not None:
        for contract_name in AIRLOCK_CONTRACTS:
            try:
                contract_registry.register_contract(ContractDefinition(
                    name=contract_name,
                    category=Category.PRESENTATION,
                    tier=Tier.TIER_2,
                    naming="named",
                    description=(
                        f"Custom presentation contract `{contract_name}` "
                        f"for the Airlock CRT UI. Source binds via "
                        f"`Using \"{contract_name}\"`. See "
                        f"`termin-compiler/docs/"
                        f"termin-v0.9.4-airlock-on-termin-tech-design.md`"
                        f" §5.2."
                    ),
                ))
            except ValueError:
                # Already registered (e.g. from a previous test setup).
                # Match Spectrum's tolerance pattern.
                pass

    for contract_name in AIRLOCK_CONTRACTS:
        provider_registry.register(
            category=Category.PRESENTATION,
            contract_name=contract_name,
            product_name=PRODUCT_NAME,
            factory=airlock_factory,
            conformance="passing",
            # Per termin-compiler/docs/version-policy.md §2.3:
            # provider-record version tracks the package version of
            # the providing package. Reading from __version__ keeps
            # it aligned with the package on every release.
            version=__version__,
            contract_registry=contract_registry,
        )


__all__ = ["register_airlock", "PRODUCT_NAME"]
