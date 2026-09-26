import {
  AliBandSdk,
  BandMeasurement,
  BandReading,
} from 'react-native-aliband-sdk';
import {v5 as uuidv5} from 'uuid';
import {HBandConfig} from '@constants';
import {
  ConnectionState,
  IDeviceCapabilities,
  IDeviceInfo,
  IHealthReading,
  IMeasurementStatus,
  MeasurableMetric,
  MeasurementState,
  MetricType,
} from '@types';
import {addDebugLog} from './debugLog';
import {WearableAdapter} from './WearableAdapter';

type ReadingValue = number | Record<string, number>;

const UNITS: Record<MetricType, string> = {
  heart_rate: 'bpm',
  spo2: '%',
  steps: 'steps',
  sleep_session: 'min',
  temperature: '°C',
  blood_pressure: 'mmHg',
  ecg: 'bpm',
  glucose: 'mg/dL',
};
// Optical estimates – never presented as medical-grade
const ESTIMATED: MetricType[] = ['blood_pressure', 'glucose'];
// HR and SpO2 stream values until stopped; the others finish on their own
const CONTINUOUS: MeasurableMetric[] = ['heart_rate', 'spo2'];
// A band that never answers must not block the command queue
const COMMAND_TIMEOUT_MS = 20000;
const CONNECT_TIMEOUT_MS = 45000;
// Sleep, 5-min data, SpO2 and ECG records are read one after another
const HISTORY_TIMEOUT_MS = 270000;

const withTimeout = <T>(promise: Promise<T>, ms: number) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('The bracelet did not respond')),
      ms,
    );
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

/** The native side sends either a single `value` or a `values` map. */
const valueOf = (item: {value?: number; values?: Record<string, number>}) =>
  item.values ?? item.value ?? null;

/** Maps the SDK's status names (EHeartStatus, EDeviceStatus, ...) to app states. */
const toMeasurementState = (event: BandMeasurement): MeasurementState => {
  if (event.done) {
    return 'done';
  }
  if (event.error) {
    return 'failed';
  }
  const state = event.state.toUpperCase();
  if (state.includes('WEAR')) {
    return 'wear_error';
  }
  if (state.includes('LOW') || state.includes('CHARG')) {
    return 'low_battery';
  }
  if (state.includes('ERROR')) {
    return 'failed';
  }
  if (state.includes('NOT_SUPPORT') || state === 'NONSUPPORT') {
    return 'not_supported';
  }
  if (state === 'STOPPED') {
    return 'stopped';
  }
  // SpO2 reports DETECT_BP / DETECT_HEART / ... when the band is busy with another measurement
  if (
    state === 'BUSY' ||
    state.includes('_BUSY') ||
    (event.type === 'spo2' &&
      state.startsWith('DETECT_') &&
      state !== 'DETECT_SP')
  ) {
    return 'busy';
  }
  return 'measuring';
};

/**
 * H Band / G Band (Veepoo) bracelet, through the AliBandSdk Nitro module
 * (modules/react-native-aliband-sdk). Android only for now.
 */
export class HBandAdapter implements WearableAdapter {
  private deviceId: string | null = null;
  // The SDK handles one command at a time
  private queue: Promise<unknown> = Promise.resolve();
  private capabilities: IDeviceCapabilities = [];
  private deviceInfo: IDeviceInfo = {};
  private onReadings: ((readings: IHealthReading[]) => void) | null = null;
  private onConnection: ((state: ConnectionState) => void) | null = null;
  private onStatus: ((status: IMeasurementStatus) => void) | null = null;
  private activeMeasurement: MeasurableMetric | null = null;
  private lastStoredAt: Partial<Record<MeasurableMetric, number>> = {};

  static isAvailable = () => AliBandSdk != null;

  private get sdk() {
    if (!AliBandSdk) {
      throw new Error('The H Band SDK is not available on this platform yet');
    }
    return AliBandSdk;
  }

  private run<T>(
    task: () => Promise<T>,
    timeoutMs = COMMAND_TIMEOUT_MS,
  ): Promise<T> {
    const timed = () => withTimeout(task(), timeoutMs);
    const next = this.queue.then(timed, timed);
    this.queue = next.catch(() => undefined);
    return next;
  }

  async connect(deviceId: string) {
    const sdk = this.sdk;
    // One native object for the app: route its callbacks to this adapter
    sdk.setOnMeasurement(event => this.handleMeasurement(event));
    sdk.setOnConnectionChange(connected =>
      this.onConnection?.(connected ? 'connected' : 'disconnected'),
    );
    sdk.setOnSyncProgress(progress =>
      addDebugLog(`[HBand] history ${Math.round(progress * 100)}%`),
    );
    sdk.setOnLog(message => addDebugLog(`[HBand] ${message}`));

    const {sex, ...profile} = HBandConfig.DEFAULT_PROFILE;
    const info = await this.run(
      () =>
        sdk.connect(deviceId, HBandConfig.PASSWORD, {
          ...profile,
          female: sex === 'female',
        }),
      CONNECT_TIMEOUT_MS,
    );
    this.deviceId = deviceId;
    this.capabilities = info.capabilities as MetricType[];
    this.deviceInfo = {
      deviceNumber: info.deviceNumber,
      firmwareVersion: info.firmwareVersion,
      watchDays: info.watchDays,
      sdkFeatures: info.features,
    };
    addDebugLog(
      `[HBand] connected, firmware ${
        info.firmwareVersion
      }, supports ${info.capabilities.join(', ')}`,
    );
    try {
      const battery = await this.run(() => sdk.readBattery());
      if (battery.isPercent) {
        this.deviceInfo.batteryPercent = battery.percent;
      }
    } catch (error: any) {
      addDebugLog(`[HBand] battery read failed: ${error?.message}`);
    }
  }

