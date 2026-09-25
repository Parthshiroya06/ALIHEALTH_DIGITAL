import {Linking, Platform} from 'react-native';
import {BleManager, Device, State} from 'react-native-ble-plx';
import {BleConfig} from '@constants';
import {localize} from '@languages';
import {requestBlePermissions} from '@utils';

// One BleManager for the whole app (react-native-ble-plx requirement)
export const bleManager = new BleManager();

const waitForPoweredOn = (timeoutMs: number) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      subscription.remove();
      reject(new Error(localize('bluetooth_off')));
    }, timeoutMs);
    const subscription = bleManager.onStateChange(state => {
      if (state === State.PoweredOn) {
        clearTimeout(timer);
        subscription.remove();
        resolve();
      } else if (state === State.Unauthorized || state === State.Unsupported) {
        clearTimeout(timer);
        subscription.remove();
        reject(new Error('Bluetooth is ' + state));
      }
    }, true);
  });

/**
 * Makes sure Bluetooth is on. Android 12+ does not let apps switch it on
 * silently, so this shows the system "Turn on Bluetooth?" popup instead.
 * iOS cannot turn it on: the user gets a message to enable it.
 */
export const ensureBluetoothOn = async () => {
  const state = await bleManager.state();
  if (state === State.PoweredOn) {
    return;
  }
  if (state === State.PoweredOff && Platform.OS === 'android') {
    await Linking.sendIntent(
      'android.bluetooth.adapter.action.REQUEST_ENABLE',
    ).catch(() => undefined);
  }
  await waitForPoweredOn(BleConfig.BLUETOOTH_ON_TIMEOUT_MS);
};

/**
 * Scans for nearby BLE devices. Calls onDeviceFound for each unique device.
 * Returns a stop function. Scan stops automatically after SCAN_TIMEOUT_MS.
 */
export const startScan = async (
  onDeviceFound: (device: Device) => void,
  onError?: (error: Error) => void,
) => {
  const granted = await requestBlePermissions();
  if (!granted) {
    throw new Error('Bluetooth permission denied');
  }
  await ensureBluetoothOn();

  const seen = new Set<string>();
  bleManager.startDeviceScan(
    null,
    {allowDuplicates: false},
    (error, device) => {
      if (error) {
        onError?.(error);
        return;
      }
      if (device && !seen.has(device.id)) {
        seen.add(device.id);
        onDeviceFound(device);
      }
    },
  );

  const timer = setTimeout(
    () => bleManager.stopDeviceScan(),
    BleConfig.SCAN_TIMEOUT_MS,
  );
  return () => {
    clearTimeout(timer);
    bleManager.stopDeviceScan();
  };
};

export const stopScan = () => bleManager.stopDeviceScan();

export const connectToDevice = async (deviceId: string) => {
  const device = await bleManager.connectToDevice(deviceId, {
    autoConnect: false,
  });
  await device.discoverAllServicesAndCharacteristics();
  return device;
};

export const disconnectDevice = (deviceId: string) =>
  bleManager.cancelDeviceConnection(deviceId);
