import {reduxTypes} from '@constants';

interface IAction {
  type: string;
  authToken: string | null;
  themeMode: string;
  language_code: string;
}

const initialValue = {
  authToken: null as string | null, // API token (no login screen in the POC)
  themeMode: 'Auto',
  language_code: 'en_US',
};
export const userDetails = (state = initialValue, action: IAction) => {
  switch (action.type) {
    case reduxTypes.AUTH_TOKEN:
      return {
        ...state,
        authToken: action.authToken,
      };
    case reduxTypes.THEME_MODE:
      return {
        ...state,
        themeMode: action.themeMode,
      };
    case reduxTypes.LANGUAGE_CODE:
      return {
        ...state,
        language_code: action.language_code,
      };
    case reduxTypes.RESET_DATA:
      return initialValue;
    default:
      return state;
  }
};
