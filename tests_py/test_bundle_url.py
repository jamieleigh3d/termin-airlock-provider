# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""bundle_url_override path follows the Spectrum convention.

Operators set ``bundle_url_override`` in deploy config to point at a
CDN; the provider's ``csr_bundle_url()`` returns whatever was passed
in. Default URL is a self-hosted route under
``/_termin/providers/airlock/bundle.js`` (parallels Spectrum).
"""

from __future__ import annotations

from termin_airlock_provider import AirlockProvider, airlock_factory
from termin_airlock_provider.provider import DEFAULT_BUNDLE_URL


def test_default_bundle_url_is_self_hosted():
    provider = AirlockProvider()
    assert provider.csr_bundle_url() == DEFAULT_BUNDLE_URL


def test_constructor_override_takes_effect():
    provider = AirlockProvider(
        bundle_url_override="https://cdn.example.com/airlock-v1/bundle.js",
    )
    assert provider.csr_bundle_url() == (
        "https://cdn.example.com/airlock-v1/bundle.js"
    )


def test_factory_passes_override_through():
    provider = airlock_factory({
        "bundle_url_override": "https://cdn.example.com/bundle.js",
    })
    assert provider.csr_bundle_url() == "https://cdn.example.com/bundle.js"


def test_factory_no_override_uses_default():
    provider = airlock_factory({})
    assert provider.csr_bundle_url() == DEFAULT_BUNDLE_URL
