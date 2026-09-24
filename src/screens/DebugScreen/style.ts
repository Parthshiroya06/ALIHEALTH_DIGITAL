import {Platform, StyleSheet} from 'react-native';
import {responsiveFont, responsiveHeight, responsiveWidth} from '@resources';

const styles = StyleSheet.create({
  container: {
    padding: responsiveWidth(4),
    gap: responsiveHeight(1.5),
  },
  card: {
    padding: responsiveWidth(4),
    borderRadius: responsiveWidth(3),
    gap: responsiveHeight(1),
  },
  code: {
    fontFamily: Platform.select({ios: 'Menlo', android: 'monospace'}),
    fontSize: responsiveFont(11),
  },
});

export {styles};
