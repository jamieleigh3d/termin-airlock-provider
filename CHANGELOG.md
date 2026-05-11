# Changelog

All notable changes to `termin-airlock-provider` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added (slice A5 — live data-fetching wrappers)

- **`LiveCountdownTimer`, `LiveScoreAxisCards`, `LiveBadgeStrip`,
  `LiveTerminal`** in `frontend/src/components/live/`. Each
  wraps its inner component with a fetch-on-mount that hits the
  Termin REST surface (`/api/v1/<source>`), picks the relevant
  record(s) (in-scenario session, post-game complete session,
  caller's profile), parses the field shape (JSON-text for
  aiosqlite-backed conversation_log + all_badges + scores), and
  computes the component's props.

  Background. The v0.9.4 runtime's SSR path passes empty
  PresentationData to `provider.render_ssr`, and the CSR mount-
  point serializes the IR node without records. The .termin
  source declares `Display a table of sessions / Using
  "airlock.X"`, which produces an IR fragment with the source
  name but no rows. These wrappers do what the runtime doesn't
  yet: fetch the records and compute the props the inner
  component needs.

  Each wrapper renders a placeholder (zero-second timer, loading
  axis cards, no-earned-badges silhouettes, empty read-only
  terminal) while the fetch is in flight, and a graceful
  fallback if the fetch fails. Server-side `bound_data` plumbing
  (the path the SSR Protocol already supports via
  `PresentationData`) is a v0.10 candidate; once that lands the
  fetch-on-mount can drop in favor of synchronous extraction
  from the fragment.

- **`AIRLOCK_AXES`** in `LiveScoreAxisCards.tsx` — the three
  scoring axes (OF=cyan, GC=green, BF=amber) with their level
  counts (4/4/5). Per-axis accents are fixed by airlock product
  spec; the level labels themselves come from the evaluator's
  scoring output (product content, runtime-supplied).

- **`AIRLOCK_BADGE_CATALOG`** in `LiveBadgeStrip.tsx` —
  hardcoded five-badge fallback (diagnostician / fixer /
  compassionate / decisive / skeptic) keyed to the airlock
  scenario. Clearly marked as a v0.9.4 measure pending grammar
  support for runtime-supplied catalogs; the `BadgeStrip`
  component itself stays catalog-agnostic.

- **Contract-registration logic in `index.tsx` updated** to pick
  between the static-prop path (when the IR fragment carries
  pre-computed props — the path bound_data plumbing will use)
  and the live path (when the fragment is empty — the v0.9.4
  norm). Existing tests covering static-prop extraction
  continue to pass; new tests cover the live path.

  Test count: frontend 64 → 118 passing (54 new tests in
  `live/*.test.tsx`). Python provider tests unchanged (26/26).

### Fixed (Path C — Vite library-mode `process.env.NODE_ENV` substitution)

- **`vite.config.ts` now sets `define: { "process.env.NODE_ENV":
  JSON.stringify("production") }`.** React's bundled CJS source
  branches on `process.env.NODE_ENV` to pick dev vs prod code
  paths. Vite's *app* mode replaces this token at build time, but
  Vite's *library* mode (`build.lib`) does NOT — the assumption
  is that a library consumer runs their own bundler that performs
  the replacement. Our consumer is the browser via a raw
  `<script src>` tag (the runtime serves `bundle.js` directly),
  so we do the substitution ourselves. Without the define, the
  bundle crashed at load with `ReferenceError: process is not
  defined` before reaching the `Termin.registerRenderer` calls
  — the contracts never got registered, the page rendered an
  empty mount-point div, and the only signal was the
  `[Termin] hydrateCsrMounts: no renderer for "airlock.cosmic-orb"`
  warning the new termin.js hydrator surfaces (Path C
  termin-server change).
- **Bundle size: 591 KB → 203 KB unminified, 175 KB → 63 KB
  gzipped.** The substitution lets the production build of React
  tree-shake the dev-only invariants, dev warnings, and the
  scheduler's profiling hooks. No JS source or component changes
  — just the build define.
- Verified end-to-end through the actual Termin runtime via the
  `airlock-smoke-runtime` launch entry: HTTP request returns the
  mount-point div with the cosmic-orb contract attribute; the
  bundle loads via `/_termin/providers/airlock/bundle.js`; the
  v0.9.4 Path C `hydrateCsrMounts()` finds the mount point,
  parses the IR fragment, calls the registered renderer, and
  React mounts the CosmicOrb SVG. Confirmed via DOM inspection
  (renderer registered, mount-point hydrated, SVG present with
  the expected `data-airlock-component` and aria-label).

