export const shortMiddle = (value: string, start = 8, end = 6): string => {
  if (value.length <= start + end + 3) {
    return value;
  }

  return `${value.slice(0, start)}...${value.slice(-end)}`;
};

export const formatDuration = (ms: number): string => {
  if (!Number.isFinite(ms) || ms < 0) {
    return "0s";
  }

  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  }

  if (ms < 60_000) {
    return `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)}s`;
  }

  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1000)}s`;
};

export const formatTimeDelta = (timestampMs: number | null): string => {
  if (!timestampMs) {
    return "unknown";
  }

  const delta = Date.now() - timestampMs;

  if (delta < 0) {
    return "now";
  }

  return `${formatDuration(delta)} ago`;
};

export const formatExpiration = (timestampMs: number): string => {
  const delta = timestampMs - Date.now();

  if (delta <= 0) {
    return "expired";
  }

  return `in ${formatDuration(delta)}`;
};

export const formatFee = (value: string): string => {
  try {
    return BigInt(value).toLocaleString("en-US");
  } catch {
    return value;
  }
};
