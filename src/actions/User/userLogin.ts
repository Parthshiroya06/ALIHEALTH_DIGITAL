import {reduxTypes} from '@constants';
import {changeLanguage} from '@languages';

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
  // Switch before the state update so screens re-render with the new language
  changeLanguage(language_code);
  return {
    type: reduxTypes.LANGUAGE_CODE,
    language_code: language_code,
  };
};
