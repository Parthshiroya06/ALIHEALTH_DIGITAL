import {useCallback, useEffect, useRef} from 'react';
import {AppState} from 'react-native';
import {useDispatch, useSelector, useStore} from 'react-redux';
import {storeReconnectAttempt} from '@actions';
import {addDebugLog, bleManager} from '@services';
import {IRootReduxState} from '@types';
import {hasBlePermissions, isAutoReconnectOn, reconnectDelay} from '@utils';
import {useWearable} from './useWearable';

/**
 * Keeps the paired bracelet connected: reconnects (and re-syncs its history)
 * when it drops, when the app opens or comes back to the foreground, and when
 * Bluetooth is turned back on. Stops after the user taps Disconnect.
 * Mounted once (BottomTabNavigator). Silent: never asks for permissions or shows alerts.
 */
export const useAutoReconnect = () => {
  const store = useStore<IRootReduxState>();
  const dispatch = useDispatch();
  const {connect} = useWearable();
  const details = useSelector((state: IRootReduxState) => state.deviceDetails);
  const {pairedDevice, connectionState} = details;
  const enabled = isAutoReconnectOn(details);
  const attempt = useRef(0);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tryReconnect = useRef<() => Promise<void>>(async () => {});

  const shouldReconnect = useCallback(() => {
    const current = store.getState().deviceDetails;
    return (
      isAutoReconnectOn(current) &&
      current.pairedDevice != null &&
      current.connectionState === 'disconnected'
    );
  }, [store]);

  const setAttempt = useCallback(
    (value: number) => {
      attempt.current = value;
      if (store.getState().deviceDetails.reconnectAttempt !== value) {
        dispatch(storeReconnectAttempt(value));
      }
    },
    [dispatch, store],
  );

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const schedule = useCallback(() => {
    cancel();
    timer.current = setTimeout(
      () => tryReconnect.current(),
      reconnectDelay(attempt.current),
    );
  }, [cancel]);

  useEffect(() => {
    tryReconnect.current = async () => {
      if (busy.current || !shouldReconnect()) {
        return;
      }
      if (!(await hasBlePermissions())) {
        // Only the user can grant it (Bracelet tab); retry when the app comes back
        addDebugLog('auto-reconnect: no Bluetooth permission');
        return;
      }
      if ((await bleManager.state()) !== 'PoweredOn') {
        // The Bluetooth state listener below retries when it is turned on
        addDebugLog('auto-reconnect: Bluetooth is off, waiting');
        return;
      }
      const device = store.getState().deviceDetails.pairedDevice;
      if (!device) {
        return;
      }
      busy.current = true;
      setAttempt(attempt.current + 1);
      addDebugLog(`auto-reconnect: attempt ${attempt.current}`);
      try {
        await connect(device);
        setAttempt(0);
      } catch (error: any) {
        addDebugLog(`auto-reconnect failed: ${error?.message}`);
        if (shouldReconnect()) {
          schedule();
        }
      } finally {
        busy.current = false;
      }
    };
  }, [connect, schedule, setAttempt, shouldReconnect, store]);

  // The bracelet dropped (or the app just opened): try again after a short wait
  useEffect(() => {
    if (enabled && pairedDevice && connectionState === 'disconnected') {
      schedule();
    } else if (connectionState !== 'connecting') {
      // Connected, switched off or Disconnect tapped: stop and reset the counter
      cancel();
      setAttempt(0);
    }
  }, [cancel, connectionState, enabled, pairedDevice, schedule, setAttempt]);

  // Back to the foreground, or Bluetooth turned on: try right away
  useEffect(() => {
    const appState = AppState.addEventListener('change', state => {
      if (state === 'active') {
        attempt.current = 0;
        tryReconnect.current();
      }
    });
    const bluetooth = bleManager.onStateChange(state => {
      if (state === 'PoweredOn') {
        attempt.current = 0;
        tryReconnect.current();
      }
    }, false);
    return () => {
      appState.remove();
      bluetooth.remove();
      cancel();
    };
  }, [cancel]);
};
