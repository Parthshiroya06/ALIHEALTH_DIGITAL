import {StyleSheet} from 'react-native';
import {Colors, responsiveHeight} from '@resources';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    gap: responsiveHeight(1),
    marginBottom: responsiveHeight(4),
  },
  form: {
    alignItems: 'center',
    gap: responsiveHeight(1.5),
  },
  buttonTitle: {
    color: Colors.offWhite,
  },
});

export {styles};
