import {StyleSheet} from 'react-native';
import {responsiveHeight, responsiveWidth} from '@resources';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: responsiveWidth(4),
  },
  content: {
    gap: responsiveHeight(1),
    paddingBottom: responsiveHeight(2),
  },
  card: {
    padding: responsiveWidth(4),
    borderRadius: responsiveWidth(3),
    gap: responsiveHeight(0.5),
  },
  row: {
    padding: responsiveWidth(3.5),
    borderRadius: responsiveWidth(3),
    gap: responsiveHeight(0.3),
  },
  featureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  shareButton: {
    width: '100%',
  },
});

export {styles};
