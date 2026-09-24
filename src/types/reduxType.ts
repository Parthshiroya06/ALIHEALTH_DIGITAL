import {
  ConnectionState,
  IDeviceCapabilities,
  IWearableDevice,
} from './deviceType';
import {IHealthReading, MetricType} from './healthType';

export interface IProfileDetails {
  name?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  uid?: string | null;
}
export interface IRootReduxState {
  userDetails: {
    isLogin: boolean;
    profileDetails: IProfileDetails;
    authToken: string | null;
    themeMode: string;
    language_code: string;
  };
  deviceDetails: {
    pairedDevice: IWearableDevice | null;
    connectionState: ConnectionState;
    capabilities: IDeviceCapabilities;
  };
  healthData: {
    latest: Partial<Record<MetricType, IHealthReading>>;
    syncQueue: IHealthReading[];
    lastSyncAt: string | null;
  };
}
