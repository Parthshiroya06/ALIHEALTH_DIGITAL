import 'react-native';
import {Theme} from '@react-navigation/native';

declare module '@react-navigation/native' {
  export interface ExtendedTheme extends Theme {
    colors: Theme['colors'] & {
      icons: string;
      secondaryText: string;
      darktertiary1: string;
      DarkSlateBlue: string;
      offWhite: string;
      blue: string;
    };
  }

  export function useTheme(): ExtendedTheme;
}
