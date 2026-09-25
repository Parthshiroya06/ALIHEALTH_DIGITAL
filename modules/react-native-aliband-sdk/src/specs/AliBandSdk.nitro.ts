import type {HybridObject} from 'react-native-nitro-modules';

export type MeasurementType =
  | 'heart_rate'
  | 'spo2'
  | 'blood_pressure'
  | 'temperature'
  | 'glucose'
  | 'ecg';

/** Used by the band for calories, distance and BP. */
export interface BandProfile {
  female: boolean;
  age: number;
  heightCm: number;
  weightKg: number;
  stepGoal: number;
}

export interface BandInfo {
  deviceNumber: number;
  firmwareVersion: string;
  watchDays: number;
  /** Metric types the band supports, e.g. "spo2", "ecg" */
  capabilities: string[];
}

export interface BandBattery {
  isPercent: boolean;
  percent: number;
  level: number;
  isLow: boolean;
}

export interface BandSteps {
  timestamp: number; // epoch ms
  steps: number;
  distanceM: number;
  kcal: number;
}

/** A stored reading from the band's history. Either `value` or `values` is set. */
export interface BandReading {
  type: string;
  unit: string;
  timestamp: number; // epoch ms, device local time converted to UTC
  value?: number;
  values?: Record<string, number>;
}

/** Progress of an on-demand measurement. */
export interface BandMeasurement {
  type: MeasurementType;
  state: string; // SDK status name, e.g. STATE_HEART_NORMAL, UNPASS_WEAR
  progress: number; // -1 when the band gives no progress
  value?: number;
  values?: Record<string, number>;
  done: boolean;
  error: boolean;
  timestamp: number;
}

/**
 * H Band (Veepoo) bracelet SDK.
 * The SDK runs one command at a time – the JS adapter serialises calls.
 */
export interface AliBandSdk
  extends HybridObject<{ios: 'swift'; android: 'kotlin'}> {
  connect(
    mac: string,
    password: string,
    profile: BandProfile,
  ): Promise<BandInfo>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  startMeasurement(type: MeasurementType): Promise<void>;
  stopMeasurement(type: MeasurementType): Promise<void>;

  readCurrentSteps(): Promise<BandSteps>;
  readBattery(): Promise<BandBattery>;
  /** Sleep + 30-min HR/steps/BP + 5-min temperature stored on the band. */
  syncHistory(): Promise<BandReading[]>;

  // Listeners (one of each; the latest call replaces the previous one)
  setOnMeasurement(listener: (event: BandMeasurement) => void): void;
  setOnConnectionChange(listener: (connected: boolean) => void): void;
  setOnSyncProgress(listener: (progress: number) => void): void;
  /** Debug builds only; never carries health values or tokens. */
  setOnLog(listener: (message: string) => void): void;
  clearListeners(): void;
}
