export const DEFAULT_PUBSUB_TOPIC = "/waku/2/rs/5/1";

export const DEFAULT_DIRECT_PEERS = [
  "/dns4/relay-a.rootedinprivacy.com/tcp/8000/wss/p2p/16Uiu2HAmFbD2ZvAFi2j9jjDo6g4HFbQAhfjDfnTTrbyRGQRmtG7x",
  "/dns4/relay-b.rootedinprivacy.com/tcp/8000/wss/p2p/16Uiu2HAmPtEAoPPok7VLrpNNC6t92ZQFqLndHvkdx6Fk3CxA4MaG",
  "/dns4/client-edge.rootedinprivacy.com/tcp/8000/wss/p2p/16Uiu2HAmQdCGG5qREQCq96kucmpUVupmvLwrTRjMazPAaMTNP97A"
] as const;

export const DEFAULT_SCAN_TIMEOUT_MS = 45_000;
export const DEFAULT_HISTORY_LOOKBACK_MS = 300_000;
export const RAILGUN_MAINNET_CHAIN_ID = 1;
export const RAILGUN_MAINNET_WAKU_FEES_TOPIC = "/railgun/v2/0-1-fees/json";

export const TOKEN_CATALOG = [
  {
    symbol: "WETH",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
  },
  {
    symbol: "USDC",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
  },
  {
    symbol: "DAI",
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F"
  },
  {
    symbol: "USDT",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7"
  },
  {
    symbol: "WBTC",
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"
  }
] as const;

export const tokenSymbolForAddress = (tokenAddress: string): string => {
  const normalized = tokenAddress.toLowerCase();
  const token = TOKEN_CATALOG.find(
    (candidate) => candidate.address.toLowerCase() === normalized
  );

  return token?.symbol ?? `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`;
};
