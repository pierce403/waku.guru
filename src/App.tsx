import {
  AlertTriangle,
  BadgeCheck,
  Clock,
  Copy,
  Layers,
  Play,
  RadioTower,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Square,
  Wifi
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_DIRECT_PEERS,
  DEFAULT_HISTORY_LOOKBACK_MS,
  DEFAULT_PUBSUB_TOPIC,
  DEFAULT_SCAN_TIMEOUT_MS
} from "./lib/defaults";
import {
  formatDuration,
  formatExpiration,
  formatFee,
  formatTimeDelta,
  shortMiddle
} from "./lib/format";
import { type RelayStatus, type RelaySummary } from "./lib/relaySummary";
import {
  blankScanResult,
  scanWakuRelays,
  type WakuPeerSnapshot,
  type WakuRelayScanResult
} from "./lib/wakuScan";

type SourceFilter = "all" | RelayStatus;

const parsePeers = (value: string): string[] =>
  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const statusLabel = (status: RelayStatus): string => {
  switch (status) {
    case "usable":
      return "usable";
    case "advertised":
      return "advertised";
    case "expired":
      return "expired";
    case "incompatible":
      return "incompatible";
  }
};

const statusIcon = (status: RelayStatus) => {
  if (status === "usable") {
    return <BadgeCheck size={16} aria-hidden="true" />;
  }

  if (status === "expired") {
    return <Clock size={16} aria-hidden="true" />;
  }

  return <AlertTriangle size={16} aria-hidden="true" />;
};

const copyText = (value: string): void => {
  void navigator.clipboard?.writeText(value);
};

