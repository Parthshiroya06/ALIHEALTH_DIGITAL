import React, {useEffect} from 'react';
import {Text, View} from 'react-native';
import {styles} from './style';
import {IRootReduxState} from '@types';
import {useDispatch, useSelector} from 'react-redux';

import {textStyle} from '@resources';
import {localize} from '@languages';
import {CommonActions, useNavigation, useTheme} from '@react-navigation/native';
import {storeConnectionState} from '@actions';

const SplashScreen = () => {
  const colors = useTheme().colors;
  const dispatch = useDispatch();
  const {isLogin} = useSelector((state: IRootReduxState) => state.userDetails);

  const navigation = useNavigation();

  useEffect(() => {
    // BLE connections never survive an app restart
    dispatch(storeConnectionState('disconnected'));

    const timer = setTimeout(() => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{name: isLogin ? 'BottomTabBar' : 'LoginScreen'}],
        }),
      );
    }, 2000);
    return () => clearTimeout(timer);
  }, [dispatch, navigation, isLogin]);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <Text
        style={[textStyle(30, 'Roboto200', 'center'), {color: colors.text}]}
      >
        {localize('wel_come')}
      </Text>
      <Text
        style={[
          textStyle(16, 'Roboto', 'center'),
          {color: colors.secondaryText},
        ]}
      >
        {localize('sub_welCome')}
      </Text>
    </View>
  );
};

export {SplashScreen};
