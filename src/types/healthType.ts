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
