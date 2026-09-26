import {useCallback, useState} from 'react';
import {useDispatch, useSelector, useStore} from 'react-redux';
import {
  addReadings,
  storeCapabilities,
  storeConnectionState,
  storeDeviceInfo,
  storeHistorySyncedAt,
  storeLatestReadings,
  storePairedDevice,
} from '@actions';
import {
  addDebugLog,
  getActiveAdapter,
  getAdapter,
  setActiveAdapter,
  WearableAdapter,
} from '@services';
import {IRootReduxState, IWearableDevice} from '@types';

/**
 * Connects to a bracelet through the matching WearableAdapter, stores its
 * capabilities, pushes live readings into Redux and imports its history.
 * The connection lives in wearableSession, so every screen shares it.
 */
export const useWearable = () => {
  const dispatch = useDispatch();
  const store = useStore<IRootReduxState>();
  const {pairedDevice, connectionState, capabilities, deviceInfo} = useSelector(
    (state: IRootReduxState) => state.deviceDetails,
  );
  const [isSyncingHistory, setIsSyncingHistory] = useState(false);

  // Keeps the band's raw responses for the device check report
  const storeRawResponses = useCallback(
    (adapter: WearableAdapter) => {
      const rawResponses = adapter.getRawResponses?.();
      if (rawResponses) {
        const {deviceInfo: current} = store.getState().deviceDetails;
        dispatch(storeDeviceInfo({...current, rawResponses}));
      }
    },
    [dispatch, store],
  );

  const importHistory = useCallback(
    async (adapter: WearableAdapter) => {
      setIsSyncingHistory(true);
      try {
        const {historySyncedAt} = store.getState().deviceDetails;
        const history = await adapter.syncHistory(historySyncedAt);
        if (history.length) {
          dispatch(addReadings(history));
          const newest = history.reduce(
            (max, reading) =>
              reading.timestamp > max ? reading.timestamp : max,
            history[0].timestamp,
          );
          dispatch(storeHistorySyncedAt(newest));
        }
        const snapshot = (await adapter.readSnapshot?.()) ?? [];
        if (snapshot.length) {
          dispatch(storeLatestReadings(snapshot));
        }
      } finally {
        storeRawResponses(adapter);
        setIsSyncingHistory(false);
      }
    },
    [dispatch, store, storeRawResponses],
  );

  // Never throws: the band may already be gone (out of range, switched off)
  const disconnect = useCallback(async () => {
    const adapter = getActiveAdapter();
    setActiveAdapter(null);
    try {
      await adapter?.disconnect();
    } catch (error: any) {
      addDebugLog(`disconnect: ${error?.message}`);
    } finally {
      dispatch(storeConnectionState('disconnected'));
    }
  }, [dispatch]);

  const connect = useCallback(
    async (device: IWearableDevice) => {
      await disconnect();
      dispatch(storeConnectionState('connecting'));
      const adapter = getAdapter(device.family);
      try {
        await adapter.connect(device.id);
        dispatch(storePairedDevice(device));
        dispatch(storeCapabilities(await adapter.getCapabilities()));
        dispatch(storeDeviceInfo((await adapter.getDeviceInfo?.()) ?? {}));
        storeRawResponses(adapter);
        setActiveAdapter(adapter, [
          adapter.subscribeRealtime(readings =>
            dispatch(addReadings(readings)),
          ),
          adapter.subscribeConnection?.(state =>
            dispatch(storeConnectionState(state)),
          ) ?? (() => {}),
        ]);
        dispatch(storeConnectionState('connected'));
      } catch (error) {
        setActiveAdapter(null);
        await adapter.disconnect().catch(() => undefined);
        dispatch(storeConnectionState('disconnected'));
        throw error;
      }
      // A failed history read should not drop the connection
      try {
        await importHistory(adapter);
      } catch (error: any) {
        addDebugLog(`history sync failed: ${error?.message}`);
      }
    },
    [disconnect, dispatch, importHistory, storeRawResponses],
  );

  /** Re-reads the bracelet's stored history (steps, sleep, HR, ...). */
  const syncDeviceHistory = useCallback(async () => {
    const adapter = getActiveAdapter();
    if (adapter) {
      await importHistory(adapter);
    }
  }, [importHistory]);

  return {
    pairedDevice,
    connectionState,
    capabilities,
    deviceInfo,
    isSyncingHistory,
    connect,
    disconnect,
    syncDeviceHistory,
  };
};
