import {IDeviceCapabilities, IHealthReading} from '@types';

/**
 * Every bracelet family (H Band, E500, generic BLE) implements this interface.
 * Screens and hooks only talk to this interface, never to a vendor SDK directly.
 */
export interface WearableAdapter {
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  getCapabilities(): Promise<IDeviceCapabilities>;
  /** Live readings (e.g. heart rate). Returns an unsubscribe function. */
  subscribeRealtime(
    onReadings: (readings: IHealthReading[]) => void,
  ): () => void;
  /** History stored on the bracelet (steps, sleep, ...). */
  syncHistory(since?: string): Promise<IHealthReading[]>;
}
