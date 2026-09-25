import {NativeStackNavigationProp} from '@react-navigation/native-stack';

export type RootStackParamList = {
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

export type SplashScreenNavigatorProps = NativeStackNavigationProp<
  RootStackParamList,
  'SplashScreen'
>;

export type HomeScreenNavigatorProps = NativeStackNavigationProp<
  BottomTabBarParamList,
  'HomeScreen'
>;
