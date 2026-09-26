// Wait before each auto-reconnect retry: quick at first, then once a minute
export const RECONNECT_DELAYS_MS = [2000, 5000, 10000, 20000, 30000, 60000];

export const reconnectDelay = (attempt: number) =>
  RECONNECT_DELAYS_MS[
    Math.min(Math.max(attempt, 0), RECONNECT_DELAYS_MS.length - 1)
  ];

/** Stores saved before v1.5 have no switch value: treat it as on. */
export const isAutoReconnectOn = (details: {
  autoReconnect: boolean;
  autoReconnectEnabled?: boolean;
}) => details.autoReconnectEnabled !== false && details.autoReconnect;

/** Which status to show: "Reconnecting…" (+ attempt) while auto-reconnect is active. */
export const connectionStatus = (details: {
  connectionState: string;
  pairedDevice: unknown;
  autoReconnect: boolean;
  autoReconnectEnabled?: boolean;
  reconnectAttempt?: number;
}): {key: string; attempt: number} => {
  const reconnecting =
    details.connectionState !== 'connected' &&
    details.pairedDevice != null &&
    isAutoReconnectOn(details);
  return reconnecting
    ? {key: 'reconnecting', attempt: details.reconnectAttempt ?? 0}
    : {key: details.connectionState, attempt: 0};
};
