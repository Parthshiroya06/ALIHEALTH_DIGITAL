import {StyleSheet} from 'react-native';
import {responsiveHeight, responsiveWidth} from '@resources';

const styles = StyleSheet.create({
  container: {
    padding: responsiveWidth(4),
    gap: responsiveHeight(1.5),
  },
  card: {
    padding: responsiveWidth(5),
    borderRadius: responsiveWidth(3),
    alignItems: 'center',
    gap: responsiveHeight(1),
  },
});

export {styles};