function App() {
  const [topic, setTopic] = useState(DEFAULT_PUBSUB_TOPIC);
  const [peersText, setPeersText] = useState(DEFAULT_DIRECT_PEERS.join("\n"));
  const [timeoutMs, setTimeoutMs] = useState(DEFAULT_SCAN_TIMEOUT_MS);
  const [lookbackMs, setLookbackMs] = useState(DEFAULT_HISTORY_LOOKBACK_MS);
  const [result, setResult] = useState<WakuRelayScanResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [query, setQuery] = useState("");
  const [tokenFilter, setTokenFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [selectedRelayId, setSelectedRelayId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const directPeers = useMemo(() => parsePeers(peersText), [peersText]);
  const currentResult = result ?? blankScanResult({ directPeers, pubsubTopic: topic });

  const tokenOptions = useMemo(() => {
    const symbols = new Set<string>();

    for (const relay of currentResult.relays) {
      for (const quote of relay.feeQuotes) {
        symbols.add(quote.symbol);
      }
    }

    return Array.from(symbols).sort();
  }, [currentResult.relays]);

  const filteredRelays = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return currentResult.relays.filter((relay) => {
      const matchesStatus =
        sourceFilter === "all" || relay.status === sourceFilter;
      const matchesToken =
        tokenFilter === "all" ||
        relay.feeQuotes.some((quote) => quote.symbol === tokenFilter);
      const searchable = [
        relay.railgunAddress,
        relay.identifier ?? "",
        relay.latestVersion ?? "",
        relay.feeQuotes.map((quote) => quote.symbol).join(" ")
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);

      return matchesStatus && matchesToken && matchesQuery;
    });
  }, [currentResult.relays, query, sourceFilter, tokenFilter]);

  const selectedRelay = useMemo(() => {
    return (
      filteredRelays.find((relay) => relay.id === selectedRelayId) ??
      filteredRelays[0] ??
      null
    );
  }, [filteredRelays, selectedRelayId]);

  const summary = useMemo(() => {
    const usable = currentResult.relays.filter(
      (relay) => relay.status === "usable"
    ).length;
    const versions = new Set(
      currentResult.relays.flatMap((relay) => relay.versions)
    );

    return {
      usable,
      versions: versions.size,
      peers: currentResult.connectedPeers.length,
      parsed: currentResult.rawFeeAdsParsed
    };
  }, [currentResult]);

  useEffect(() => {
    if (!selectedRelay && filteredRelays[0]) {
      setSelectedRelayId(filteredRelays[0].id);
    }
  }, [filteredRelays, selectedRelay]);

  const appendLog = (message: string): void => {
    setLogs((entries) =>
      [`${new Date().toLocaleTimeString()} ${message}`, ...entries].slice(0, 12)
    );
  };

  const startScan = async (): Promise<void> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setScanning(true);
    setLogs([]);
    appendLog("Scan requested.");

    const finalResult = await scanWakuRelays(
      {
        pubsubTopic: topic,
        directPeers,
        timeoutMs,
        historyLookbackMs: lookbackMs,
        signal: controller.signal
      },
      {
        onLog: appendLog,
        onProgress: setResult
      }
    );

    setResult(finalResult);
    setSelectedRelayId(finalResult.relays[0]?.id ?? null);
    setScanning(false);
    abortRef.current = null;
  };

  const stopScan = (): void => {
    abortRef.current?.abort();
    appendLog("Stop requested.");
  };

  const resetInputs = (): void => {
    abortRef.current?.abort();
    setTopic(DEFAULT_PUBSUB_TOPIC);
    setPeersText(DEFAULT_DIRECT_PEERS.join("\n"));
    setTimeoutMs(DEFAULT_SCAN_TIMEOUT_MS);
    setLookbackMs(DEFAULT_HISTORY_LOOKBACK_MS);
    setResult(null);
    setLogs([]);
    setQuery("");
    setTokenFilter("all");
    setSourceFilter("all");
    setSelectedRelayId(null);
    setScanning(false);
  };

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <RadioTower size={24} />
          </span>
          <div>
            <h1>waku.guru</h1>
            <p>RAILGUN broadcaster relay explorer</p>
          </div>
        </div>
        <div className="run-state" data-active={scanning}>
          <span className="pulse" aria-hidden="true" />
          {scanning ? "scanning" : result ? "scan complete" : "idle"}
        </div>
      </header>

      <section className="control-band" aria-label="Scan controls">
        <label className="field topic-field">
          <span>Pubsub topic</span>
          <input value={topic} onChange={(event) => setTopic(event.target.value)} />
        </label>
        <label className="field numeric-field">
          <span>Timeout</span>
          <input
            type="number"
            min={5000}
            step={5000}
            value={timeoutMs}
            onChange={(event) => setTimeoutMs(Number(event.target.value))}
          />
        </label>
        <label className="field numeric-field">
          <span>History</span>
          <input
            type="number"
            min={0}
            step={60000}
            value={lookbackMs}
            onChange={(event) => setLookbackMs(Number(event.target.value))}
          />
        </label>
        <div className="scan-actions">
          {scanning ? (
            <button className="primary danger" type="button" onClick={stopScan}>
              <Square size={18} aria-hidden="true" />
              Stop
            </button>
          ) : (
            <button className="primary" type="button" onClick={() => void startScan()}>
              <Play size={18} aria-hidden="true" />
              Scan
            </button>
          )}
          <button className="icon-action" type="button" onClick={resetInputs} title="Reset">
            <RotateCcw size={18} aria-hidden="true" />
          </button>
        </div>
        <label className="field peers-field">
          <span>Direct peers</span>
          <textarea
            rows={3}
            value={peersText}
            onChange={(event) => setPeersText(event.target.value)}
          />
        </label>
      </section>

      <section className="metric-grid" aria-label="Scan summary">
        <Metric icon={<Wifi size={19} />} label="Waku peers" value={summary.peers} />
        <Metric icon={<Layers size={19} />} label="Fee ads" value={summary.parsed} />
        <Metric
          icon={<BadgeCheck size={19} />}
          label="Usable relays"
          value={summary.usable}
        />
        <Metric icon={<Clock size={19} />} label="Versions" value={summary.versions} />
      </section>

      <section className="workspace">
        <div className="left-stack">
          <section className="panel map-panel" aria-label="Waku relay map">
            <PanelTitle icon={<RadioTower size={18} />} title="Topology" />
            <RelayMap
              result={currentResult}
              relays={filteredRelays}
              selectedRelayId={selectedRelay?.id ?? null}
              onSelect={setSelectedRelayId}
            />
          </section>

          <section className="panel" aria-label="Waku peers">
            <PanelTitle icon={<Wifi size={18} />} title="Peers" />
            <PeerList peers={currentResult.connectedPeers} />
          </section>
        </div>

        <section className="panel relay-browser" aria-label="Relay browser">
          <div className="browser-head">
            <PanelTitle icon={<SlidersHorizontal size={18} />} title="Relays" />
            <span className="muted">
              {filteredRelays.length} of {currentResult.relays.length}
            </span>
          </div>
          <div className="filters">
            <label className="search-field">
              <Search size={16} aria-hidden="true" />
              <input
                value={query}
                placeholder="Search address, version, token"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <select
              value={sourceFilter}
              onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
            >
              <option value="all">all statuses</option>
              <option value="usable">usable</option>
              <option value="advertised">advertised</option>
              <option value="expired">expired</option>
              <option value="incompatible">incompatible</option>
            </select>
            <select
              value={tokenFilter}
              onChange={(event) => setTokenFilter(event.target.value)}
            >
              <option value="all">all tokens</option>
              {tokenOptions.map((symbol) => (
                <option key={symbol} value={symbol}>
                  {symbol}
                </option>
              ))}
            </select>
          </div>
          <div className="relay-layout">
            <RelayList
              relays={filteredRelays}
              selectedRelayId={selectedRelay?.id ?? null}
              onSelect={setSelectedRelayId}
            />
            <RelayDetails relay={selectedRelay} />
          </div>
        </section>

        <section className="panel log-panel" aria-label="Scan log">
          <PanelTitle icon={<Clock size={18} />} title="Log" />
          <StatusBlock result={currentResult} />
          <div className="log-list">
            {logs.length > 0 ? (
              logs.map((entry) => <span key={entry}>{entry}</span>)
            ) : (
              <span className="muted">No scan events yet.</span>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function PanelTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="panel-title">
      {icon}
      <h2>{title}</h2>
    </div>
  );
}

