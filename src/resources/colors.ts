import {DarkTheme, DefaultTheme} from '@react-navigation/native';

export const Colors = {
  screenBackground: '#FFFFFF',
  textColor: '#1B1B43',
  black: '#000000',
  blue: '#0f87f1',
  grey: '#7A869A',
  lightGrey: '#cfd1d1',
  offWhite: '#FCFCFC',
  red: '#E44D4D',
  green: '#2E9E6B',
  purple: '#7451E1',
  skyBlue: '#64B4CD',
  blackTransparency: 'rgba(0,0,0,0.6)',

  //Colors,
  DarkSlateBlue: '#483D8B',

  darkprimary: '#2A3A3E',
  darksecondary: '#282F32',
  lightprimary: '#FFFFFF',
  lightsecondary: '#F6F8FC',
};

export const CombinedLightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    ...Colors, // Add custom colors here
    background: Colors.screenBackground,
    text: Colors.black,
    icons: Colors.black,
    secondaryText: Colors.grey,
    card: Colors.offWhite,
    darktertiary1: '#DCE3E5',
    blackTransparency: 'rgba(0,0,0,0.5)',
  },
};

export const CombinedDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    ...Colors,
    background: Colors.darksecondary,
    primary: Colors.darksecondary,
    card: Colors.darkprimary,
    text: Colors.screenBackground,
    secondaryText: Colors.grey,
    icons: Colors.offWhite,
    darktertiary1: '#202629',
    blackTransparency: 'rgba(100, 107, 110, 0.5) ',
  },
};
