import {useCallback, useState} from 'react';
import {Alert} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {removeSyncedReadings, storeLastSyncAt} from '@actions';
import {localize} from '@languages';
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
    if (isSyncing) {
      return;
    }
    if (syncQueue.length === 0) {
      Alert.alert(localize('sync_now'), localize('sync_nothing'));
      return;
    }
    setIsSyncing(true);
    try {
      const uploadedIds = await uploadReadings(syncQueue);
      dispatch(removeSyncedReadings(uploadedIds));
      dispatch(storeLastSyncAt(new Date().toISOString()));
      Alert.alert(
        localize('sync_now'),
        `${localize('sync_done')}: ${uploadedIds.length}`,
      );
    } catch (error: any) {
      // Readings stay in the queue and are retried on the next sync
      Alert.alert(
        localize('sync_failed'),
        `${localize('sync_failed_message')}\n\n${error?.message ?? ''}`,
      );
    } finally {
      setIsSyncing(false);
    }
  }, [dispatch, isSyncing, syncQueue]);

  return {pendingCount: syncQueue.length, lastSyncAt, isSyncing, syncNow};
};
