// Wait before each auto-reconnect retry: quick at first, then once a minute
export const RECONNECT_DELAYS_MS = [2000, 5000, 10000, 20000, 30000, 60000];

export const reconnectDelay = (attempt: number) =>
  RECONNECT_DELAYS_MS[
    Math.min(Math.max(attempt, 0), RECONNECT_DELAYS_MS.length - 1)
  ];
