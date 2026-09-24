import React, {useEffect} from 'react';
import {useColorScheme} from 'react-native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';

import {RootStackNavigator} from './RootStackNavigator';

import {IRootReduxState, RootStackParamList} from '@types';
import {NavigationContainer} from '@react-navigation/native';
import {useSelector} from 'react-redux';

import {CombinedDarkTheme, CombinedLightTheme} from '@resources';
import {changeLanguage} from '@languages';
import {AppStackNavigator} from './AppStackNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

const StackNavigator = () => {
  const theme = useColorScheme();
  const {themeMode, language_code} = useSelector(
    (state: IRootReduxState) => state.userDetails,
  );

  useEffect(() => {
    changeLanguage(language_code);
  }, [language_code]);

  let isThemeMode = themeMode;

  if (themeMode === 'Auto') {
    isThemeMode = theme === 'dark' ? 'Dark' : 'Light';
  }

  return (
    <NavigationContainer
      theme={isThemeMode === 'Dark' ? CombinedDarkTheme : CombinedLightTheme}
    >
      <Stack.Navigator
        screenOptions={{headerShown: false}}
        initialRouteName="SplashScreen"
      >
        {RootStackNavigator()}
        {AppStackNavigator()}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export {StackNavigator};
