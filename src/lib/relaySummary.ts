import { getAddress } from "viem";
import { tokenSymbolForAddress } from "./defaults";
import {
  describeFeeAdUsability,
  railgunBroadcasterFeeUsable,
  type RailgunBroadcasterFeeAd
} from "./wakuFeeAds";

export type RelayStatus = "usable" | "advertised" | "expired" | "incompatible";

export type RelayFeeQuote = {
  symbol: string;
  tokenAddress: `0x${string}`;
  feePerUnitGas: string;
};

export type RelaySummary = {
  id: string;
  railgunAddress: `0zk${string}`;
  identifier: string | null;
  status: RelayStatus;
  versions: string[];
  latestVersion: string | null;
  ads: RailgunBroadcasterFeeAd[];
  feeQuotes: RelayFeeQuote[];
  availableWallets: number;
  reliability: number;
  feeExpiration: number;
  relayAdapt: `0x${string}` | null;
  relayAdapt7702: `0x${string}` | null;
  requiredPoiListKeys: string[];
  lastReceivedAt: number | null;
  usabilityIssues: string[];
};

const mergeUnique = <Value>(values: Value[]): Value[] => Array.from(new Set(values));

const latestAdFirst = (
  left: RailgunBroadcasterFeeAd,
  right: RailgunBroadcasterFeeAd
): number => {
  const leftReceived = left.receivedAt ?? 0;
  const rightReceived = right.receivedAt ?? 0;

  if (leftReceived !== rightReceived) {
    return rightReceived - leftReceived;
  }

  return right.feeExpiration - left.feeExpiration;
};

const compareRelay = (left: RelaySummary, right: RelaySummary): number => {
  if (left.status !== right.status) {
    const order: RelayStatus[] = ["usable", "advertised", "expired", "incompatible"];
    return order.indexOf(left.status) - order.indexOf(right.status);
  }

  if (left.reliability !== right.reliability) {
    return right.reliability - left.reliability;
  }

  return (left.identifier ?? left.railgunAddress).localeCompare(
    right.identifier ?? right.railgunAddress
  );
};

export const summarizeRelays = (
  ads: RailgunBroadcasterFeeAd[],
  nowMs = Date.now()
): RelaySummary[] => {
  const groups = new Map<string, RailgunBroadcasterFeeAd[]>();

  for (const ad of ads) {
    const key = [ad.railgunAddress, ad.identifier ?? "default"].join(":");
    groups.set(key, [...(groups.get(key) ?? []), ad]);
  }

  return Array.from(groups.entries())
    .map(([id, group]) => {
      const sortedAds = group.slice().sort(latestAdFirst);
      const latestAd = sortedAds[0];
      const feeQuotesByAddress = new Map<string, RelayFeeQuote>();

      for (const ad of sortedAds) {
        for (const [tokenAddress, feePerUnitGas] of Object.entries(ad.fees)) {
          const normalizedToken = getAddress(tokenAddress) as `0x${string}`;

          if (!feeQuotesByAddress.has(normalizedToken)) {
            feeQuotesByAddress.set(normalizedToken, {
              symbol: tokenSymbolForAddress(normalizedToken),
              tokenAddress: normalizedToken,
              feePerUnitGas
            });
          }
        }
      }

      const usabilityIssues = mergeUnique(
        sortedAds.flatMap((ad) => describeFeeAdUsability(ad, nowMs))
      );
      const usable = sortedAds.some((ad) => railgunBroadcasterFeeUsable(ad, nowMs));
      const anyUnexpired = sortedAds.some((ad) => ad.feeExpiration > nowMs);
      const incompatible = sortedAds.every((ad) =>
        describeFeeAdUsability(ad, nowMs).some((reason) =>
          reason.startsWith("version outside")
        )
      );
      const status: RelayStatus = usable
        ? "usable"
        : incompatible
          ? "incompatible"
          : anyUnexpired
            ? "advertised"
            : "expired";

      return {
        id,
        railgunAddress: latestAd.railgunAddress,
        identifier: latestAd.identifier ?? null,
        status,
        versions: mergeUnique(sortedAds.map((ad) => ad.version)).sort(),
        latestVersion: latestAd.version,
        ads: sortedAds,
        feeQuotes: Array.from(feeQuotesByAddress.values()).sort((left, right) =>
          left.symbol.localeCompare(right.symbol)
        ),
        availableWallets: Math.max(...sortedAds.map((ad) => ad.availableWallets)),
        reliability: Math.max(...sortedAds.map((ad) => ad.reliability)),
        feeExpiration: Math.max(...sortedAds.map((ad) => ad.feeExpiration)),
        relayAdapt: latestAd.relayAdapt ?? null,
        relayAdapt7702: latestAd.relayAdapt7702 ?? null,
        requiredPoiListKeys: mergeUnique(
          sortedAds.flatMap((ad) => ad.requiredPOIListKeys)
        ).sort(),
        lastReceivedAt:
          Math.max(...sortedAds.map((ad) => ad.receivedAt ?? 0)) || null,
        usabilityIssues
      } satisfies RelaySummary;
    })
    .sort(compareRelay);
};
