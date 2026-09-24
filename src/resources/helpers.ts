import {Dimensions, PixelRatio} from 'react-native';
const {height, width} = Dimensions.get('window');

const scale = height / 800;

export const responsiveHeight = (h: number) => {
  return PixelRatio.roundToNearestPixel(height * (h / 100));
};

export const responsiveWidth = (w: number) => {
  return PixelRatio.roundToNearestPixel(width * (w / 100));
};

export const responsiveFont = (size: number) => {
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};
