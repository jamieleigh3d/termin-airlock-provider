# Changelog

All notable changes to `termin-airlock-provider` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (slice A1 — provider package scaffold)

- Initial scaffold: repo metadata (LICENSE, NOTICE, README, CONTRIBUTING,
  CLAUDE.md, .gitignore).
- Python `AirlockProvider` class implementing the `PresentationProvider`
  Protocol from `termin_core.providers.presentation_contract`. Declares
  the six `airlock.*` custom contracts. SSR + CSR hybrid render mode —
  this is not a CSR-only provider (unlike Spectrum).
- `airlock_factory(config)` — factory function the Termin runtime calls
  at app startup; constructs an `AirlockProvider` with the resolved
  deploy config (currently only `bundle_url_override` is recognized).
- `register_airlock(provider_registry, contract_registry)` — registers
  the six custom contracts in the `airlock` namespace and the provider
  records against them. Auto-invoked by the runtime via the
  `termin.providers` entry point declared in `setup.py`.
- `theme_tokens` module — color palette + typography tokens from the
  v0.9.4 tech design §5.4 (deep-space backgrounds, cyan/amber/red
  accents, JetBrains Mono). Text-label backups for every color-coded
  distinction per BRD #2 §13.4 (colorblindness accessibility).
- `ssr_shells` module — placeholder Jinja2 shells per contract.
  Slice A2 replaces these with React-hydration-ready containers; for
  now they emit `<div data-airlock-contract="...">` markers so the CSR
  bundle has anchor points to mount into.
- Frontend skeleton: `package.json`, `vite.config.ts`,
  `tailwind.config.js` with the airlock theme tokens, `src/index.tsx`
  registering one labeled-placeholder renderer per contract. Real React
  components land in slice A2.
- Python conformance tests (`tests_py/`):
  - `test_provider_protocol.py` — Protocol satisfaction; declares all
    six contracts; render mode is `("ssr", "csr")`.
  - `test_factory_registration.py` — factory accepts deploy config and
    produces a Protocol-satisfying instance.
  - `test_registration.py` — `register_airlock` registers all six
    contracts and the provider records against them; idempotent.
  - `test_bundle_url.py` — bundle URL override path matches the
    Spectrum convention.
- `setup.py` declares the `termin.providers` entry point so the runtime
  auto-discovers the provider; pins `termin-core>=0.9.0,<0.10` and
  `termin-server>=0.9.0,<0.10` per the v0.9 family alignment.

### Notes

This is the v0.9.4 slice A1 deliverable per the tech design at
[`termin-compiler/docs/termin-v0.9.4-airlock-on-termin-tech-design.md`](https://github.com/jamieleigh3d/termin-compiler/blob/main/docs/termin-v0.9.4-airlock-on-termin-tech-design.md)
§9. Slice A2 (provider frontend components) is the next deliverable —
real React components from the current Airlock frontend get ported into
`frontend/src/components/` and wired to the contract registrations.
