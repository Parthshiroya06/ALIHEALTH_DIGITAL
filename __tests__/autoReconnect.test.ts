import {reconnectDelay} from '../src/utils/reconnect';
import {deviceDetails} from '../src/reducers/deviceDetails';
import {
  storeAutoReconnect,
  storePairedDevice,
} from '../src/actions/Device/deviceActions';

describe('auto-reconnect', () => {
  it('backs off quickly, then retries once a minute', () => {
    expect([0, 1, 2, 3, 4, 5, 9].map(reconnectDelay)).toEqual([
      2000, 5000, 10000, 20000, 30000, 60000, 60000,
    ]);
  });

  it('is off until a bracelet connects and off again after Disconnect', () => {
    const initial = deviceDetails(undefined, {type: '@@INIT'} as any);
    expect(initial.autoReconnect).toBe(false);

    const on = deviceDetails(initial, storeAutoReconnect(true) as any);
    expect(on.autoReconnect).toBe(true);
    // Pairing the same or another bracelet does not change it
    const paired = deviceDetails(
      on,
      storePairedDevice({id: 'AA', name: 'E500', family: 'e500'}) as any,
    );
    expect(paired.autoReconnect).toBe(true);

    expect(
      deviceDetails(paired, storeAutoReconnect(false) as any).autoReconnect,
    ).toBe(false);
  });
});
