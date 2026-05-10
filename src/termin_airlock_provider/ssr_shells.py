# Copyright 2026 Jamie-Leigh Blake and Termin project contributors
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#     http://www.apache.org/licenses/LICENSE-2.0

"""SSR placeholder shells for the six Airlock contracts.

Slice A1 (this scaffold): each contract emits a single
``<div data-airlock-contract="..." data-airlock-ir="...">`` marker
the CSR bundle targets to mount its real React component into. The
``data-airlock-ir`` attribute carries a JSON-encoded snapshot of the
component-IR fragment so the React bundle has the same input the
runtime would have given a CSR-only provider.

Slice A2 replaces these placeholders with hydration-ready containers
that include the critical CSS for the CRT aesthetic so the first
paint doesn't flash white before the bundle loads.

The Jinja2 templating used here is internal to this module; callers
of ``render_shell`` see the rendered HTML string only. Markdown
sanitization is applied by the runtime *before* the data reaches us
(per BRD #2 §7.3) so the JSON we encode here is the data the runtime
already trusts.
"""

from __future__ import annotations

import html
import json
from typing import Any

from jinja2 import Template

from termin_core.providers.presentation_contract import (
    PresentationData,
    PrincipalContext,
)


# Single Jinja2 template that handles all six contracts uniformly.
# Slice A2 will introduce per-contract templates with the right
# critical CSS skeletons baked in; for slice A1 the placeholder is
# the same shape per contract.
_PLACEHOLDER_TEMPLATE = Template(
    '<div data-airlock-contract="{{ contract }}" '
    'data-airlock-ir="{{ ir_json }}" '
    'class="airlock-shell airlock-shell--{{ contract_slug }}">'
    '<noscript>'
    'This Airlock contract requires JavaScript to render. '
    'Contract: {{ contract }}.'
    '</noscript>'
    '</div>'
)


def render_shell(
    contract: str,
    ir_fragment: Any,
    data: PresentationData,
    principal_context: PrincipalContext,
) -> str:
    """Render a placeholder shell for one contract.

    Returns an HTML string the runtime composites into the page
    response. The CSR bundle targets ``[data-airlock-contract="..."]``
    selectors and mounts its React component into each one,
    consuming ``data-airlock-ir`` as the fragment input.

    Args:
        contract: full contract name, e.g. ``airlock.cosmic-orb``.
        ir_fragment: the ComponentNode dict (lowered IR) for this
            instance. Slice A1 just round-trips it as JSON in a
            data attribute; slice A2's React components consume it.
        data: PresentationData (rows, props, meta, etc.) the runtime
            bound to this fragment. Slice A1 ignores it; slice A2's
            renderers pull from it.
        principal_context: the calling principal + scopes. Slice A1
            ignores it; slice A2 uses it for permission-aware
            visibility (e.g. tool inspector visible only with
            ``view_tool_calls`` scope).

    Returns:
        Rendered HTML string. Already escape-safe — the IR is
        encoded as a JSON string and HTML-escaped via Jinja2's
        autoescape on the data attribute.
    """
    # Slug the contract name into a CSS-safe form
    # (``airlock.cosmic-orb`` → ``cosmic-orb``).
    contract_slug = contract.split(".", 1)[1] if "." in contract else contract
    return _PLACEHOLDER_TEMPLATE.render(
        contract=contract,
        contract_slug=contract_slug,
        # JSON-encode and HTML-escape the fragment so it round-trips
        # safely through the data attribute even if the IR contains
        # quote characters. The CSR bundle will JSON.parse it back.
        ir_json=html.escape(
            json.dumps(ir_fragment, default=str), quote=True
        ),
    )


__all__ = ["render_shell"]
