import {reduxTypes} from '@constants';
import {IHealthReading, MetricType} from '@types';

interface IAction {
  type: string;
  readings: IHealthReading[];
  clientIds: string[];
  lastSyncAt: string;
}

const initialValue = {
  latest: {} as Partial<Record<MetricType, IHealthReading>>,
  syncQueue: [] as IHealthReading[], // offline queue, persisted until uploaded
  lastSyncAt: null as string | null,
};
const withLatest = (
  latest: Partial<Record<MetricType, IHealthReading>>,
  readings: IHealthReading[],
) => {
  const next = {...latest};
  readings.forEach(reading => {
    const current = next[reading.type];
    if (!current || current.timestamp <= reading.timestamp) {
      next[reading.type] = reading;
    }
  });
  return next;
};

export const healthData = (state = initialValue, action: IAction) => {
  switch (action.type) {
    case reduxTypes.ADD_READINGS: {
      // Skip readings already waiting in the queue (same clientId)
      const queued = new Set(state.syncQueue.map(reading => reading.clientId));
      const newReadings = action.readings.filter(
        reading => !queued.has(reading.clientId),
      );
      return {
        ...state,
        latest: withLatest(state.latest, action.readings),
        syncQueue: [...state.syncQueue, ...newReadings],
      };
    }
    case reduxTypes.SET_LATEST_READINGS:
      return {
        ...state,
        latest: withLatest(state.latest, action.readings),
      };
    case reduxTypes.REMOVE_SYNCED_READINGS:
      return {
        ...state,
        syncQueue: state.syncQueue.filter(
          reading => !action.clientIds.includes(reading.clientId),
        ),
      };
    case reduxTypes.LAST_SYNC_AT:
      return {
        ...state,
        lastSyncAt: action.lastSyncAt,
      };
    case reduxTypes.RESET_DATA:
      return initialValue;
    default:
      return state;
  }
};
