# Contributing to termin-airlock-provider

Thanks for your interest. This document covers local development setup, the DCO sign-off requirement, and what reviewers look for.

## Getting started

Read [termin-compiler/CONTRIBUTING.md](https://github.com/jamieleigh3d/termin-compiler/blob/main/CONTRIBUTING.md) first — it covers the project-wide norms (DCO, scope, provider-packaging philosophy). This file adds repo-specific detail.

## Local development setup

This is a hybrid Python + Node project. You need both toolchains.

### Sibling-checkout layout

The recommended layout puts this repo as a sibling of `termin-compiler`:

```
~/work/
├── termin-compiler/
└── termin-airlock-provider/
```

### Python side

```bash
# In a venv, with termin-compiler also editable:
cd ~/work/termin-compiler && pip install -e ".[test]"
cd ~/work/termin-airlock-provider && pip install -e ".[test]"

# Run Python conformance:
pytest tests_py/ -v
```

### Node side

```bash
cd ~/work/termin-airlock-provider
npm install
npm run build     # one-shot build to termin_airlock_provider/static/bundle.js
npm run watch     # rebuild on change
npm test          # vitest
```

### End-to-end

With both packages installed editable in the same venv, `termin-compiler`'s reference runtime can resolve the Airlock binding directly. Compile and serve a Termin app whose `deploy.json` binds `provider: "airlock"` and the runtime serves the locally built bundle from this package's `static/` directory.

## Build pipeline

- **JS bundle** — `npm run build` runs Vite (React 19 + Tailwind v4 toolchain) in production mode, output to `src/termin_airlock_provider/static/bundle.js`. The bundle is committed-by-CI / not-committed-by-hand: every release tag triggers a CI build that produces the artifact.
- **Bundle size budget** — soft cap ~250KB gzipped (React + the six per-contract renderers), hard fail at 350KB. Enforced in `.github/workflows/js.yml` once that workflow lands.
- **Python wheel** — `python -m build` produces a wheel that includes `src/termin_airlock_provider/static/bundle.js` as package data. PyPI publishing is automated on release tags once the package stabilizes.

## DCO sign-off

Every commit must be signed off:

```bash
git commit -s -m "Your message"
```

See [termin-compiler/CONTRIBUTING.md](https://github.com/jamieleigh3d/termin-compiler/blob/main/CONTRIBUTING.md#developer-certificate-of-origin-dco) for the full DCO terms.

## Code style

- **Python** — PEP 8. No hard line cap. Match the surrounding code.
- **TypeScript / TSX** — Prettier defaults (2-space indent, double quotes for JSX attrs, single quotes for JS strings). Tabs vs spaces: spaces.
- **No new dependencies without justification.** This repo aims for a small dependency footprint — every new transitive package widens the audit surface and the bundle size.

## Pull request checklist

Before marking ready for review:

- [ ] Every commit is signed off (`Signed-off-by:` trailer)
- [ ] Python tests pass (`pytest tests_py/ -v`)
- [ ] JS build succeeds (`npm run build`)
- [ ] JS tests pass (`npm test`)
- [ ] Bundle stays under the size budget
- [ ] CHANGELOG.md updated for end-user-visible changes
- [ ] Commit messages explain the "why," not just the "what"

## Scope

This repo is the **provider**. Contract definitions, the `PresentationProvider` Protocol, and any cross-cutting Termin runtime behavior live in [termin-compiler](https://github.com/jamieleigh3d/termin-compiler). If a contribution feels like it belongs in core, open an issue there first.
