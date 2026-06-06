import {
  createDecoder,
  createLightNode,
  Protocols,
  type CreateNodeOptions,
  type IDecodedMessage,
  type IRoutingInfo,
  type LightNode
} from "@waku/sdk";
import {
  DEFAULT_HISTORY_LOOKBACK_MS,
  DEFAULT_SCAN_TIMEOUT_MS,
  RAILGUN_MAINNET_CHAIN_ID,
  RAILGUN_MAINNET_WAKU_FEES_TOPIC
} from "./defaults";
import { summarizeRelays, type RelaySummary } from "./relaySummary";
import {
  parseRailgunWakuFeeMessage,
  type RailgunBroadcasterFeeAd,
  type RawRailgunWakuMessage
} from "./wakuFeeAds";

export type ProtocolReadiness = "ready" | "missing" | "error";

export type WakuPeerSnapshot = {
  id: string;
  addresses: string[];
  protocols: string[];
  agentVersion: string | null;
  protocolVersion: string | null;
  capabilities: {
    filter: boolean;
    lightPush: boolean;
    store: boolean;
    relay: boolean;
  };
};

export type ObservedTopicSample = {
  receivedAt: number | null;
  payloadBytes: number;
  utf8Preview: string | null;
  jsonPreview: unknown | null;
};

export type ObservedTopicSnapshot = {
  contentTopic: string;
  messagesObserved: number;
  lastSeenAt: number | null;
  samples: ObservedTopicSample[];
};

export type WakuRelayScanResult = {
  createdAt: string;
  elapsedMs: number;
  chainId: typeof RAILGUN_MAINNET_CHAIN_ID;
  pubsubTopic: string;
  routing: {
    clusterId: number;
    shardId: number;
  };
  localPeerId: string | null;
  configuredDirectPeers: string[];
  connectedPeers: WakuPeerSnapshot[];
  requiredProtocols: {
    filter: ProtocolReadiness;
    lightPush: ProtocolReadiness;
    store: ProtocolReadiness;
  };
  observedTopics: ObservedTopicSnapshot[];
  totalMessagesObserved: number;
  rawFeeMessagesObserved: number;
  rawFeeAdsParsed: number;
  rawFeeAdParseErrors: string[];
  relays: RelaySummary[];
  notes: string[];
  error: string | null;
};

export type WakuRelayScanOptions = {
  pubsubTopic: string;
  contentTopics?: string[];
  directPeers: string[];
  timeoutMs?: number;
  historyLookbackMs?: number;
  signal?: AbortSignal;
};

export type WakuRelayScanHooks = {
  onLog?: (message: string) => void;
  onProgress?: (result: WakuRelayScanResult) => void;
};

type PeerLike = Awaited<ReturnType<LightNode["getConnectedPeers"]>>[number];

const textDecoder = new TextDecoder();
const maxSamplesPerTopic = 3;

export const parseRailgunWakuPubSubTopic = (pubsubTopic: string): IRoutingInfo => {
  const match = /^\/waku\/2\/rs\/(\d+)\/(\d+)$/.exec(pubsubTopic.trim());

  if (!match) {
    throw new Error(
      `Invalid Waku pubsub topic "${pubsubTopic}". Expected /waku/2/rs/<cluster>/<shard>.`
    );
  }

  return {
    clusterId: Number(match[1]),
    shardId: Number(match[2]),
    pubsubTopic: pubsubTopic.trim()
  };
};

const createNodeOptions = ({
  directPeers,
  routingInfo
}: {
  directPeers: string[];
  routingInfo: IRoutingInfo;
}): CreateNodeOptions => ({
  defaultBootstrap: false,
  bootstrapPeers: directPeers,
  networkConfig: {
    clusterId: routingInfo.clusterId
  },
  discovery: {
    dns: false,
    peerExchange: true,
    peerCache: true
  },
  store: {
    peers: []
  },
  userAgent: "waku.guru"
});

const makeWakuMessage = (decoded: IDecodedMessage): RawRailgunWakuMessage => ({
  payload: Array.from(decoded.payload),
  contentTopic: decoded.contentTopic,
  timestamp: decoded.timestamp ? decoded.timestamp.getTime() : undefined
});

const bytesToUtf8Preview = (bytes: Uint8Array): string | null => {
  try {
    const text = textDecoder.decode(bytes);
    return text.length > 220 ? `${text.slice(0, 220)}...` : text;
  } catch {
    return null;
  }
};

const tryParseJson = (value: string | null): unknown | null => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const abortIfNeeded = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    throw new Error("Scan stopped.");
  }
};

const delay = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timeout = window.setTimeout(resolve, ms);

    signal?.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout);
        reject(new Error("Scan stopped."));
      },
      { once: true }
    );
  });

const decodeMetadataText = (
  metadata: PeerLike["metadata"],
  key: string
): string | null => {
  const bytes = metadata.get(key);

  if (!bytes) {
    return null;
  }

  try {
    return textDecoder.decode(bytes);
  } catch {
    return null;
  }
};

