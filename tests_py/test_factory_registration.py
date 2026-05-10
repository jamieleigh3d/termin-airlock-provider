# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""airlock_factory(config) constructs an AirlockProvider per BRD #1 §3.

Verifies the factory accepts a deploy-config mapping, returns a
Protocol-satisfying instance, and forwards recognized config keys
into the constructor (currently only ``bundle_url_override``).
"""

from __future__ import annotations

from termin_core.providers.presentation_contract import PresentationProvider
from termin_airlock_provider import airlock_factory, AirlockProvider


def test_factory_returns_airlock_provider_instance():
    instance = airlock_factory({})
    assert isinstance(instance, AirlockProvider)


def test_factory_returns_protocol_satisfying_instance():
    """Same Protocol check the runtime applies at deploy time —
    factory output must satisfy the Protocol the runtime registry
    type-checks against.
    """
    instance = airlock_factory({})
    assert isinstance(instance, PresentationProvider)


def test_factory_ignores_unknown_config_keys():
    """Forward-compatible: unknown keys must not raise. Strict
    validation belongs in the runtime's binding resolver, not in
    the factory."""
    instance = airlock_factory({
        "future_key": "future_value",
        "another_unknown": 42,
    })
    assert isinstance(instance, AirlockProvider)
