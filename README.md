# waku.guru

A static TypeScript webapp for exploring RAILGUN broadcaster relays that are
currently advertising over Waku.

The scanner follows the Waku relay discovery shape used in `../bindle`:

- starts a browser Waku light node only after the operator clicks Scan
- dials visible direct peers with `defaultBootstrap: false`
- keeps SDK DNS discovery disabled
- uses peer exchange/cache after connecting
- waits for Filter, LightPush, and Store peers
- reads current and recent `/railgun/v2/0-1-fees/json` advertisements
- parses broadcaster versions, fee tokens, expiry, reliability, relay adapters,
  POI list requirements, and available wallet counts

It does not create proofs, sign transactions, submit private operations, call a
bundler, contact Pimlico, or use a wallet.

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
- Vite base path: `/waku.guru/`

For a future custom domain, set `WAKU_GURU_BASE_PATH=/` during build and add a
`CNAME` only after DNS for `waku.guru` points at GitHub Pages.

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
