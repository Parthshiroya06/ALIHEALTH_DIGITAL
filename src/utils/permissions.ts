import {PermissionsAndroid, Platform} from 'react-native';

/**
 * Android 12+ needs BLUETOOTH_SCAN + BLUETOOTH_CONNECT.
 * Android 11 and below need ACCESS_FINE_LOCATION for BLE scanning.
 * iOS shows the Bluetooth prompt itself (NSBluetoothAlwaysUsageDescription).
 */
export const requestBlePermissions = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return true;
  }
  if (Platform.Version >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);
    return Object.values(result).every(
      status => status === PermissionsAndroid.RESULTS.GRANTED,
    );
  }
  const status = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
  return status === PermissionsAndroid.RESULTS.GRANTED;
};
