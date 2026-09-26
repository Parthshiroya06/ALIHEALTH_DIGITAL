import {uploadReadings} from '../src/services/HealthSyncService/healthSync';
import {IHealthReading} from '../src/types';

const mockPost = jest.fn(async () => ({}));

jest.mock('../src/services/ApiConfigService/axiosConfig', () => ({
  getAxiosInstance: () => ({post: mockPost}),
}));

const reading = (extra: Partial<IHealthReading>): IHealthReading => ({
  clientId: 'id-1',
  deviceId: 'AA:BB',
  type: 'ecg',
  value: {heartRate: 70},
  unit: 'bpm',
  timestamp: '2026-09-24T10:00:00.000Z',
  quality: 'measured',
  source: 'vendor_sdk',
  ...extra,
});

describe('uploadReadings', () => {
  it('never sends the local ECG waveform path', async () => {
    const uploaded = await uploadReadings([
      reading({waveformFile: '/data/ecg/ecg_1.json'}),
    ]);

    expect(uploaded).toEqual(['id-1']);
    const body = (mockPost.mock.calls[0] as unknown[])[1] as {
      deviceId: string;
      readings: object[];
    };
    expect(body.deviceId).toBe('AA:BB');
    expect(body.readings[0]).not.toHaveProperty('waveformFile');
    expect(body.readings[0]).not.toHaveProperty('deviceId');
  });
});
