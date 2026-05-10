# termin-airlock-provider — Claude Context

This file is for Claude Code sessions working in this repository.
Universal norms (who JL is, git discipline, environment quirks) live in
`~/.claude/CLAUDE.md` and load automatically. Termin-family working style
(TDD, three test levels, PEG authority) lives in
`E:\ClaudeWorkspace\CLAUDE.md`. This file holds the repo-specific
context only.

## Public-Repo Codename Discipline (NON-NEGOTIABLE)

**This repository is public.** Anything written here ships publicly the
moment the next push goes out.

- **Never write internal employer/vendor codenames** in this tree. Not
  in `*.tsx` / `*.py` source code comments, not in markdown (README,
  design notes, CHANGELOG), not in commit messages, not in PR
  descriptions, not in test fixtures, not in bundle build configs. The
  bar is "recognizable only to someone with the corresponding
  employer/vendor context → omit or genericize."
- **Genericize.** "an AWS-native Termin runtime" when AWS context
  matters (enterprise, regulated, air-gapped). "an alternate Termin
  runtime" when the context is just "a second runtime exists." "a
  third-party Rust port" when the language matters.
- **No checked-in list of prohibited names.** A list of
  names-to-not-write would itself be a list of names. Discipline lives
  in private workspace context (`E:\ClaudeWorkspace\CLAUDE.md` and
  the journal), not in any file in this tree. When unsure: **omit and
  ask**.
- **Verify before every push** by reading your own diff critically.
  Pattern `<descriptor> (<internal name>, <context>)` in parentheses
  is the typical slip. Searching the diff for the word "internal" is
  a quick smell test.
- **History remediation** is a separate v1.0 public-launch operation;
  the discipline here is about *current state*. Every push starts
  clean.

Same rule lives in the other public Termin repos and in the
workspace-root `CLAUDE.md` so no session is more than one auto-loaded
file away from it.

## Product-content discipline (specific to this repo)

This repo ships the **technical surface** for Airlock-on-Termin — the
package shape, the six presentation contracts, the theme tokens, the
React component renderers. It does NOT ship:

- **The actual Airlock scenario content** (deliberate-flaw narrative,
  ARIA dialogue, OVERSEER trigger thresholds). Those live in the
  Airlock product BRD + product spec, which are
  Clarity-Intelligence-internal references.
- **ARIA's system prompts or scoring rubrics.** Same — those are
  product-spec material.
- **Real user data, session logs, score outputs.** Production Airlock
  data stays in production Airlock.
- **Production architecture details** (the existing PostgreSQL stack,
  the Express server, the JWT projection internals). The tech design
  doc references these at a high level; the repo source code does
  not.

The `.termin` source for the v0.9.4 sample app lives in
`termin-compiler/examples/airlock.termin` (slice A3a). The provider
package's job is to render whatever component-IR fragment the runtime
hands it; the product specifics live in the `.termin` source and in
the React components that interpret it.

## What this is

The Termin presentation provider for Airlock — a hybrid Python + Node
package, parallel in shape to `termin-spectrum-provider`. The provider
declares six custom contracts in the `airlock.*` namespace, ships
SSR placeholder shells + a React 19 / Tailwind v4 / Vite CSR bundle,
and serves as the visual surface for the v0.9.4 Airlock-on-Termin
deployment.

## Layout

- `src/termin_airlock_provider/` — Python package.
  - `provider.py` — `AirlockProvider` class implementing the
    `PresentationProvider` Protocol.
  - `factory.py` — `airlock_factory(config)` the Termin runtime
    invokes at app startup.
  - `registration.py` — `register_airlock(...)` that registers
    contracts + provider records.
  - `ssr_shells.py` — placeholder SSR templates per contract; slice
    A2 replaces with React-hydration containers.
  - `theme_tokens.py` — color + typography from tech design §5.4.
  - `static/bundle.js` — built JS (gitignored — built in CI).
- `frontend/` — TypeScript + Vite project.
  - `src/index.tsx` — entry point; registers per-contract renderers.
  - `src/components/` — React components (slice A2 fills this in
    by porting from the existing Airlock frontend).
  - `src/styles/` — CRT scanline + glow + vignette CSS.
  - `tailwind.config.js` — airlock theme tokens.
- `tests_py/` — Python conformance (pytest).
- `tests/` — JS unit tests (vitest), once the frontend lands.

