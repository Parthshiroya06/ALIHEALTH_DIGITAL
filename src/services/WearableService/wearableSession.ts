import {WearableAdapter} from './WearableAdapter';

/**
 * The connected bracelet, shared by every screen (one connection per app).
 * useWearable sets it; measurement screens read it.
 */
let activeAdapter: WearableAdapter | null = null;
let cleanups: (() => void)[] = [];

export const getActiveAdapter = () => activeAdapter;

export const setActiveAdapter = (
  adapter: WearableAdapter | null,
  subscriptions: (() => void)[] = [],
) => {
  cleanups.forEach(cleanup => cleanup());
  activeAdapter = adapter;
  cleanups = subscriptions;
};
