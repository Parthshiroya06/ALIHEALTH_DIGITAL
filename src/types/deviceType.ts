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

export interface IGattCharacteristic {
  uuid: string;
  properties: string[]; // read, write, write_no_response, notify, indicate
  value?: string; // readable characteristics: hex bytes (+ text when printable)
}

export interface IGattService {
  uuid: string;
  characteristics: IGattCharacteristic[];
}

export interface IDeviceInfo {
  deviceNumber?: number;
  firmwareVersion?: string;
  watchDays?: number;
  batteryPercent?: number;
  /** Vendor SDK function flags, e.g. {spo2: 'SUPPORT_OPEN', ecgType: '1'} */
  sdkFeatures?: Record<string, string>;
  /** Standard BLE: every service + characteristic the bracelet exposes */
  gattServices?: IGattService[];
  /** Vendor SDK: full raw responses (JSON) for the device check report */
  rawResponses?: string;
}