const hasProtocol = (protocols: string[], needle: string): boolean =>
  protocols.some((protocol) => protocol.toLowerCase().includes(needle));

const peerSnapshot = (peer: PeerLike): WakuPeerSnapshot => {
  const protocols = peer.protocols.slice().sort();

  return {
    id: peer.id.toString(),
    addresses: peer.addresses.map((address) => address.multiaddr.toString()),
    protocols,
    agentVersion: decodeMetadataText(peer.metadata, "AgentVersion"),
    protocolVersion: decodeMetadataText(peer.metadata, "ProtocolVersion"),
    capabilities: {
      filter: hasProtocol(protocols, "filter"),
      lightPush: hasProtocol(protocols, "lightpush") || hasProtocol(protocols, "light-push"),
      store: hasProtocol(protocols, "store"),
      relay: hasProtocol(protocols, "relay")
    }
  };
};

const protocolReadiness = (
  peers: WakuPeerSnapshot[],
  protocol: keyof WakuPeerSnapshot["capabilities"]
): ProtocolReadiness =>
  peers.some((peer) => peer.capabilities[protocol]) ? "ready" : "missing";

const stopNode = async (node: LightNode | null): Promise<void> => {
  if (!node?.stop) {
    return;
  }

  await Promise.race([
    node.stop(),
    delay(2_000).then(() => {
      throw new Error("Timed out while stopping Waku node.");
    })
  ]).catch(() => undefined);
};

export const blankScanResult = ({
  contentTopics = [RAILGUN_MAINNET_WAKU_FEES_TOPIC],
  directPeers,
  pubsubTopic
}: {
  contentTopics?: string[];
  directPeers: string[];
  pubsubTopic: string;
}): WakuRelayScanResult => {
  let routingInfo: IRoutingInfo;
  let error: string | null = null;

  try {
    routingInfo = parseRailgunWakuPubSubTopic(pubsubTopic);
  } catch (parseError) {
    routingInfo = {
      clusterId: 0,
      shardId: 0,
      pubsubTopic
    };
    error = parseError instanceof Error ? parseError.message : String(parseError);
  }

  return {
    createdAt: new Date().toISOString(),
    elapsedMs: 0,
    chainId: RAILGUN_MAINNET_CHAIN_ID,
    pubsubTopic: routingInfo.pubsubTopic,
    routing: {
      clusterId: routingInfo.clusterId,
      shardId: routingInfo.shardId
    },
    localPeerId: null,
    configuredDirectPeers: directPeers,
    connectedPeers: [],
    requiredProtocols: {
      filter: "missing",
      lightPush: "missing",
      store: "missing"
    },
    observedTopics: contentTopics.map((contentTopic) => ({
      contentTopic,
      messagesObserved: 0,
      lastSeenAt: null,
      samples: []
    })),
    totalMessagesObserved: 0,
    rawFeeMessagesObserved: 0,
    rawFeeAdsParsed: 0,
    rawFeeAdParseErrors: [],
    relays: [],
    notes: [
      "No transaction was created.",
      "No proof was generated.",
      "Waku DNS discovery is disabled; only the visible direct peers are dialed before peer exchange/cache."
    ],
    error
  };
};

