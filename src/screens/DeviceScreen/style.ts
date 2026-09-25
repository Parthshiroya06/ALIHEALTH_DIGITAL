import {StyleSheet} from 'react-native';
import {responsiveHeight, responsiveWidth} from '@resources';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: responsiveWidth(4),
  },
  statusCard: {
    padding: responsiveWidth(4),
    borderRadius: responsiveWidth(3),
    gap: responsiveHeight(0.5),
  },
  smallButton: {
    width: responsiveWidth(40),
    alignSelf: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  list: {
    paddingVertical: responsiveHeight(2),
    gap: responsiveHeight(1),
  },
});

export {styles};
