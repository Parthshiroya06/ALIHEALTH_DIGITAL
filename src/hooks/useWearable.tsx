import {useCallback, useState} from 'react';
import {useDispatch, useSelector, useStore} from 'react-redux';
import {
  addReadings,
  storeAutoReconnect,
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
import {
  IDeviceInfo,
  IHistorySyncResult,
  IRootReduxState,
  IWearableDevice,
} from '@types';

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

  const updateDeviceInfo = useCallback(
    (patch: Partial<IDeviceInfo>) => {
      const {deviceInfo: current} = store.getState().deviceDetails;
      dispatch(storeDeviceInfo({...current, ...patch}));
    },
    [dispatch, store],
  );

  // Keeps the band's raw responses for the device check report
  const storeRawResponses = useCallback(
    (adapter: WearableAdapter) => {
      const rawResponses = adapter.getRawResponses?.();
      if (rawResponses) {
        updateDeviceInfo({rawResponses});
      }
    },
    [updateDeviceInfo],
  );

  const importHistory = useCallback(
    async (adapter: WearableAdapter) => {
      setIsSyncingHistory(true);
      const startedAt = new Date().toISOString();
      let result: IHistorySyncResult = {startedAt};
      updateDeviceInfo({lastHistorySync: result});
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
        result = {
          startedAt,
          finishedAt: new Date().toISOString(),
          readings: history.length,
        };
      } catch (error: any) {
        result = {
          startedAt,
          finishedAt: new Date().toISOString(),
          error: error?.message ?? 'Unknown error',
        };
        throw error;
      } finally {
        // Today's totals are read even when the history failed
        try {
          const snapshot = (await adapter.readSnapshot?.()) ?? [];
          if (snapshot.length) {
            dispatch(storeLatestReadings(snapshot));
          }
        } catch (error: any) {
          addDebugLog(`snapshot failed: ${error?.message}`);
        }
        storeRawResponses(adapter);
        updateDeviceInfo({lastHistorySync: result});
        setIsSyncingHistory(false);
      }
    },
    [dispatch, store, storeRawResponses, updateDeviceInfo],
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
        dispatch(storeAutoReconnect(true));
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

  /** The user tapped Disconnect: stop auto-reconnect until they connect again. */
  const disconnectByUser = useCallback(async () => {
    dispatch(storeAutoReconnect(false));
    await disconnect();
  }, [disconnect, dispatch]);

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
    disconnectByUser,
    syncDeviceHistory,
  };
};
