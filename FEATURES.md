---
version: 1.0.0
last_updated: 2026-06-06
stable: 5
in_progress: 3
planned: 3
---

# waku.guru - Features

## Overview

`waku.guru` is a static browser explorer for Waku network services and
application-level relay advertisements. The first parsed application target is
RAILGUN broadcaster fee advertisements. Generic content-topic probing is
available for emerging targets such as ERC-4337 relay discovery, Graphcast,
Status, and encrypted communication/storage coordination.

## Features

### Static GitHub Pages App

- **Stability**: stable
- **Description**: Vite builds the app into `docs/` for GitHub Pages branch
  publishing.
- **Properties**:
  - `pnpm build` writes `docs/index.html` and hashed assets under `docs/assets/`.
  - The default Vite base path is `./`.
  - GitHub Pages is configured for branch `main`, path `/docs`.
  - `docs/CNAME` configures `waku.guru` as the custom domain.
- **Test Criteria**:
  - [x] `pnpm build` completes.
  - [x] GitHub Pages API reports `status: built`.
  - [x] Live Pages HTML, JS, and CSS return HTTP 200.
- **Notes**: The fallback URL is `https://pierce403.github.io/waku.guru/`.

### User-Triggered Waku Scan

- **Stability**: stable
- **Description**: Starts a browser Waku light node only after the operator
  clicks Scan.
- **Properties**:
  - Waku default bootstrap is disabled.
  - DNS discovery is disabled.
  - Only visible direct peers are dialed before peer exchange/cache.
  - Filter, LightPush, and Store peer readiness are reported.
- **Test Criteria**:
  - [x] Scanner options call `createLightNode()` with `defaultBootstrap: false`.
  - [x] Scanner options set `discovery.dns: false`.
  - [x] UI exposes direct peer multiaddrs before scanning.

### RAILGUN Broadcaster Fee-Ad Parser

- **Stability**: stable
- **Description**: Parses current-format RAILGUN broadcaster fee advertisements
  from `/railgun/v2/0-1-fees/json`.
- **Properties**:
  - Extracts broadcaster version, 0zk recipient, fee token quotes, fee expiry,
    wallet capacity, reliability, relay adapters, required POI list keys, and
    signature presence.
  - Groups advertisements into relay summaries.
  - Distinguishes usable, advertised, expired, and incompatible relays.
- **Test Criteria**:
  - [x] TypeScript parser validates fee-ad JSON and hex payloads.
  - [x] Relay detail UI renders version, fee tokens, relay adapters, POI keys,
    last seen time, and usability issues.
  - [x] Search and filters operate on parsed relay summaries.

### Generic Content-Topic Observation

- **Stability**: in-progress
- **Description**: Observes arbitrary Waku content topics without assuming a
  schema.
- **Properties**:
  - Multiple content topics can be scanned in one run.
  - Message counts and last-seen timestamps are tracked per topic.
  - Small UTF-8/JSON payload previews are shown when payloads are readable.
- **Test Criteria**:
  - [x] UI exposes editable content topics.
  - [x] Scanner builds decoders for all selected content topics.
  - [x] Observed topic cards show counts and last-seen status.
  - [ ] Add fixture tests for generic topic observation.

### Waku Capability Guide

- **Stability**: in-progress
- **Description**: Explains observed network services and the capabilities each
  target depends on.
- **Properties**:
  - Shows target-specific capabilities.
  - Shows protocol service roles for Filter, Store, Light Push, and Peer
    Exchange.
  - Peer rows show advertised protocol support.
- **Test Criteria**:
  - [x] Capability chips update when selecting exploration targets.
  - [x] Peer rows include Filter, LightPush, Store, and Relay protocol badges.
  - [ ] Add visual regression coverage for mobile layout.

### Research Radar

- **Stability**: in-progress
- **Description**: Tracks Waku use cases and potential future parser targets.
- **Properties**:
  - RAILGUN is marked as parsed.
  - ERC-4337 is marked as a watchlist item, not a standardized Waku schema.
  - Graphcast, Status, and TACo/Codex-style use cases are marked as candidate
    areas to investigate.
- **Test Criteria**:
  - [x] Radar renders candidate domains in the app.
  - [x] README records research sources and limitations.
  - [ ] Add links from radar items to source documentation.

### ERC-4337 Relay Discovery Parser

- **Stability**: planned
- **Description**: Parse Waku-carried ERC-4337 relay advertisements if a real
  schema emerges.
- **Properties**:
  - Must not invent a standard content topic.
  - Should distinguish bundlers, paymasters, aggregators, EntryPoint versions,
    chains, simulation rules, and sponsored-gas policies.
  - Should verify whether observed traffic represents public infrastructure or
    an app-local experiment.
- **Test Criteria**:
  - [ ] Identify a documented or observed Waku content topic schema.
  - [ ] Add parser fixtures for bundler/paymaster advertisements.
  - [ ] Add UI columns for chain, EntryPoint, RPC methods, stake, and reputation.

### Graphcast And Indexer Message Exploration

- **Stability**: planned
- **Description**: Explore The Graph/Graphcast-style Waku messages if suitable
  public topics and payload schemas are identified.
- **Properties**:
  - Should show message type, signed sender identity, network/subgraph target,
    and timestamp if payloads are public and safe to decode.
- **Test Criteria**:
  - [ ] Identify current Graphcast Waku topics and payload schemas.
  - [ ] Add parser fixtures and UI summaries.

### Status And Community Messaging Exploration

- **Stability**: planned
- **Description**: Investigate Waku topics relevant to Status-style messaging
  without exposing private user content.
- **Properties**:
  - Must avoid decoding or displaying private chat content.
  - Should focus on aggregate topic presence, peer/service readiness, and public
    network health signals.
- **Test Criteria**:
  - [ ] Identify safe public metadata or avoid parser work entirely.
  - [ ] Document privacy constraints before implementation.

### Custom Domain

- **Stability**: stable
- **Description**: Serve the app at `https://waku.guru/`.
- **Properties**:
  - DNS for `waku.guru` must point at GitHub Pages.
  - Vite asset paths must work at the domain root.
  - Pages `cname` must match `waku.guru`.
- **Test Criteria**:
  - [x] `dig waku.guru` returns GitHub Pages-compatible DNS.
  - [x] GitHub Pages API reports `cname: waku.guru`.
  - [x] `https://waku.guru/` returns HTTP 200 and loads JS/CSS assets.

### Open Graph Preview Card

- **Stability**: stable
- **Description**: Provides a 1200x630 social preview image for link unfurls.
- **Properties**:
  - HTML includes Open Graph and Twitter summary-card metadata.
  - `og:image` points to an absolute HTTPS PNG URL.
  - The preview image has explicit 1200x630 dimensions and descriptive alt text.
  - The SVG source is kept in `public/og-image.svg`.
- **Test Criteria**:
  - [x] `https://waku.guru/og-image.png` returns HTTP 200.
  - [x] Root HTML contains `og:image`, `og:image:width`, `og:image:height`, and
    `twitter:card`.
  - [x] Generated PNG is 1200x630.
