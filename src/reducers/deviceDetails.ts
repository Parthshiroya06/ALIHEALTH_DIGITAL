import {reduxTypes} from '@constants';
import {
  ConnectionState,
  IDeviceCapabilities,
  IDeviceInfo,
  IWearableDevice,
} from '@types';

interface IAction {
  type: string;
  pairedDevice: IWearableDevice | null;
  connectionState: ConnectionState;
  capabilities: IDeviceCapabilities;
  deviceInfo: IDeviceInfo;
  historySyncedAt: string;
  autoReconnect: boolean;
}

const initialValue = {
  pairedDevice: null as IWearableDevice | null,
  connectionState: 'disconnected' as ConnectionState,
  capabilities: [] as IDeviceCapabilities,
  deviceInfo: {} as IDeviceInfo,
  historySyncedAt: null as string | null, // newest history reading already imported
  autoReconnect: false, // reconnect the paired bracelet when it drops or the app opens
};
export const deviceDetails = (state = initialValue, action: IAction) => {
  switch (action.type) {
    case reduxTypes.PAIRED_DEVICE: {
      const isSameDevice = state.pairedDevice?.id === action.pairedDevice?.id;
      return {
        ...state,
        pairedDevice: action.pairedDevice,
        deviceInfo: isSameDevice ? state.deviceInfo : {},
        historySyncedAt: isSameDevice ? state.historySyncedAt : null,
      };
    }
    case reduxTypes.CONNECTION_STATE:
      return {
        ...state,
        connectionState: action.connectionState,
      };
    case reduxTypes.DEVICE_CAPABILITIES:
      return {
        ...state,
        capabilities: action.capabilities,
      };
    case reduxTypes.DEVICE_INFO:
      return {
        ...state,
        deviceInfo: action.deviceInfo,
      };
    case reduxTypes.HISTORY_SYNCED_AT:
      return {
        ...state,
        historySyncedAt: action.historySyncedAt,
      };
    case reduxTypes.AUTO_RECONNECT:
      return {
        ...state,
        autoReconnect: action.autoReconnect,
      };
    case reduxTypes.RESET_DATA:
      return initialValue;
    default:
      return state;
  }
};
