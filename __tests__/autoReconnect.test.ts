import {
  connectionStatus,
  isAutoReconnectOn,
  reconnectDelay,
} from '../src/utils/reconnect';
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

  it('shows "Reconnecting" with the attempt only while auto-reconnect is active', () => {
    const base = {
      connectionState: 'disconnected',
      pairedDevice: {id: 'AA'},
      autoReconnect: true,
      autoReconnectEnabled: true,
      reconnectAttempt: 2,
    };
    expect(connectionStatus(base)).toEqual({key: 'reconnecting', attempt: 2});
    expect(connectionStatus({...base, connectionState: 'connected'})).toEqual({
      key: 'connected',
      attempt: 0,
    });
    // Switched off in Settings, or Disconnect tapped
    expect(connectionStatus({...base, autoReconnectEnabled: false}).key).toBe(
      'disconnected',
    );
    expect(connectionStatus({...base, autoReconnect: false}).key).toBe(
      'disconnected',
    );
    expect(connectionStatus({...base, pairedDevice: null}).key).toBe(
      'disconnected',
    );
  });

  it('treats a missing switch value (older installs) as on', () => {
    expect(isAutoReconnectOn({autoReconnect: true})).toBe(true);
    expect(
      isAutoReconnectOn({autoReconnect: true, autoReconnectEnabled: false}),
    ).toBe(false);
  });
});
