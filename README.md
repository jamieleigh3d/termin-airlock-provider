# termin-airlock-provider

The Termin presentation provider for [Airlock](https://airlock.getclarit.ai),
the Clarity Intelligence AI-fluency assessment.

This package implements six custom presentation contracts in the `airlock.*`
namespace, ports the Airlock React frontend into a single CSR bundle, and
delivers the CRT-themed scenario UI as a Termin presentation provider —
parallel to [`termin-spectrum-provider`](https://github.com/jamieleigh3d/termin-spectrum-provider)
in package shape.

**Status:** scaffold (slice A1 of the v0.9.4 Airlock-on-Termin tech design).
The provider declares its six contracts and ships SSR placeholder shells +
a CSR bundle skeleton; real component renderers land in slice A2.

## What this is

Airlock-on-Termin is the v0.9.4 advanced sample app for the
[Termin platform](https://termin.dev). The `.termin` source for the app
ships in [`termin-compiler/examples/airlock.termin`](https://github.com/jamieleigh3d/termin-compiler).
This repository ships only the presentation provider — the visual surface
that turns the compiled app's component tree into the CRT-themed Airlock
scenario UI.

The production Airlock continues to run independently on its existing
stack. This Termin port is a second instance of the product, hosted on
Termin, used as a forcing function for the platform's security and
provider-system claims. See
[`termin-compiler/docs/termin-v0.9.4-airlock-on-termin-tech-design.md`](https://github.com/jamieleigh3d/termin-compiler/blob/main/docs/termin-v0.9.4-airlock-on-termin-tech-design.md)
for the technical design that motivates this package.

## The six contracts

| Contract | Purpose |
|----------|---------|
| `airlock.cosmic-orb` | Animated SVG starfield + planet + airlock door scene (inciting incident). |
| `airlock.scenario-narrative` | Typewriter-effect text reveal (inciting incident sequence). |
| `airlock.terminal` | Scrolling chat with role-differentiated message styling, input box, tool-call inspector panel. Binds to a v0.9.2 `conversation` field. |
| `airlock.countdown-timer` | User + ARIA timers with intensity-escalation visual cues (always-visible top bar). |
| `airlock.score-axis-card` | Three-axis score display with evidence + next-level tip (results view). |
| `airlock.badge-strip` | Badge collection display, earned + unearned, accessible (profile + results). |

Each contract is registered against the Termin runtime's `ContractRegistry`
in the `airlock` namespace. The provider's SSR + CSR pair handles every
contract via a `contract`-discriminator dispatch (mirroring the Spectrum
provider's pattern but with hybrid render mode).

## Quick start

This is a hybrid Python + Node project. See [CONTRIBUTING.md](CONTRIBUTING.md)
for the full local-dev setup. The thirty-second version:

```bash
# Python side
pip install -e ".[test]"
pytest tests_py/ -v

# JS side
cd frontend
npm install
npm run dev         # dev-mode preview at http://localhost:5173 (see below)
npm run build       # one-shot bundle to src/termin_airlock_provider/static/bundle.js
npm run watch       # rebuild on change
npm test            # vitest
```

### Preview the components in a browser

The dev-mode harness mocks the Termin runtime API
(`window.Termin.registerRenderer`) and mounts each implemented
contract with a sample IR fragment, so you can iterate on the
components without standing up the full Termin server.

```bash
cd frontend
npm install      # first time only
npm run dev
```

Vite prints `Local: http://localhost:5173/`. Open that in any
browser. As of slice A2 PoC the preview shows
`airlock.cosmic-orb` (the orbital airlock door scene) with
`airlock.scenario-narrative` (typewriter overlay) on top — exactly
the composition the v0.9.4 inciting-incident page uses. The
narrative content is generic Termin-themed placeholder text; the
production Airlock scenario lives in the Clarity-Intelligence-internal
product spec and ships through `.termin` source in slice A3a.

The four contracts not yet implemented (`terminal`,
`countdown-timer`, `score-axis-card`, `badge-strip`) still mount
the slice-A1 placeholder; they'll fill in as their slices land.

## Architecture

- **CSR-only.** `render_modes = ("csr",)`. The runtime's CSR shell
  path in termin-server is the integration surface that dispatches
  custom-namespace contracts to registered providers today (Spectrum
  is the precedent). The SSR dispatch path doesn't yet look up
  custom providers by `node.contract`; once that wires (a v0.9.4
  follow-up), this provider may opt back into `("ssr", "csr")`.
- **Termin runtime is authoritative for trust and data.** The frontend
  calls Termin's auto-generated CRUD endpoints, compute trigger
  endpoints, and the v0.9.2 conversation-append handler. There is no
  separate API server.
- **CRT theme via Tailwind v4 CSS-first config.** Color palette and
  typography come from
  [`docs/termin-v0.9.4-airlock-on-termin-tech-design.md`](https://github.com/jamieleigh3d/termin-compiler/blob/main/docs/termin-v0.9.4-airlock-on-termin-tech-design.md)
  §5.4 (deep-space backgrounds, cyan/amber/red accents, JetBrains Mono).
  Tokens declared via Tailwind v4 `@theme` directives in
  `frontend/src/styles/airlock.css`; mirrored in
  `src/termin_airlock_provider/theme_tokens.py` for the Python side.
  Accessibility: every color-coded role distinction has a text-label
  backup (label prefixes, alignment, icon shape) per BRD §13.4.

## Versioning

Follows the Termin v0.9 family release cadence. The package version
is declared in `src/termin_airlock_provider/__init__.py::__version__`
once and imported everywhere else, per the
[Termin version policy](https://github.com/jamieleigh3d/termin-compiler/blob/main/docs/version-policy.md).

## License

Apache License 2.0. See [LICENSE](LICENSE) for the full text and
[NOTICE](NOTICE) for attribution.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Contributions require a Developer
Certificate of Origin (DCO) sign-off on each commit.
