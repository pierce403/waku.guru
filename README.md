# waku.guru

A static TypeScript webapp for exploring Waku network services and
application-level relays that are currently advertising over Waku.

The scanner follows the Waku relay discovery shape used in `../bindle`:

- starts a browser Waku light node only after the operator clicks Scan
- dials visible direct peers with `defaultBootstrap: false`
- keeps SDK DNS discovery disabled
- uses peer exchange/cache after connecting
- waits for Filter, LightPush, and Store peers
- reads selected content topics through Filter and Store
- parses broadcaster versions, fee tokens, expiry, reliability, relay adapters,
  POI list requirements, and available wallet counts
- reports generic message counts for topics without a known parser

It does not create proofs, sign transactions, submit private operations, call a
bundler, contact Pimlico, or use a wallet.

## Live Site

GitHub Pages is live at:

```text
https://pierce403.github.io/waku.guru/
```

The custom domain is configured as:

```text
https://waku.guru/
```

The build uses relative asset paths so the fallback GitHub Pages URL also works.

## Development

```bash
pnpm install
pnpm dev
pnpm typecheck
pnpm build
pnpm preview
```

`pnpm build` writes the static site to `docs/`.

## GitHub Pages

This repo is designed for classic GitHub Pages branch publishing:

- branch: `main`
- folder: `/docs`
- Vite base path: `./`

The committed `docs/CNAME` configures the custom domain `waku.guru`.

## Waku Defaults

Default public RAILGUN broadcaster topic:

```text
/waku/2/rs/5/1
```

Default direct peers:

```text
/dns4/relay-a.rootedinprivacy.com/tcp/8000/wss/p2p/16Uiu2HAmFbD2ZvAFi2j9jjDo6g4HFbQAhfjDfnTTrbyRGQRmtG7x
/dns4/relay-b.rootedinprivacy.com/tcp/8000/wss/p2p/16Uiu2HAmPtEAoPPok7VLrpNNC6t92ZQFqLndHvkdx6Fk3CxA4MaG
/dns4/client-edge.rootedinprivacy.com/tcp/8000/wss/p2p/16Uiu2HAmQdCGG5qREQCq96kucmpUVupmvLwrTRjMazPAaMTNP97A
```

## Notes

The app intentionally reports raw Waku fee advertisements. It does not evaluate
Kohaku `JsBroadcasterManager` selection, because this explorer is only a
read-only relay map.

## Research Notes

- Waku exposes modular protocols: Relay/RLN Relay, Filter, Store, Light Push,
  and Waku Message metadata.
- The public Waku Network is open-access, privacy-preserving, sharded, and
  provides services for resource-restricted nodes.
- Node operators can enable or advertise services such as relay, store, filter,
  lightpush, peer exchange, websocket, REST, metrics, and request-rate limits.
- ERC-4337 standardizes UserOperations, bundlers, paymasters, EntryPoint, and an
  alternative mempool, but this repo has not found an official Waku topic schema
  for ERC-4337 relay discovery. Current ERC-4337 topics in the app are probes.
- Interesting future exploration targets include Graphcast, Status messaging,
  and Waku/TACo/Codex-style encrypted communication plus durable storage flows.

Sources:

- https://docs.waku.org/learn/
- https://docs.waku.org/learn/concepts/protocols/
- https://docs.waku.org/run-node/config-options
- https://docs.erc4337.io/bundlers/userop-mempool-overview.html
- https://docs.erc4337.io/resources/faqs.html
- https://blog.waku.org/waku-x-taco-p2p-comms-with-decentralised-encryption/
