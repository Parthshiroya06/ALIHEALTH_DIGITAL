export type MetricType =
  | 'heart_rate'
  | 'spo2'
  | 'steps'
  | 'sleep_session'
  | 'temperature'
  | 'blood_pressure'
  | 'ecg'
  | 'glucose';

export type ReadingQuality = 'measured' | 'estimated';
export type ReadingSource = 'vendor_sdk' | 'standard_ble';

export interface IHealthReading {
  clientId: string; // uuid, used by the API for dedup
  deviceId: string;
  type: MetricType;
  value: number | Record<string, number>;
  unit: string;
  timestamp: string; // UTC ISO-8601
  quality: ReadingQuality;
  source: ReadingSource;
}

/** Metrics the user can measure on demand from the bracelet. */
export type MeasurableMetric =
  | 'heart_rate'
  | 'spo2'
  | 'blood_pressure'
  | 'temperature'
  | 'glucose'
  | 'ecg';

export type MeasurementState =
  | 'idle'
  | 'measuring'
  | 'done'
  | 'stopped'
  | 'wear_error'
  | 'low_battery'
  | 'busy'
  | 'not_supported'
  | 'failed';

export interface IMeasurementStatus {
  type: MeasurableMetric;
  state: MeasurementState;
  progress: number | null; // 0-100, null when the band gives no progress
  value: number | Record<string, number> | null;
}
