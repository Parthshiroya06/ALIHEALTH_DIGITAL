import {IDeviceCapabilities, IHealthReading} from '@types';
import {WearableAdapter} from './WearableAdapter';

/**
 * E500 bracelet (manufacturer and model to be confirmed).
 * TODO: wrap the vendor SDK in a native module (Kotlin + Swift) and call it here
 * once the SDK is received from the manufacturer.
 */
export class E500Adapter implements WearableAdapter {
  async connect(_deviceId: string) {
    throw new Error('E500Adapter: vendor SDK not integrated yet');
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
