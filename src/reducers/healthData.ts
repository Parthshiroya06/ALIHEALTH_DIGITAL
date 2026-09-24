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
export const healthData = (state = initialValue, action: IAction) => {
  switch (action.type) {
    case reduxTypes.ADD_READINGS: {
      const latest = {...state.latest};
      action.readings.forEach(reading => {
        const current = latest[reading.type];
        if (!current || current.timestamp <= reading.timestamp) {
          latest[reading.type] = reading;
        }
      });
      return {
        ...state,
        latest,
        syncQueue: [...state.syncQueue, ...action.readings],
      };
    }
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
