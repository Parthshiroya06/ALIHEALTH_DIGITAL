import {reduxTypes} from '@constants';
import {ConnectionState, IDeviceCapabilities, IWearableDevice} from '@types';

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
