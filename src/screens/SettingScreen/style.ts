import {StyleSheet} from 'react-native';
import {responsiveHeight, responsiveWidth} from '@resources';

const styles = StyleSheet.create({
  container: {
    padding: responsiveWidth(4),
    gap: responsiveHeight(1.2),
  },
  section: {
    marginTop: responsiveHeight(1),
    gap: responsiveHeight(1),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: responsiveWidth(4),
    borderRadius: responsiveWidth(3),
    gap: responsiveWidth(3),
  },
  rowTitle: {
    flex: 1,
  },
  icon: {
    width: responsiveWidth(5),
    height: responsiveWidth(5),
    resizeMode: 'contain',
  },
});

export {styles};
