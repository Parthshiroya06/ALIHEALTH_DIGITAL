import {TextStyle} from 'react-native';
import {FontFamily} from './fonts';

import {responsiveFont} from './helpers';

export const textStyle = (
  size: number = 12,

  fonts: keyof typeof FontFamily = 'Roboto',
  textAlign?: 'left' | 'auto' | 'right' | 'center' | 'justify',
): TextStyle => {
  return {
    fontFamily: FontFamily[fonts],
    fontSize: responsiveFont(size),
    textAlign: textAlign,
  };
};
