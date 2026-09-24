import {useCallback, useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {
  addReadings,
  storeCapabilities,
  storeConnectionState,
  storePairedDevice,
} from '@actions';
import {getAdapter, WearableAdapter} from '@services';
import {IRootReduxState, IWearableDevice} from '@types';

/**
 * Connects to a bracelet through the matching WearableAdapter,
 * stores capabilities and pushes live readings into Redux.
 */
export const useWearable = () => {
  const dispatch = useDispatch();
  const {pairedDevice, connectionState, capabilities} = useSelector(
    (state: IRootReduxState) => state.deviceDetails,
  );
  const adapterRef = useRef<WearableAdapter | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const disconnect = useCallback(async () => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    await adapterRef.current?.disconnect();
    adapterRef.current = null;
    dispatch(storeConnectionState('disconnected'));
  }, [dispatch]);

  const connect = useCallback(
    async (device: IWearableDevice) => {
      await disconnect();
      dispatch(storeConnectionState('connecting'));
      try {
        const adapter = getAdapter(device.family);
        await adapter.connect(device.id);
        adapterRef.current = adapter;

        dispatch(storePairedDevice(device));
        dispatch(storeCapabilities(await adapter.getCapabilities()));
        dispatch(storeConnectionState('connected'));

        unsubscribeRef.current = adapter.subscribeRealtime(readings =>
          dispatch(addReadings(readings)),
        );
        const history = await adapter.syncHistory();
        if (history.length) {
          dispatch(addReadings(history));
        }
      } catch (error) {
        dispatch(storeConnectionState('disconnected'));
        throw error;
      }
    },
    [disconnect, dispatch],
  );

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
    };
  }, []);

  return {pairedDevice, connectionState, capabilities, connect, disconnect};
};
