import {StyleSheet} from 'react-native';
import {responsiveHeight, responsiveWidth} from '@resources';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: responsiveWidth(4),
  },
  summary: {
    padding: responsiveWidth(4),
    borderRadius: responsiveWidth(3),
    gap: responsiveHeight(0.5),
  },
  button: {
    width: '100%',
  },
  list: {
    paddingVertical: responsiveHeight(2),
    gap: responsiveHeight(1),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: responsiveWidth(3.5),
    borderRadius: responsiveWidth(3),
  },
});

export {styles};
