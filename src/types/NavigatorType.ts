import {NativeStackNavigationProp} from '@react-navigation/native-stack';

export type RootStackParamList = {
  LoginScreen: undefined;
  SplashScreen: undefined;
  BottomTabBar: undefined;
  WebViewScreen: {url: string; title?: string};
  LiveReadingsScreen: undefined;
  SyncStatusScreen: undefined;
  DebugScreen: undefined;
};
export type BottomTabBarParamList = {
  HomeScreen: undefined;
  DeviceScreen: undefined;
  SettingScreen: undefined;
};
export type RootStackNavigatorProps =
  NativeStackNavigationProp<RootStackParamList>;

export type LoginScreenNavigatorProps = NativeStackNavigationProp<
  RootStackParamList,
  'LoginScreen'
>;

export type SplashScreenNavigatorProps = NativeStackNavigationProp<
  RootStackParamList,
  'SplashScreen'
>;

export type HomeScreenNavigatorProps = NativeStackNavigationProp<
  BottomTabBarParamList,
  'HomeScreen'
>;