  async disconnect() {
    if (this.activeMeasurement) {
      await this.stopMeasurement(this.activeMeasurement).catch(() => undefined);
    }
    AliBandSdk?.clearListeners();
    if (this.deviceId) {
      this.deviceId = null;
      await this.run(() => this.sdk.disconnect());
    }
  }

  async getCapabilities(): Promise<IDeviceCapabilities> {
    return this.capabilities;
  }

  async getDeviceInfo(): Promise<IDeviceInfo> {
    return this.deviceInfo;
  }

  getRawResponses() {
    try {
      return AliBandSdk?.getRawResponses() ?? null;
    } catch {
      return null;
    }
  }

  subscribeRealtime(onReadings: (readings: IHealthReading[]) => void) {
    this.onReadings = onReadings;
    return () => {
      this.onReadings = null;
    };
  }

  subscribeConnection(onChange: (state: ConnectionState) => void) {
    this.onConnection = onChange;
    return () => {
      this.onConnection = null;
    };
  }

  async startMeasurement(
    type: MeasurableMetric,
    onStatus: (status: IMeasurementStatus) => void,
  ) {
    if (this.activeMeasurement && this.activeMeasurement !== type) {
      throw new Error('Another measurement is already running');
    }
    this.onStatus = onStatus;
    this.activeMeasurement = type;
    this.lastStoredAt[type] = 0;
    onStatus({type, state: 'measuring', progress: null, value: null});
    try {
      await this.run(() => this.sdk.startMeasurement(type));
    } catch (error) {
      this.activeMeasurement = null;
      throw error;
    }
  }

  async stopMeasurement(type: MeasurableMetric) {
    await this.run(() => this.sdk.stopMeasurement(type));
    if (this.activeMeasurement === type) {
      this.activeMeasurement = null;
      this.onStatus?.({type, state: 'stopped', progress: null, value: null});
    }
  }

  async syncHistory(since?: string | null): Promise<IHealthReading[]> {
    if (this.activeMeasurement) {
      throw new Error('Stop the running measurement before syncing');
    }
    const raw: BandReading[] = await this.run(
      () => this.sdk.syncHistory(),
      HISTORY_TIMEOUT_MS,
    );
    const readings = raw
      .map(reading =>
        this.toReading(
          reading.type as MetricType,
          valueOf(reading) ?? 0,
          reading.timestamp,
          reading.file,
        ),
      )
      .filter(reading => !since || reading.timestamp > since);
    addDebugLog(`[HBand] history: ${raw.length} read, ${readings.length} new`);
    return readings;
  }

  /** Today's step total – shown on the dashboard, not uploaded (the history has the 30 min buckets). */
  async readSnapshot(): Promise<IHealthReading[]> {
    const steps = await this.run(() => this.sdk.readCurrentSteps());
    return [
      this.toReading(
        'steps',
        {count: steps.steps, distanceM: steps.distanceM, kcal: steps.kcal},
        steps.timestamp,
      ),
    ];
  }

  private handleMeasurement(event: BandMeasurement) {
    const state = toMeasurementState(event);
    const value = valueOf(event);
    this.onStatus?.({
      type: event.type,
      state,
      progress: event.progress >= 0 ? event.progress : null,
      value,
    });

    if (CONTINUOUS.includes(event.type)) {
      // Store at most one live value per interval
      const lastStored = this.lastStoredAt[event.type] ?? 0;
      if (
        state === 'measuring' &&
        typeof value === 'number' &&
        value > 0 &&
        event.timestamp - lastStored >= HBandConfig.LIVE_STORE_INTERVAL_MS
      ) {
        this.lastStoredAt[event.type] = event.timestamp;
        this.onReadings?.([this.toReading(event.type, value, event.timestamp)]);
      }
    } else if (state === 'done' && value != null) {
      this.onReadings?.([
        this.toReading(event.type, value, event.timestamp, event.file),
      ]);
    }

    if (state !== 'measuring' && this.activeMeasurement === event.type) {
      this.activeMeasurement = null;
    }
  }

  private toReading(
    type: MetricType,
    value: ReadingValue,
    timestampMs: number,
    waveformFile?: string,
  ): IHealthReading {
    const deviceId = this.deviceId ?? 'unknown';
    const timestamp = new Date(timestampMs).toISOString();
    return {
      // Same device + type + time => same clientId, so a re-synced reading dedups on the API
      clientId: uuidv5(
        `${deviceId}|${type}|${timestamp}`,
        HBandConfig.CLIENT_ID_NAMESPACE,
      ),
      deviceId,
      type,
      value,
      unit: UNITS[type],
      timestamp,
      quality: ESTIMATED.includes(type) ? 'estimated' : 'measured',
      source: 'vendor_sdk',
      ...(waveformFile ? {waveformFile} : {}),
    };
  }
}
