import {useCallback, useEffect, useRef} from 'react';
import {AppState} from 'react-native';
import {useSelector, useStore} from 'react-redux';
import {addDebugLog, bleManager} from '@services';
import {IRootReduxState} from '@types';
import {hasBlePermissions, reconnectDelay} from '@utils';
import {useWearable} from './useWearable';

/**
 * Keeps the paired bracelet connected: reconnects (and re-syncs its history)
 * when it drops, when the app opens or comes back to the foreground, and when
 * Bluetooth is turned back on. Stops after the user taps Disconnect.
 * Mounted once (BottomTabNavigator). Silent: never asks for permissions or shows alerts.
 */
export const useAutoReconnect = () => {
  const store = useStore<IRootReduxState>();
  const {connect} = useWearable();
  const {pairedDevice, connectionState, autoReconnect} = useSelector(
    (state: IRootReduxState) => state.deviceDetails,
  );
  const attempt = useRef(0);
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tryReconnect = useRef<() => Promise<void>>(async () => {});

  const shouldReconnect = useCallback(() => {
    const details = store.getState().deviceDetails;
    return (
      details.autoReconnect &&
      details.pairedDevice != null &&
      details.connectionState === 'disconnected'
    );
  }, [store]);

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
      attempt.current += 1;
      addDebugLog(`auto-reconnect: attempt ${attempt.current}`);
      try {
        await connect(device);
        attempt.current = 0;
      } catch (error: any) {
        addDebugLog(`auto-reconnect failed: ${error?.message}`);
        if (shouldReconnect()) {
          schedule();
        }
      } finally {
        busy.current = false;
      }
    };
  }, [connect, schedule, shouldReconnect, store]);

  // The bracelet dropped (or the app just opened): try again after a short wait
  useEffect(() => {
    if (autoReconnect && pairedDevice && connectionState === 'disconnected') {
      schedule();
    } else {
      cancel();
      if (connectionState === 'connected') {
        attempt.current = 0;
      }
    }
  }, [autoReconnect, cancel, connectionState, pairedDevice, schedule]);

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
