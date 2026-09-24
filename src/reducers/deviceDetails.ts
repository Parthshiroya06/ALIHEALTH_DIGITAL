import {reduxTypes} from '@constants';
import {ConnectionState, IDeviceCapabilities, IWearableDevice} from '@types';

interface IAction {
  type: string;
  pairedDevice: IWearableDevice | null;
  connectionState: ConnectionState;
  capabilities: IDeviceCapabilities;
}

const initialValue = {
  pairedDevice: null as IWearableDevice | null,
  connectionState: 'disconnected' as ConnectionState,
  capabilities: [] as IDeviceCapabilities,
};
export const deviceDetails = (state = initialValue, action: IAction) => {
  switch (action.type) {
    case reduxTypes.PAIRED_DEVICE:
      return {
        ...state,
        pairedDevice: action.pairedDevice,
      };
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
    case reduxTypes.RESET_DATA:
      return initialValue;
    default:
      return state;
  }
};
