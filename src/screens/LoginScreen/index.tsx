import React, {useRef, useState} from 'react';
import {Alert, KeyboardAvoidingView, Platform, Text, View} from 'react-native';
import {TextInput as NativeTextInput} from 'react-native';
import {CommonActions, useNavigation, useTheme} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {styles} from './style';
import {CommonButton, InputBox} from '@components';
import {textStyle} from '@resources';
import {localize} from '@languages';
import {
  isUserLogin,
  performPostRequest,
  profileDetails,
  storeAuthToken,
} from '@actions';
import {endpoints} from '@services';
import {AppDispatch} from '@store';

const LoginScreen = () => {
  const colors = useTheme().colors;
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const passwordRef = useRef<NativeTextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onSignIn = async () => {
    if (!email.trim()) {
      Alert.alert(localize('please_enter_email'));
      return;
    }
    if (!password) {
      Alert.alert(localize('please_enter_password'));
      return;
    }
    try {
      setIsLoading(true);
      // TODO: align with the real ALIHEALTH auth response shape
      const response = await dispatch(
        performPostRequest(endpoints.login, {email: email.trim(), password}),
      );
      const {accessToken, user} = response?.data ?? {};

      dispatch(storeAuthToken(accessToken ?? null));
      dispatch(profileDetails({name: user?.name, email: user?.email ?? email}));
      dispatch(isUserLogin(true));

      navigation.dispatch(
        CommonActions.reset({index: 0, routes: [{name: 'BottomTabBar'}]}),
      );
    } catch (error) {
      console.log('login error >>>', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, {backgroundColor: colors.background}]}
    >
      <View style={styles.header}>
        <Text style={[textStyle(30, 'Roboto400'), {color: colors.text}]}>
          {localize('appName')}
        </Text>
        <Text style={[textStyle(16), {color: colors.secondaryText}]}>
          {localize('sub_welCome')}
        </Text>
      </View>

      <View style={styles.form}>
        <InputBox
          label={localize('email')}
          placeholder={localize('enter_email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <InputBox
          refs={passwordRef}
          label={localize('enter_password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          returnType
          onSubmitEditing={onSignIn}
        />
        <CommonButton
          title={localize('signIn')}
          onPress={onSignIn}
          isLoading={isLoading}
          TitleStyle={styles.buttonTitle}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

export {LoginScreen};
