import {healthData} from '../src/reducers/healthData';
import {addReadings, removeSyncedReadings} from '../src/actions/Health';
import {IHealthReading} from '../src/types/healthType';

const reading = (
  clientId: string,
  timestamp: string,
  value: number,
): IHealthReading => ({
  clientId,
  deviceId: 'e500-test',
  type: 'heart_rate',
  value,
  unit: 'bpm',
  timestamp,
  quality: 'measured',
  source: 'standard_ble',
});

describe('healthData reducer', () => {
  it('queues readings and keeps the newest per metric', () => {
    let state = healthData(undefined, {type: '@@INIT'} as any);
    state = healthData(
      state,
      addReadings([
        reading('a', '2026-09-24T08:00:00Z', 70),
        reading('b', '2026-09-24T08:01:00Z', 75),
      ]) as any,
    );
    expect(state.syncQueue).toHaveLength(2);
    expect(state.latest.heart_rate?.value).toBe(75);
  });

  it('removes uploaded readings from the queue', () => {
    let state = healthData(
      undefined,
      addReadings([
        reading('a', '2026-09-24T08:00:00Z', 70),
        reading('b', '2026-09-24T08:01:00Z', 75),
      ]) as any,
    );
    state = healthData(state, removeSyncedReadings(['a']) as any);
    expect(state.syncQueue.map(r => r.clientId)).toEqual(['b']);
  });
});