function Metric({
  icon,
  label,
  value
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="metric">
      <span className="metric-icon" aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RelayMap({
  result,
  relays,
  selectedRelayId,
  onSelect
}: {
  result: WakuRelayScanResult;
  relays: RelaySummary[];
  selectedRelayId: string | null;
  onSelect: (id: string) => void;
}) {
  const visiblePeers = result.connectedPeers.slice(0, 6);
  const visibleRelays = relays.slice(0, 8);
  const peerStep = 420 / Math.max(visiblePeers.length - 1, 1);
  const relayStep = 420 / Math.max(visibleRelays.length - 1, 1);

  return (
    <svg className="relay-map" viewBox="0 0 520 300" role="img">
      <title>Waku peers and advertising relays</title>
      <line x1="260" y1="76" x2="260" y2="224" className="map-spine" />
      <circle cx="260" cy="150" r="34" className="map-core" />
      <text x="260" y="147" className="map-core-label">
        cluster {result.routing.clusterId}
      </text>
      <text x="260" y="164" className="map-core-sub">
        shard {result.routing.shardId}
      </text>

      {visiblePeers.map((peer, index) => {
        const x = 50 + index * peerStep;
        const y = 58 + (index % 2) * 18;

        return (
          <g key={peer.id}>
            <line x1="260" y1="128" x2={x} y2={y} className="map-link peer" />
            <circle cx={x} cy={y} r="12" className="map-peer" />
            <text x={x} y={y - 18} className="map-node-label">
              {shortMiddle(peer.id, 6, 4)}
            </text>
          </g>
        );
      })}

      {visibleRelays.map((relay, index) => {
        const x = 50 + index * relayStep;
        const y = 230 - (index % 2) * 18;
        const selected = relay.id === selectedRelayId;

        return (
          <g
            key={relay.id}
            className="map-relay-group"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(relay.id)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                onSelect(relay.id);
              }
            }}
          >
            <line x1="260" y1="172" x2={x} y2={y} className="map-link relay" />
            <circle
              cx={x}
              cy={y}
              r={selected ? 16 : 13}
              className={`map-relay ${relay.status}`}
            />
            <text x={x} y={y + 28} className="map-node-label">
              {relay.identifier ?? shortMiddle(relay.railgunAddress, 6, 4)}
            </text>
          </g>
        );
      })}

      {relays.length > visibleRelays.length ? (
        <text x="480" y="286" className="map-more">
          +{relays.length - visibleRelays.length}
        </text>
      ) : null}
    </svg>
  );
}

function PeerList({ peers }: { peers: WakuPeerSnapshot[] }) {
  if (peers.length === 0) {
    return <p className="empty">No connected peers yet.</p>;
  }

  return (
    <div className="peer-list">
      {peers.map((peer) => (
        <article key={peer.id} className="peer-row">
          <div>
            <strong>{shortMiddle(peer.id, 10, 8)}</strong>
            <span>{peer.agentVersion ?? peer.protocolVersion ?? "unknown agent"}</span>
          </div>
          <div className="protocol-pills">
            <span data-ready={peer.capabilities.filter}>Filter</span>
            <span data-ready={peer.capabilities.lightPush}>LightPush</span>
            <span data-ready={peer.capabilities.store}>Store</span>
          </div>
        </article>
      ))}
    </div>
  );
}

