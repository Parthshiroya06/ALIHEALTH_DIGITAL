import {IDeviceCapabilities, IHealthReading} from '@types';
import {WearableAdapter} from './WearableAdapter';

/**
 * H Band / G Band (Veepoo-type) bracelet.
 * TODO: wrap the vendor SDK in a native module (Kotlin + Swift) and call it here
 * once the SDK is received from the manufacturer.
 */
export class HBandAdapter implements WearableAdapter {
  async connect(_deviceId: string) {
    throw new Error('HBandAdapter: vendor SDK not integrated yet');
  }
  async disconnect() {}
  async getCapabilities(): Promise<IDeviceCapabilities> {
    return [];
  }
  subscribeRealtime(_onReadings: (readings: IHealthReading[]) => void) {
    return () => {};
  }
  async syncHistory(): Promise<IHealthReading[]> {
    return [];
  }
}
