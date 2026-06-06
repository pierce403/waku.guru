# AGENTS.md - Instructions for Coding Agents

This file adapts the repository-etiquette ideas from https://recurse.bot/ into
project-specific instructions for `waku.guru`. Keep it short, concrete, and
useful to the next agent.

## Self-Improvement Directive

When working on this repo, update this file when you learn something durable:
verified commands, deployment behavior, Waku SDK pitfalls, browser runtime
issues, collaborator preferences, or mistakes future agents should avoid.

## Responsibilities

- Keep `waku.guru` a static browser app that can publish from `main`/`docs`.
- Keep Waku scans user-triggered.
- Keep the scanner read-only: no wallet use, no proofs, no transaction
  submission, no bundler/paymaster/Pimlico calls.
- Keep default peers, topics, and fee-ad parsing aligned with the known working
  Waku discovery path in `../bindle`.
- Keep `FEATURES.md` current when adding or changing product behavior.
- Keep deployment notes current when GitHub Pages settings or DNS changes.

## Project Overview

`waku.guru` is a Vite, React, and TypeScript dashboard for exploring RAILGUN
broadcaster relays advertising over Waku. It uses `@waku/sdk@0.0.36` directly,
parses raw fee advertisements, and summarizes relay versions and capabilities.

Important paths:

- `src/lib/wakuScan.ts`: starts/stops the Waku light node and gathers messages.
- `src/lib/wakuFeeAds.ts`: validates and normalizes RAILGUN fee ads.
- `src/lib/relaySummary.ts`: groups raw ads into relay capability summaries.
- `src/App.tsx`: operator UI, filters, topology view, and detail panes.
- `FEATURES.md`: living feature requirements and acceptance criteria.
- `public/og-image.svg`: source for the generated Open Graph preview.
- `docs/`: generated static build committed for GitHub Pages.

## Build And Test Commands

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm preview
```

`pnpm build` is the deploy build. It writes to `docs/`.

## Coding Conventions

- Use TypeScript strict mode and keep Waku interactions typed where practical.
- Prefer small parser/summary helpers over parsing JSON inside React components.
- Keep UI controls dense and operator-focused.
- Do not add analytics, hidden remote endpoints, service workers, or automatic
  scans.
- Commit `docs/` after successful builds because GitHub Pages publishes from
  that folder.

## Known Issues And Pitfalls

- `@waku/sdk@0.0.36` hardcodes DNS discovery behavior. Keep DNS discovery
  disabled and dial only visible direct peers before peer exchange/cache.
- Browser Waku builds need Node polyfills in Vite. `vite.config.ts` includes
  `vite-plugin-node-polyfills`.
- `asn1.js` references Node `vm`; keep `src/shims/vm.ts` aliased in Vite.
- The production JS bundle is large because Waku/libp2p ships substantial
  browser code. A chunk-size warning is expected for now.
- Regenerate `public/og-image.png` from `public/og-image.svg` with headless
  Chrome/Chromium when changing the social preview.
- `waku.guru` is configured as the Pages custom domain. Keep Vite asset paths
  relative unless there is a strong reason to privilege only one host.
- ERC-4337 is not currently implemented as a parsed Waku relay schema here.
  Treat bundled candidate content topics as probes unless a real standard or
  observed schema is verified.

## Deployment Notes

GitHub Pages should publish from:

- branch: `main`
- path: `/docs`

The default Vite base is `./`, which lets both `https://waku.guru/` and the
fallback repo Pages URL load the same generated assets.