### Changed (Path B prep — CSR-only switch + Tailwind v4 fix)

- **`AirlockProvider.render_modes` is now `("csr",)`** (was
  `("ssr", "csr")` from slice A1). The runtime's CSR shell path
  in `termin-server` is the integration surface that dispatches
  custom-namespace contracts to registered providers today
  (Spectrum is the precedent). The SSR dispatch path in
  `termin_server.presentation.render_component` does not yet
  look up custom providers by `node.contract`; a follow-up slice
  in the v0.9.4 work (Path C) wires that, after which this
  provider may opt back into `("ssr", "csr")`.
- **`render_ssr` now raises `NotImplementedError`** (matches
  `SpectrumProvider.render_ssr` convention). Calling it on a
  CSR-only provider is a deployment misconfiguration; failing
  loud catches the misconfiguration at the call site rather than
  silently returning empty markup.
- **`ssr_shells.py` deleted.** It was dead code in CSR-only mode
  — the runtime's CSR shell path emits its own mount-point
  containers; the provider doesn't need to. The Jinja2-based
  placeholder shells from slice A1 served their purpose
  documenting the contract surface; that documentation now lives
  in the provider docstrings.
- **Updated the two provider-protocol tests** to assert the new
  CSR-only contract:
  - `test_airlock_provider_declares_csr_only` (was
    `test_airlock_provider_declares_ssr_and_csr`)
  - `test_render_ssr_raises_not_implemented` (was
    `test_render_ssr_known_contract_returns_marker`)
  - The 9-test `tests_py/test_ssr_shells.py` file is deleted
    along with the module it tested.
- Total Python tests: 36 → 26 (-10 from the deletions; -1 from
  the protocol test consolidation).

### Fixed (Path B — Tailwind v4 setup + dev preview hoisting bug)

- **Installed `@tailwindcss/vite`** plugin and added it to
  `vite.config.ts` plugins. v0.9.4-dev0 shipped without the
  Tailwind processor wired to Vite, which meant the CSS bundle
  contained Tailwind's default theme dump but NONE of the custom
  utility classes the React components used (`text-accent-cyan`,
  `bg-bg-elevated`, `max-w-2xl`, etc.). Without the plugin every
  utility class was a no-op, the layout collapsed, colors didn't
  apply.
- **Ported theme tokens from `tailwind.config.js` (v3 JS config)
  to v4 CSS-first `@theme` directives** in
  `frontend/src/styles/airlock.css`. Tailwind v4 reads custom
  colors and font tokens from `@theme { --color-X: ...; }`
  declarations; the `--color-X` custom properties drive
  `text-X` / `bg-X` / `border-X` utility class generation. The
  Python source-of-truth at `theme_tokens.py` stays unchanged;
  the CSS now mirrors it. Lockstep is manual until a build-time
  generator lands.
- **Deleted `tailwind.config.js`** — the v3 JS config is no
  longer consulted in v4 CSS-first mode.
- **Fixed the ES module hoisting bug in `dev/demo.tsx`.** The
  v0.9.4-dev0 dev-preview harness inlined
  `window.Termin = {...}` ABOVE `import "../index"`, expecting
  the assignment to run first. ES module imports get hoisted to
  the top of the importing module regardless of source position,
  so `import "../index"` ran first, the production entry point
  saw `window.Termin` undefined, printed a warning, and bailed
  before mounting any renderers. Split the mock setup into a
  separate `dev/setup-termin-mock.ts` module imported FIRST in
  source order — ES modules evaluate in source-order on first
  encounter, so the assignment now runs before the production
  entry's registrations execute.
- **Bundle size: 591 KB unminified, 175 KB gzipped** (unchanged
  from slice A2 PoC — the JIT processor only emits utilities
  the components reference, so adding the plugin REDUCED the
  CSS size from 21 KB to 13 KB without changing the JS bundle).
- Verified end-to-end via Claude Preview MCP — the dev harness
  now renders the CosmicOrb SVG with the typewriter narrative
  overlay, JetBrains Mono font applied, custom colors apply,
  layout correct.

### Notes (Path B — runtime preview deferred to Path C)

- Path B was scoped to give the dev-mode preview AND attempt the
  real-runtime preview. The dev preview works. The real-runtime
  preview hit a known wall:
  `bootstrap.py::page_should_use_shell` in `termin-server`
  triggers the CSR shell path ONLY when the bound provider for
  `presentation-base.page` is CSR-only. With tailwind-default
  bound to `presentation-base` (the standard config), the SSR
  pipeline runs, and the SSR pipeline at
  `presentation.py::render_component` line 1033 dispatches by
  `node.type` (NOT `node.contract`) — which means the
  `Using "airlock.cosmic-orb"` override in the smoke `.termin`
  source is dropped on the floor at render time, and the table
  renders via the built-in Tailwind `data_table` renderer.
