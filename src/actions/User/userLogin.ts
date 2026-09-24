import {reduxTypes} from '@constants';
import {IProfileDetails} from '@types';

export const isUserLogin = (isLogin: boolean) => {
  return {
    type: reduxTypes.IS_USER_LOGIN,
    isLogin: isLogin,
  };
};
export const profileDetails = (profileDetail: IProfileDetails) => {
  return {
    type: reduxTypes.PROFILE_DATA,
    profileDetails: profileDetail,
  };
};
export const storeAuthToken = (authToken: string | null) => {
  return {
    type: reduxTypes.AUTH_TOKEN,
    authToken: authToken,
  };
};
export const storeThemeMode = (themeMode: string) => {
  return {
    type: reduxTypes.THEME_MODE,
    themeMode: themeMode,
  };
};

export const languageSelection = (language_code: string) => {
  return {
    type: reduxTypes.LANGUAGE_CODE,
    language_code: language_code,
  };
};
