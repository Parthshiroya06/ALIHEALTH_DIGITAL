import {HBandServiceUUIDs} from '@constants';
import {DeviceFamily} from '@types';
import {E500Adapter} from './E500Adapter';
import {GenericBleAdapter} from './GenericBleAdapter';
import {HBandAdapter} from './HBandAdapter';
import {WearableAdapter} from './WearableAdapter';

export * from './WearableAdapter';
export * from './GenericBleAdapter';
export * from './HBandAdapter';
export * from './E500Adapter';
export * from './debugLog';
export * from './wearableSession';

/** Guess the bracelet family from its advertised name and services. */
export const detectDeviceFamily = (
  name?: string | null,
  serviceUUIDs?: string[] | null,
): DeviceFamily => {
  const deviceName = (name ?? '').toLowerCase();
  const services = (serviceUUIDs ?? []).map(uuid => uuid.toLowerCase());
  if (deviceName.includes('e500')) {
    return 'e500';
  }
  if (
    deviceName.includes('hband') ||
    deviceName.includes('h band') ||
    services.some(uuid => HBandServiceUUIDs.includes(uuid))
  ) {
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
