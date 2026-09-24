import {Platform} from 'react-native';
import Device from 'react-native-device-info';
export function isIpad() {
  let isIPad = false;
  if (Platform.OS === 'ios') {
    const platformIOS = Platform;
    isIPad = platformIOS.isPad;
  } else {
    const isTablet = Device.isTablet();

    isIPad = isTablet;
  }
  return isIPad;
}
