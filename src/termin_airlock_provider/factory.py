# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""Factory for AirlockProvider — invoked by the Termin runtime at startup.

Per BRD #1 §3 the provider registry calls a factory function with the
resolved deploy config; the factory returns a provider instance. This
keeps the construction surface isolated and makes provider config
parsing one-stop.
"""

from __future__ import annotations

from typing import Any, Mapping

from termin_airlock_provider.provider import AirlockProvider


def airlock_factory(config: Mapping[str, Any]) -> AirlockProvider:
    """Construct an AirlockProvider from a deploy-config mapping.

    Recognized keys in ``config``:
        bundle_url_override: optional string. Overrides the default
            self-hosted bundle URL — typically used to point at a
            CDN for production deployments.

    Unknown keys are ignored — forward-compatible with future config
    additions. Strict validation belongs in the runtime's binding
    resolver, not here.
    """
    return AirlockProvider(
        bundle_url_override=config.get("bundle_url_override"),
    )


__all__ = ["airlock_factory"]
