import {useCallback, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {removeSyncedReadings, storeLastSyncAt} from '@actions';
import {uploadReadings} from '@services';
import {IRootReduxState} from '@types';

/** Uploads the offline queue to the ALIHEALTH API. */
export const useHealthSync = () => {
  const dispatch = useDispatch();
  const {syncQueue, lastSyncAt} = useSelector(
    (state: IRootReduxState) => state.healthData,
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const syncNow = useCallback(async () => {
    if (isSyncing || syncQueue.length === 0) {
      return;
    }
    setIsSyncing(true);
    try {
      const uploadedIds = await uploadReadings(syncQueue);
      dispatch(removeSyncedReadings(uploadedIds));
      dispatch(storeLastSyncAt(new Date().toISOString()));
    } catch (error) {
      console.log('sync error >>>', error);
    } finally {
      setIsSyncing(false);
    }
  }, [dispatch, isSyncing, syncQueue]);

  return {pendingCount: syncQueue.length, lastSyncAt, isSyncing, syncNow};
};
