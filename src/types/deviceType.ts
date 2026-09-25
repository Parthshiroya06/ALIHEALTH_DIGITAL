import {MetricType} from './healthType';

export type ConnectionState =
  | 'disconnected'
  | 'scanning'
  | 'connecting'
  | 'connected';

export type DeviceFamily = 'hband' | 'e500' | 'generic_ble';

export interface IWearableDevice {
  id: string; // BLE id (MAC on Android, UUID on iOS)
  name: string | null;
  rssi?: number | null;
  family: DeviceFamily;
}
export type IDeviceCapabilities = MetricType[];

export interface IDeviceInfo {
  deviceNumber?: number;
  firmwareVersion?: string;
  watchDays?: number;
  batteryPercent?: number;
}