- The fix is the per-component dispatch the docstring of
  `page_should_use_shell` references as "5b.3 full per-contract
  dispatch." That work is Path C in the v0.9.4 plan — wires
  `node.contract` lookup into the SSR dispatch path so
  `Using "airlock.cosmic-orb"` actually reaches
  `provider.render_ssr` (or, for CSR-only providers, emits the
  bundle's mount-point div for the per-component dispatch).
  3-4 strategic lines per the agent audit.
- `examples-dev/airlock_smoke.termin` and
  `airlock_smoke.deploy.json` ship in this commit (under
  `termin-compiler`) so Path C has a ready fixture to validate
  against. The compile is clean today; the dispatch is the gap.

### Added (slice A2 PoC — dev-mode preview harness)

- **`frontend/index.html` + `frontend/src/dev/demo.tsx`** — Vite
  dev-mode preview that mocks `window.Termin.registerRenderer`,
  imports the production entry point so its registrations fire,
  and manually mounts `airlock.cosmic-orb` (full-viewport
  background) with `airlock.scenario-narrative` (typewriter
  overlay) — same composition the v0.9.4 inciting-incident page
  uses. Run with `cd frontend && npm install && npm run dev`,
  then open the URL Vite prints (default `http://localhost:5173`).
  Demo narrative is generic Termin-themed placeholder text — NOT
  the production Airlock product scenario, which ships through
  `.termin` source in slice A3a.
- **`npm run dev` script** added to `package.json` so the preview
  command is discoverable from `package.json` directly.

### Added (slice A2 PoC — `cosmic-orb` + `scenario-narrative`)

- **`CosmicOrb` React component** at
  `frontend/src/components/CosmicOrb.tsx` — full SVG of the orbital
  airlock door scene (deep-space backdrop, planet with continents +
  ice cap + cloud wisps + atmosphere rim, hatch viewport with
  mounting bolts, structural panel seams, conduit pipes, equipment
  boxes, warning light strips, hazard floor stripes, subtle drift
  animation on the planet+stars layer). Pure aesthetic geometry —
  no product content baked in. Mounted by the `airlock.cosmic-orb`
  contract registration in `index.tsx`. Stable across re-renders
  via deterministic LCG starfield + memoized hatch-bolt
  positions.
- **`ScenarioNarrative` React component** at
  `frontend/src/components/ScenarioNarrative.tsx` — typewriter
  text reveal driven by IR fragment props. Closed `LineKind`
  enum (`header | subheader | body | narrative | alert |
  alert-pulsing`) maps to Tailwind class sets internally so the
  `.termin` source authors *what a line means* rather than *what
  classes it has*. Per-line `delay` (relative to mount) drives the
  pacing. Optional `onComplete` callback fires once after the last
  line — useful for the .termin source to wire a state transition
  or follow-on action button. Defensive on malformed IR (extracts
  `props.lines` with type guards; falls back to empty list rather
  than crashing the page).
- **Vitest test suite** (`frontend/vitest.config.ts` + 15 unit
  tests in `frontend/src/components/*.test.tsx`):
  - `CosmicOrb.test.tsx` (6) — SVG present with expected
    `data-airlock-component`, aria-label, viewBox, starfield,
    drift animation, className override.
  - `ScenarioNarrative.test.tsx` (9) — empty initial state,
    progressive line reveal as timers fire, every kind has a
    distinct class assignment, empty text becomes non-breaking
    space, `onComplete` fires once after last delay (NOT twice
    on re-render), empty lines list doesn't crash, className
    override.
- **`index.tsx` updated** to register the real `CosmicOrb` and
  `ScenarioNarrative` renderers for their contract names. The
  other four contracts continue to mount the slice-A1 placeholder
  until their slice lands.
- **`setup.py` package_data extended** to include `style.css` and
  `bundle.js.map` (Vite emits all three artifacts; the runtime
  serves all three from the static/ directory).
- **`.gitignore` extended** to exclude `style.css` (build artifact
  alongside `bundle.js`).
- **Test counts:**
  - Python: 36 passing (unchanged from slice A1 — provider
    Python surface untouched).
  - JS: 15 passing (vitest, jsdom).
  - TypeScript strict-mode: clean (`tsc --noEmit`).
  - Vite production build: clean. Bundle size 591 KB unminified,
    175 KB gzipped — well under the 250 KB gzipped soft cap
    documented in CONTRIBUTING.md.

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
