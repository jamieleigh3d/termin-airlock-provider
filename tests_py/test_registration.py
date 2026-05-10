# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""register_airlock() registers all six custom contracts against the
runtime ContractRegistry and the provider records against them.

Auto-invoked at app startup via the ``termin.providers`` entry point
declared in setup.py — but the test exercises the function directly
so it doesn't require a packaged install.
"""

from __future__ import annotations

from termin_core.providers import (
    Category, ContractRegistry, ProviderRegistry,
)
from termin_core.providers.presentation_contract import PresentationProvider
from termin_airlock_provider import register_airlock
from termin_airlock_provider.provider import AIRLOCK_CONTRACTS
from termin_airlock_provider.registration import PRODUCT_NAME


def test_register_airlock_registers_all_six_contracts_in_contract_registry():
    """register_airlock side-effects the contract_registry: registers
    all six custom contracts in the ``airlock`` namespace so the
    runtime's source binding resolver can find them."""
    contracts = ContractRegistry.default()
    registry = ProviderRegistry()
    register_airlock(registry, contracts)
    # The six contracts are now registered.
    for name in AIRLOCK_CONTRACTS:
        # ContractRegistry exposes a getter — use the same lookup the
        # runtime uses at deploy time.
        defn = contracts.get_contract(Category.PRESENTATION, name)
        assert defn is not None, f"missing contract registration for {name}"
        assert defn.naming == "named", (
            f"airlock contracts must be named-binding (require explicit "
            f"`Using \"{name}\"`); got {defn.naming!r}"
        )


def test_register_airlock_registers_provider_records():
    """Provider records bind ``airlock`` as the product name to each
    of the six contracts."""
    contracts = ContractRegistry.default()
    registry = ProviderRegistry()
    register_airlock(registry, contracts)
    for name in AIRLOCK_CONTRACTS:
        record = registry.get(Category.PRESENTATION, name, PRODUCT_NAME)
        assert record is not None, (
            f"missing provider registration for {name}"
        )


def test_register_airlock_factory_produces_protocol_instance():
    """Factory in the registered record produces a
    Protocol-satisfying instance. This is the test the runtime
    effectively runs at app startup."""
    contracts = ContractRegistry.default()
    registry = ProviderRegistry()
    register_airlock(registry, contracts)
    record = registry.get(
        Category.PRESENTATION, "airlock.cosmic-orb", PRODUCT_NAME,
    )
    instance = record.factory({})
    assert isinstance(instance, PresentationProvider)


def test_register_airlock_provider_record_version_tracks_package():
    """Per docs/version-policy.md §2.3 in termin-compiler: the
    provider-record version= kwarg tracks the package version of the
    providing package. Assert against the imported __version__ so the
    test moves with the package without a literal bump.
    """
    from termin_airlock_provider import __version__
    contracts = ContractRegistry.default()
    registry = ProviderRegistry()
    register_airlock(registry, contracts)
    record = registry.get(
        Category.PRESENTATION, "airlock.terminal", PRODUCT_NAME,
    )
    assert record.version == __version__


def test_register_airlock_idempotent_with_pre_registered_contracts():
    """If the contracts are already in the registry (e.g., a prior
    test setup ran), register_airlock must tolerate that and still
    register the provider records cleanly. Matches Spectrum's
    pattern."""
    contracts = ContractRegistry.default()
    register_airlock(ProviderRegistry(), contracts)  # pre-register
    # Second call must not raise.
    registry = ProviderRegistry()
    register_airlock(registry, contracts)
    record = registry.get(
        Category.PRESENTATION, "airlock.cosmic-orb", PRODUCT_NAME,
    )
    assert record is not None


def test_register_airlock_works_without_contract_registry():
    """``contract_registry`` is optional — passing None means the
    caller has already registered the contracts elsewhere (or is in
    a unit-test path that doesn't need them). The provider records
    still register against the ProviderRegistry."""
    registry = ProviderRegistry()
    register_airlock(registry, contract_registry=None)
    record = registry.get(
        Category.PRESENTATION, "airlock.cosmic-orb", PRODUCT_NAME,
    )
    assert record is not None
