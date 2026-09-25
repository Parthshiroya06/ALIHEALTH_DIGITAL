import {useSelector} from 'react-redux';
import {IRootReduxState} from '@types';

/** Re-renders the calling screen when the app language changes. */
export const useLanguage = () =>
  useSelector((state: IRootReduxState) => state.userDetails.language_code);
