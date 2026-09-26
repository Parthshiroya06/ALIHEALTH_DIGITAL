import {
  ConnectionState,
  IDeviceCapabilities,
  IDeviceInfo,
  IWearableDevice,
} from './deviceType';
import {IHealthReading, MetricType} from './healthType';

export interface IRootReduxState {
  userDetails: {
    authToken: string | null;
    themeMode: string;
    language_code: string;
  };
  deviceDetails: {
    pairedDevice: IWearableDevice | null;
    connectionState: ConnectionState;
    capabilities: IDeviceCapabilities;
    deviceInfo: IDeviceInfo;
    historySyncedAt: string | null;
    autoReconnect: boolean;
    autoReconnectEnabled: boolean;
    reconnectAttempt: number;
  };
  healthData: {
    latest: Partial<Record<MetricType, IHealthReading>>;
    syncQueue: IHealthReading[];
    lastSyncAt: string | null;
  };
}
