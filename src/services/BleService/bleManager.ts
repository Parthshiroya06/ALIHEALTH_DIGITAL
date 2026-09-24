import {BleManager, Device, State} from 'react-native-ble-plx';
import {BleConfig} from '@constants';
import {requestBlePermissions} from '@utils';

// One BleManager for the whole app (react-native-ble-plx requirement)
export const bleManager = new BleManager();

const waitForPoweredOn = () =>
  new Promise<void>((resolve, reject) => {
    const subscription = bleManager.onStateChange(state => {
      if (state === State.PoweredOn) {
        subscription.remove();
        resolve();
      } else if (state === State.Unauthorized || state === State.Unsupported) {
        subscription.remove();
        reject(new Error('Bluetooth is ' + state));
      }
    }, true);
  });

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
  await waitForPoweredOn();

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
