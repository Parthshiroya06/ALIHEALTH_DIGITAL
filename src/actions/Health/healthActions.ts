import {reduxTypes} from '@constants';
import {IHealthReading} from '@types';

export const addReadings = (readings: IHealthReading[]) => {
  return {
    type: reduxTypes.ADD_READINGS,
    readings: readings,
  };
};
export const removeSyncedReadings = (clientIds: string[]) => {
  return {
    type: reduxTypes.REMOVE_SYNCED_READINGS,
    clientIds: clientIds,
  };
};
export const storeLastSyncAt = (lastSyncAt: string) => {
  return {
    type: reduxTypes.LAST_SYNC_AT,
    lastSyncAt: lastSyncAt,
  };
};
