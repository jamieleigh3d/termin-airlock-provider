# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""termin-airlock-provider — presentation provider for Airlock-on-Termin.

Implements six custom presentation contracts in the ``airlock.*``
namespace; ports the existing Airlock React frontend into a single
CSR bundle delivered through Termin's presentation provider system.

Public surface:

    AirlockProvider — the provider class implementing
        ``termin_core.providers.presentation_contract.PresentationProvider``.
    airlock_factory — the factory function the runtime calls at deploy
        time; constructs an ``AirlockProvider`` with the resolved config.
    register_airlock — registers the six custom contracts in the
        ``airlock`` namespace and the provider records against them.
        Auto-invoked by the Termin runtime via the ``termin.providers``
        entry-point group declared in setup.py.

See the README for the contract list and the v0.9.4 tech design at
``termin-compiler/docs/termin-v0.9.4-airlock-on-termin-tech-design.md``
for the architectural decisions.
"""

# Canonical package version per
# ``termin-compiler/docs/version-policy.md`` §2.1. release.py bumps
# THIS value; everywhere else that needs the package version
# (registration.py's provider records, the bundle build pipeline)
# imports it from here.
#
# Declared BEFORE the submodule imports below because registration.py
# does ``from termin_airlock_provider import __version__`` at
# module-load time; the assignment must happen first.
__version__ = "0.9.4.dev0"

from termin_airlock_provider.provider import AirlockProvider  # noqa: E402
from termin_airlock_provider.factory import airlock_factory  # noqa: E402
from termin_airlock_provider.registration import register_airlock  # noqa: E402

__all__ = [
    "AirlockProvider",
    "airlock_factory",
    "register_airlock",
    "__version__",
]
