import {
  ConnectionState,
  IDeviceCapabilities,
  IDeviceInfo,
  IHealthReading,
  IMeasurementStatus,
  MeasurableMetric,
} from '@types';

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
  /** History stored on the bracelet (steps, sleep, ...), newer than `since` (ISO). */
  syncHistory(since?: string | null): Promise<IHealthReading[]>;

  /** Optional: firmware, battery, ... */
  getDeviceInfo?(): Promise<IDeviceInfo>;
  /** Optional: readings shown in the UI but not uploaded (e.g. today's step total). */
  readSnapshot?(): Promise<IHealthReading[]>;
  /** Optional: connection changes after connect (e.g. the band walked out of range). */
  subscribeConnection?(onChange: (state: ConnectionState) => void): () => void;
  /** Optional: on-demand measurements. Results arrive through subscribeRealtime. */
  startMeasurement?(
    type: MeasurableMetric,
    onStatus: (status: IMeasurementStatus) => void,
  ): Promise<void>;
  stopMeasurement?(type: MeasurableMetric): Promise<void>;
}
