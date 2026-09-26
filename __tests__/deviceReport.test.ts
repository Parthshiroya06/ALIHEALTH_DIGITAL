import {
  buildDeviceReport,
  getMetricStatuses,
  IDeviceReportInput,
} from '../src/utils/deviceReport';
import {IHealthReading} from '../src/types';

const DEVICE = {id: 'AA:BB', name: 'H Band', family: 'hband' as const};

const reading = (
  type: IHealthReading['type'],
  timestamp: string,
  deviceId = DEVICE.id,
): IHealthReading => ({
  clientId: `${type}-${timestamp}-${deviceId}`,
  deviceId,
  type,
  value: 1,
  unit: '',
  timestamp,
  quality: 'measured',
  source: 'vendor_sdk',
});

const input = (
  extra: Partial<IDeviceReportInput> = {},
): IDeviceReportInput => ({
  device: DEVICE,
  capabilities: ['heart_rate', 'spo2', 'steps', 'sleep_session'],
  deviceInfo: {firmwareVersion: '1.2.3', batteryPercent: 80},
  readings: [
    reading('heart_rate', '2026-09-24T08:00:00.000Z'),
    reading('heart_rate', '2026-09-24T09:00:00.000Z'),
    reading('heart_rate', '2026-09-24T10:00:00.000Z', 'OTHER'),
    reading('steps', '2026-09-24T08:30:00.000Z'),
  ],
  latest: {},
  app: {version: '1.0 (1)', phone: 'vivo I2018', os: 'Android 13'},
  generatedAt: '2026-09-26T08:30:00.000Z',
  ...extra,
});

describe('device check report', () => {
  it('counts only this bracelet’s readings per metric', () => {
    const statuses = getMetricStatuses(input());
    const byMetric = Object.fromEntries(statuses.map(s => [s.metric, s]));

    expect(statuses).toHaveLength(8);
    expect(byMetric.heart_rate).toMatchObject({
      supported: true,
      readingCount: 2,
      lastReadingAt: '2026-09-24T09:00:00.000Z',
    });
    expect(byMetric.spo2).toMatchObject({supported: true, readingCount: 0});
    expect(byMetric.glucose.supported).toBe(false);
  });

  it('marks received, missing and unsupported metrics', () => {
    const report = buildDeviceReport(input());

    expect(report).toContain(
      '✅ Heart rate – supported (vendor SDK), 2 readings received, last 2026-09-24 09:00 UTC',
    );
    expect(report).toContain(
      '⚠️ SpO2 – supported (vendor SDK), no data received yet',
    );
    expect(report).toContain(
      '❌ Glucose (estimated) – not reported by the bracelet',
    );
    expect(report).toContain('Firmware: 1.2.3 · Battery: 80%');
    expect(report).toContain('vivo I2018 · Android 13 · ALIHEALTH 1.0 (1)');
  });

  it('includes SDK flags, raw responses and BLE services when present', () => {
    const report = buildDeviceReport(
      input({
        device: {...DEVICE, family: 'generic_ble'},
        deviceInfo: {
          sdkFeatures: {ecg: 'SUPPORT'},
          rawResponses: '{"connect":{"password":{"pwd":"***"}}}',
          gattServices: [
            {
              uuid: '0000180a-0000-1000-8000-00805f9b34fb',
              characteristics: [
                {
                  uuid: '00002a29-0000-1000-8000-00805f9b34fb',
                  properties: ['read'],
                  value: '41 42 "AB"',
                },
              ],
            },
          ],
        },
      }),
    );

    expect(report).toContain('supported (standard BLE)');
    expect(report).toContain('ecg: SUPPORT');
    expect(report).toContain('Service 0000180a-0000-1000-8000-00805f9b34fb');
    expect(report).toContain(
      '00002a29-0000-1000-8000-00805f9b34fb (read): 41 42 "AB"',
    );
    expect(report).toContain('RAW DEVICE DATA');
    expect(report).toContain('"pwd":"***"');
  });

  it('labels an E500 as vendor SDK (it is Veepoo / H Band based)', () => {
    const report = buildDeviceReport(
      input({device: {...DEVICE, name: 'E500', family: 'e500'}}),
    );
    expect(report).toContain('Connected with: vendor SDK');
  });
});