function RelayList({
  relays,
  selectedRelayId,
  onSelect
}: {
  relays: RelaySummary[];
  selectedRelayId: string | null;
  onSelect: (id: string) => void;
}) {
  if (relays.length === 0) {
    return <p className="empty">No relays match the current view.</p>;
  }

  return (
    <div className="relay-list">
      {relays.map((relay) => (
        <button
          key={relay.id}
          className="relay-card"
          data-selected={relay.id === selectedRelayId}
          type="button"
          onClick={() => onSelect(relay.id)}
        >
          <span className={`status-pill ${relay.status}`}>
            {statusIcon(relay.status)}
            {statusLabel(relay.status)}
          </span>
          <strong>{relay.identifier ?? shortMiddle(relay.railgunAddress, 11, 8)}</strong>
          <span className="relay-card-meta">
            v{relay.latestVersion ?? "unknown"} · {relay.feeQuotes.length} token
            {relay.feeQuotes.length === 1 ? "" : "s"}
          </span>
        </button>
      ))}
    </div>
  );
}

function RelayDetails({ relay }: { relay: RelaySummary | null }) {
  if (!relay) {
    return <p className="empty detail-empty">Select a relay candidate.</p>;
  }

  return (
    <div className="relay-detail">
      <div className="detail-head">
        <span className={`status-pill ${relay.status}`}>
          {statusIcon(relay.status)}
          {statusLabel(relay.status)}
        </span>
        <button
          className="icon-action"
          type="button"
          onClick={() => copyText(relay.railgunAddress)}
          title="Copy 0zk address"
        >
          <Copy size={16} aria-hidden="true" />
        </button>
      </div>
      <h3>{relay.identifier ?? "unnamed relay"}</h3>
      <code>{relay.railgunAddress}</code>

      <div className="detail-grid">
        <span>
          <strong>{relay.latestVersion ?? "unknown"}</strong>
          version
        </span>
        <span>
          <strong>{relay.availableWallets}</strong>
          wallets
        </span>
        <span>
          <strong>{relay.reliability}</strong>
          reliability
        </span>
        <span>
          <strong>{formatExpiration(relay.feeExpiration)}</strong>
          fee expiry
        </span>
      </div>

      <div className="quote-table" role="table" aria-label="Fee token quotes">
        <div className="quote-row header" role="row">
          <span role="columnheader">Token</span>
          <span role="columnheader">Per gas</span>
        </div>
        {relay.feeQuotes.map((quote) => (
          <div className="quote-row" role="row" key={quote.tokenAddress}>
            <span role="cell">{quote.symbol}</span>
            <span role="cell">{formatFee(quote.feePerUnitGas)}</span>
          </div>
        ))}
      </div>

      <dl className="capability-list">
        <div>
          <dt>Relay adapt</dt>
          <dd>{relay.relayAdapt ? shortMiddle(relay.relayAdapt, 10, 8) : "none"}</dd>
        </div>
        <div>
          <dt>7702 adapt</dt>
          <dd>
            {relay.relayAdapt7702
              ? shortMiddle(relay.relayAdapt7702, 10, 8)
              : "not advertised"}
          </dd>
        </div>
        <div>
          <dt>POI keys</dt>
          <dd>{relay.requiredPoiListKeys.length}</dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd>{formatTimeDelta(relay.lastReceivedAt)}</dd>
        </div>
      </dl>

      {relay.usabilityIssues.length > 0 ? (
        <div className="issue-list">
          {relay.usabilityIssues.map((issue) => (
            <span key={issue}>{issue}</span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function StatusBlock({ result }: { result: WakuRelayScanResult }) {
  return (
    <div className="status-block">
      <span>
        <strong>{result.requiredProtocols.filter}</strong>
        Filter
      </span>
      <span>
        <strong>{result.requiredProtocols.lightPush}</strong>
        LightPush
      </span>
      <span>
        <strong>{result.requiredProtocols.store}</strong>
        Store
      </span>
      <span>
        <strong>{formatDuration(result.elapsedMs)}</strong>
        elapsed
      </span>
      {result.error ? <p>{result.error}</p> : null}
    </div>
  );
}

export default App;
