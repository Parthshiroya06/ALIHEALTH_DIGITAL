import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import * as Screen from '@screen';
import {BottomTabBarParamList, ImageKeys, ScreenComponents} from '@types';
import {Image, StyleSheet} from 'react-native';
import {images} from '@assets';
import {responsiveHeight, responsiveWidth} from '@resources';
import {isIpad} from '@utils';
import {useTheme} from '@react-navigation/native';
import {useLanguage} from '@hooks';
import {localize} from '@languages';

const BottomTab = createBottomTabNavigator<BottomTabBarParamList>();

const BottomTabNavigator = () => {
  const colors = useTheme().colors;
  // Re-render so tab labels and headers follow the app language
  useLanguage();
  const screens: ScreenComponents = {
    HomeScreen: Screen.HomeScreen,
    DeviceScreen: Screen.DeviceScreen,
    SettingScreen: Screen.SettingScreen,
  };

  const _addScreen = (
    name: keyof ScreenComponents,
    label: string,
    icon: ImageKeys,
  ) => {
    return (
      <BottomTab.Screen
        name={name}
        component={screens[name]}
        options={{
          headerShown: true,
          tabBarLabel: localize(label),
          headerTitle: localize(name),
          tabBarLabelPosition: isIpad() ? 'beside-icon' : 'below-icon',
          tabBarPosition: 'bottom',

          // eslint-disable-next-line react/no-unstable-nested-components
          tabBarIcon: ({focused}) => {
            return (
              <Image
                source={images[icon]}
                style={[
                  {
                    tintColor: focused ? colors.link : colors.icons,
                  },
                  styles.imageStyle,
                ]}
              />
            );
          },
        }}
      />
    );
  };

  return (
    <BottomTab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.link,
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      }}
    >
      {_addScreen('HomeScreen', 'home', 'ic_home')}
      {/* TODO: replace with a bracelet/bluetooth tab icon */}
      {_addScreen('DeviceScreen', 'device', 'ic_version')}
      {_addScreen('SettingScreen', 'setting', 'ic_setting')}
    </BottomTab.Navigator>
  );
};

export {BottomTabNavigator};

const styles = StyleSheet.create({
  imageStyle: {
    width: responsiveWidth(5),
    height: responsiveHeight(2.5),
    resizeMode: 'contain',
  },
});