export const scanWakuRelays = async (
  options: WakuRelayScanOptions,
  hooks: WakuRelayScanHooks = {}
): Promise<WakuRelayScanResult> => {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? DEFAULT_SCAN_TIMEOUT_MS;
  const historyLookbackMs =
    options.historyLookbackMs ?? DEFAULT_HISTORY_LOOKBACK_MS;
  const directPeers = options.directPeers.map((peer) => peer.trim()).filter(Boolean);
  const routingInfo = parseRailgunWakuPubSubTopic(options.pubsubTopic);
  const contentTopics = Array.from(
    new Set(
      (options.contentTopics?.length
        ? options.contentTopics
        : [RAILGUN_MAINNET_WAKU_FEES_TOPIC]
      )
        .map((topic) => topic.trim())
        .filter(Boolean)
    )
  );
  const deadline = startedAt + timeoutMs;
  const feeAds = new Map<string, RailgunBroadcasterFeeAd>();
  const observedTopicMap = new Map<string, ObservedTopicSnapshot>(
    contentTopics.map((contentTopic) => [
      contentTopic,
      {
        contentTopic,
        messagesObserved: 0,
        lastSeenAt: null,
        samples: []
      }
    ])
  );
  const parseErrors: string[] = [];
  let totalMessagesObserved = 0;
  let rawFeeMessagesObserved = 0;
  let node: LightNode | null = null;

  if (directPeers.length === 0) {
    throw new Error("At least one Waku direct peer is required.");
  }

  const emitLog = (message: string): void => hooks.onLog?.(message);

  const connectedPeers = async (): Promise<WakuPeerSnapshot[]> => {
    if (!node) {
      return [];
    }

    return (await node.getConnectedPeers()).map(peerSnapshot);
  };

  const buildResult = async (error: string | null = null): Promise<WakuRelayScanResult> => {
    const peers = await connectedPeers().catch(() => []);

    return {
      createdAt: new Date().toISOString(),
      elapsedMs: Date.now() - startedAt,
      chainId: RAILGUN_MAINNET_CHAIN_ID,
      pubsubTopic: routingInfo.pubsubTopic,
      routing: {
        clusterId: routingInfo.clusterId,
        shardId: routingInfo.shardId
      },
      localPeerId: node?.peerId?.toString() ?? null,
      configuredDirectPeers: directPeers,
      connectedPeers: peers,
      requiredProtocols: {
        filter: protocolReadiness(peers, "filter"),
        lightPush: protocolReadiness(peers, "lightPush"),
        store: protocolReadiness(peers, "store")
      },
      observedTopics: Array.from(observedTopicMap.values()),
      totalMessagesObserved,
      rawFeeMessagesObserved,
      rawFeeAdsParsed: feeAds.size,
      rawFeeAdParseErrors: parseErrors.slice(-20),
      relays: summarizeRelays(Array.from(feeAds.values())),
      notes: [
        "No transaction was created.",
        "No proof was generated.",
        "No public smart wallet, ERC-4337 bundler, paymaster, or Pimlico endpoint was contacted.",
        "Waku DNS discovery is disabled; only the visible direct peers are dialed before peer exchange/cache."
      ],
      error
    };
  };

  const emitProgress = async (): Promise<void> => {
    hooks.onProgress?.(await buildResult());
  };

  const observe = (decoded: IDecodedMessage): void => {
    const message = makeWakuMessage(decoded);
    const topicSnapshot = observedTopicMap.get(message.contentTopic);

    totalMessagesObserved += 1;

    if (topicSnapshot) {
      const payload =
        decoded.payload instanceof Uint8Array
          ? decoded.payload
          : Uint8Array.from(decoded.payload);
      const utf8Preview = bytesToUtf8Preview(payload);

      topicSnapshot.messagesObserved += 1;
      topicSnapshot.lastSeenAt = message.timestamp ?? Date.now();

      if (topicSnapshot.samples.length < maxSamplesPerTopic) {
        topicSnapshot.samples.push({
          receivedAt: message.timestamp ?? null,
          payloadBytes: payload.byteLength,
          utf8Preview,
          jsonPreview: tryParseJson(utf8Preview)
        });
      }
    }

    if (message.contentTopic !== RAILGUN_MAINNET_WAKU_FEES_TOPIC) {
      return;
    }

    const parsed = parseRailgunWakuFeeMessage(message);

    if (!parsed.ok) {
      if (!parsed.error.startsWith("wrong content topic")) {
        rawFeeMessagesObserved += 1;
        parseErrors.push(parsed.error);
      }
      return;
    }

    rawFeeMessagesObserved += 1;
    const key = [
      parsed.ad.railgunAddress,
      parsed.ad.feesID,
      parsed.ad.identifier ?? "default"
    ].join(":");
    feeAds.set(key, parsed.ad);
  };

  try {
    abortIfNeeded(options.signal);
    emitLog("Starting Waku light node.");
    node = await createLightNode(createNodeOptions({ directPeers, routingInfo }));

    if (!node.isStarted()) {
      await node.start();
    }

    abortIfNeeded(options.signal);
    emitLog("Waiting for Filter, LightPush, and Store peers.");
    await node.waitForPeers(
      [Protocols.Filter, Protocols.LightPush, Protocols.Store],
      Math.max(1, deadline - Date.now())
    );
    await emitProgress();

    const decoders = contentTopics.map((contentTopic) =>
      createDecoder(contentTopic, routingInfo)
    );

    emitLog(`Subscribing to ${contentTopics.length} content topic(s).`);
    await node.filter?.subscribe(decoders, observe);

    if (node.store && Date.now() < deadline) {
      emitLog("Querying Waku Store history.");
      const generator = node.store.queryGenerator(decoders, {
        includeData: true,
        pubsubTopic: routingInfo.pubsubTopic,
        contentTopics,
        paginationForward: true,
        timeStart: new Date(Date.now() - historyLookbackMs),
        timeEnd: new Date()
      });

      for await (const page of generator) {
        abortIfNeeded(options.signal);

        for (const promise of page) {
          const decoded = await promise;

          if (decoded) {
            observe(decoded);
          }
        }

        await emitProgress();

        if (Date.now() >= deadline) {
          break;
        }
      }
    }

    emitLog("Listening for current relay advertisements.");

    while (Date.now() < deadline) {
      abortIfNeeded(options.signal);
      await emitProgress();
      await delay(Math.min(1_500, Math.max(0, deadline - Date.now())), options.signal);
    }

    return await buildResult();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emitLog(message);
    return await buildResult(message);
  } finally {
    await stopNode(node);
  }
};
