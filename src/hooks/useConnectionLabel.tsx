import {useSelector} from 'react-redux';
import {localize} from '@languages';
import {IRootReduxState} from '@types';
import {connectionStatus} from '@utils';

/** "Connected", "Disconnected" or "Reconnecting… (attempt 2)" for the status lines. */
export const useConnectionLabel = () => {
  const details = useSelector((state: IRootReduxState) => state.deviceDetails);
  const {key, attempt} = connectionStatus(details);
  return attempt > 0
    ? `${localize(key)} (${localize('attempt')} ${attempt})`
    : localize(key);
};
