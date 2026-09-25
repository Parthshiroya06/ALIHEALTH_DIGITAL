import {HBandAdapter} from '../src/services/WearableService/HBandAdapter';
import {IHealthReading, IMeasurementStatus} from '../src/types';

const listeners: {onMeasurement?: (event: object) => void} = {};

jest.mock('react-native-aliband-sdk', () => ({
  AliBandSdk: {
    connect: jest.fn(async () => ({
      deviceNumber: 42,
      firmwareVersion: '1.2.3',
      watchDays: 3,
      capabilities: ['heart_rate', 'steps', 'blood_pressure'],
    })),
    readBattery: jest.fn(async () => ({isPercent: true, percent: 80})),
    startMeasurement: jest.fn(async () => {}),
    stopMeasurement: jest.fn(async () => {}),
    syncHistory: jest.fn(async () => [
      {
        type: 'heart_rate',
        value: 64,
        unit: 'bpm',
        timestamp: Date.UTC(2026, 8, 24, 8, 0),
      },
      {
        type: 'heart_rate',
        value: 70,
        unit: 'bpm',
        timestamp: Date.UTC(2026, 8, 24, 9, 0),
      },
    ]),
    disconnect: jest.fn(async () => {}),
    setOnMeasurement: jest.fn((listener: (event: object) => void) => {
      listeners.onMeasurement = listener;
    }),
    setOnConnectionChange: jest.fn(),
    setOnSyncProgress: jest.fn(),
    setOnLog: jest.fn(),
    clearListeners: jest.fn(),
  },
}));

const MAC = 'AA:BB:CC:DD:EE:FF';

const measurement = (event: object) =>
  listeners.onMeasurement?.({
    progress: -1,
    done: false,
    error: false,
    ...event,
  });

const connectedAdapter = async () => {
  const adapter = new HBandAdapter();
  await adapter.connect(MAC);
  const readings: IHealthReading[] = [];
  adapter.subscribeRealtime(batch => readings.push(...batch));
  const statuses: IMeasurementStatus[] = [];
  return {
    adapter,
    readings,
    statuses,
    onStatus: (s: IMeasurementStatus) => statuses.push(s),
  };
};

describe('HBandAdapter', () => {
  it('returns capabilities and device info after connecting', async () => {
    const {adapter} = await connectedAdapter();
    expect(await adapter.getCapabilities()).toEqual([
      'heart_rate',
      'steps',
      'blood_pressure',
    ]);
    expect(await adapter.getDeviceInfo()).toEqual({
      deviceNumber: 42,
      firmwareVersion: '1.2.3',
      watchDays: 3,
      batteryPercent: 80,
    });
  });

  it('stores at most one live heart-rate value per interval', async () => {
    const {adapter, readings, statuses, onStatus} = await connectedAdapter();
    await adapter.startMeasurement('heart_rate', onStatus);
    const t0 = Date.UTC(2026, 8, 24, 8, 0, 0);
    measurement({
      type: 'heart_rate',
      state: 'STATE_HEART_NORMAL',
      value: 72,
      timestamp: t0,
    });
    measurement({
      type: 'heart_rate',
      state: 'STATE_HEART_NORMAL',
      value: 74,
      timestamp: t0 + 1000,
    });
    measurement({
      type: 'heart_rate',
      state: 'STATE_HEART_NORMAL',
      value: 76,
      timestamp: t0 + 31000,
    });

    expect(readings.map(r => r.value)).toEqual([72, 76]);
    expect(readings[0]).toMatchObject({
      unit: 'bpm',
      quality: 'measured',
      source: 'vendor_sdk',
      deviceId: MAC,
    });
    // Every live value still reaches the UI
    expect(statuses.filter(s => s.value != null).map(s => s.value)).toEqual([
      72, 74, 76,
    ]);
  });

  it('marks blood pressure as estimated and stores it when done', async () => {
    const {adapter, readings, statuses, onStatus} = await connectedAdapter();
    await adapter.startMeasurement('blood_pressure', onStatus);
    measurement({
      type: 'blood_pressure',
      state: 'STATE_BP_NORMAL',
      progress: 50,
      timestamp: 1,
    });
    measurement({
      type: 'blood_pressure',
      state: 'STATE_BP_NORMAL',
      progress: 100,
      done: true,
      values: {systolic: 121, diastolic: 79},
      timestamp: Date.UTC(2026, 8, 24, 8, 16),
    });

    expect(readings).toHaveLength(1);
    expect(readings[0]).toMatchObject({
      type: 'blood_pressure',
      value: {systolic: 121, diastolic: 79},
      unit: 'mmHg',
      quality: 'estimated',
      timestamp: '2026-09-24T08:16:00.000Z',
    });
    expect(statuses.map(s => s.state)).toEqual([
      'measuring',
      'measuring',
      'done',
    ]);
  });

  it('reports a wear error', async () => {
    const {adapter, statuses, onStatus} = await connectedAdapter();
    await adapter.startMeasurement('heart_rate', onStatus);
    measurement({
      type: 'heart_rate',
      state: 'STATE_HEART_WEAR_ERROR',
      timestamp: 1,
    });
    expect(statuses[statuses.length - 1].state).toBe('wear_error');
  });

  it('returns only history newer than the last sync, with stable clientIds', async () => {
    const {adapter} = await connectedAdapter();
    const all = await adapter.syncHistory(null);
    const newer = await adapter.syncHistory('2026-09-24T08:00:00.000Z');

    expect(all.map(r => r.timestamp)).toEqual([
      '2026-09-24T08:00:00.000Z',
      '2026-09-24T09:00:00.000Z',
    ]);
    expect(newer).toHaveLength(1);
    // Re-reading the same data gives the same clientId, so the API can dedup
    expect(newer[0].clientId).toBe(all[1].clientId);
  });
});