## Working style

- **Python tests must pass without `npm install`.** The Python
  conformance verifies Protocol satisfaction, factory registration,
  contract registration, bundle URL override — none of that needs the
  bundle to exist. CI builds the bundle separately.
- **The bundle is not committed.** `src/termin_airlock_provider/static/bundle.js`
  is gitignored. CI rebuilds on every PR; release tags ship the
  wheel with the bundle baked in as package data.
- **Editable installs for cross-repo dev.** From the activated venv:
  `pip install -e ../termin-core` then `pip install -e ../termin-server`
  then `pip install -e ../termin-compiler` then `pip install -e .`
  No git submodules, no path-discovery code.
- **Version policy.** Per
  [`termin-compiler/docs/version-policy.md`](https://github.com/jamieleigh3d/termin-compiler/blob/main/docs/version-policy.md),
  the package version is declared once in `__init__.py::__version__`
  and imported everywhere. Provider records use
  `version=__version__` from this package, never a literal.

## Locked decisions (don't relitigate)

- **Per-provider package** (mirrors Spectrum Q1 from 2026-04-28).
  This repo exists because `termin-compiler` stays Python-only.
- **Six custom contracts in `airlock.*` namespace** — not the
  built-in `presentation-base.*` set. The Airlock UI is custom
  enough that mapping it onto the base contracts would force
  awkward shapes.
- **SSR + CSR hybrid** — not CSR-only (unlike Spectrum). SSR for
  initial paint, CSR for everything interactive (typewriter,
  terminal, timers, tool inspector). Per tech design §5.3.
- **React 19 + Tailwind v4 + Vite** — matches the existing Airlock
  frontend toolchain so the slice A2 port is a lift, not a
  re-implementation.
- **Self-hosted bundle + deploy-config CDN override** (mirrors
  Spectrum Q3). Default URL `/_termin/providers/airlock/bundle.js`;
  config `bundle_url_override` redirects to a CDN.

## v0.9.4 slice scope

This repo ships in the v0.9.4 release alongside `termin-compiler`,
`termin-core`, `termin-server`, `termin-conformance`, and
`termin-spectrum-provider`. The slices land in this order per
`termin-v0.9.4-airlock-on-termin-tech-design.md` §9:

- **A1** — provider package scaffold (this slice). Six contracts
  declared, SSR placeholder shells, CSR bundle skeleton, theme
  tokens.
- **A2** — provider frontend components. Port `Terminal`,
  `Timer`, `IncitingIncident`, `CosmicOrb`, `ScoreAxisCard`,
  `BadgeStrip` from the existing Airlock frontend; replace
  Express API calls with Termin runtime calls; replace
  localStorage tokens with Termin's auth flow.
- **A3a / A3b** — `airlock.termin` source authorship in
  `termin-compiler/examples/`. Identity, profiles, sessions,
  ten tool computes, three channels, six OVERSEER `When`
  rules, ARIA wired with conversation field. End-to-end
  smoke test.
- **A4** — meta-evaluator + profile aggregator computes; score
  JSON matches Airlock product schema verbatim.
- **A5** — pages (Landing, Survey, Scenario, Scoring, Results)
  + standalone deploy.

## What lives elsewhere

- **Contract Protocols** — in `termin-core`
  (`termin_core.providers.presentation_contract`). Don't redefine.
- **`PresentationData`, `PrincipalContext`, `Redacted`** — same place.
  Imported, not re-implemented.
- **`Termin.registerRenderer`, `Termin.action`, `Termin.subscribe`** —
  in `termin-server`'s built-in JS. This bundle calls them; doesn't
  redefine them.
- **Conformance fixtures + IR schema** — in `termin-conformance`.
- **The `.termin` source for Airlock-on-Termin** — in
  `termin-compiler/examples/airlock.termin` (slice A3a).
- **Airlock product BRD + product spec** —
  Clarity-Intelligence-internal; not in any public Termin repo.

## Common commands

```bash
# Python tests
pytest tests_py/ -v

# JS build (one-shot — once the frontend lands in slice A2)
npm run build

# JS build (watch)
npm run watch

# JS tests
npm test

# Verify Python provider satisfies the Protocol
python -c "from termin_airlock_provider import AirlockProvider; \
           from termin_core.providers.presentation_contract import PresentationProvider; \
           assert isinstance(AirlockProvider(), PresentationProvider)"
```
