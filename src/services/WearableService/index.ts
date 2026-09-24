import {DeviceFamily} from '@types';
import {E500Adapter} from './E500Adapter';
import {GenericBleAdapter} from './GenericBleAdapter';
import {HBandAdapter} from './HBandAdapter';
import {WearableAdapter} from './WearableAdapter';

export * from './WearableAdapter';
export * from './GenericBleAdapter';
export * from './HBandAdapter';
export * from './E500Adapter';

/** Guess the bracelet family from its advertised name. */
export const detectDeviceFamily = (name?: string | null): DeviceFamily => {
  const deviceName = (name ?? '').toLowerCase();
  if (deviceName.includes('e500')) {
    return 'e500';
  }
  if (deviceName.includes('hband') || deviceName.includes('h band')) {
    return 'hband';
  }
  return 'generic_ble';
};

export const getAdapter = (family: DeviceFamily): WearableAdapter => {
  switch (family) {
    case 'hband':
      return new HBandAdapter();
    case 'e500':
      return new E500Adapter();
    default:
      return new GenericBleAdapter();
  }
};
