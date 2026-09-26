import {reduxTypes} from '@constants';
import {
  ConnectionState,
  IDeviceCapabilities,
  IDeviceInfo,
  IWearableDevice,
} from '@types';

export const storePairedDevice = (pairedDevice: IWearableDevice | null) => {
  return {
    type: reduxTypes.PAIRED_DEVICE,
    pairedDevice: pairedDevice,
  };
};
export const storeConnectionState = (connectionState: ConnectionState) => {
  return {
    type: reduxTypes.CONNECTION_STATE,
    connectionState: connectionState,
  };
};
export const storeCapabilities = (capabilities: IDeviceCapabilities) => {
  return {
    type: reduxTypes.DEVICE_CAPABILITIES,
    capabilities: capabilities,
  };
};
export const storeDeviceInfo = (deviceInfo: IDeviceInfo) => {
  return {
    type: reduxTypes.DEVICE_INFO,
    deviceInfo: deviceInfo,
  };
};
/** true after the user connects a bracelet, false after they tap Disconnect. */
export const storeAutoReconnect = (autoReconnect: boolean) => {
  return {
    type: reduxTypes.AUTO_RECONNECT,
    autoReconnect: autoReconnect,
  };
};
export const storeHistorySyncedAt = (historySyncedAt: string) => {
  return {
    type: reduxTypes.HISTORY_SYNCED_AT,
    historySyncedAt: historySyncedAt,
  };
};
