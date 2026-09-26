import React from 'react';
import {Image, Pressable, ScrollView, Switch, Text, View} from 'react-native';
import {useTheme} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import DeviceInfo from 'react-native-device-info';
import {styles} from './style';
import {images} from '@assets';
import {SegmentedControl} from '@components';
import {
  languageSelection,
  storeAutoReconnectEnabled,
  storeThemeMode,
} from '@actions';
import {localize} from '@languages';
import {textStyle} from '@resources';
import {ImageKeys, IRootReduxState} from '@types';

const THEMES = ['Auto', 'Light', 'Dark'];
const LANGUAGES = ['en_US', 'fr_FR'];

const SettingScreen = () => {
  const colors = useTheme().colors;
  const dispatch = useDispatch();
  const {themeMode, language_code} = useSelector(
    (state: IRootReduxState) => state.userDetails,
  );
  // Stores saved before this setting existed have no value: on by default
  const autoReconnectEnabled = useSelector(
    (state: IRootReduxState) =>
      state.deviceDetails.autoReconnectEnabled !== false,
  );

  const row = (
    title: string,
    icon: ImageKeys,
    onPress?: () => void,
    value?: string,
  ) => (
    <Pressable
      style={[styles.row, {backgroundColor: colors.card}]}
      onPress={onPress}
      disabled={!onPress}
    >
      <Image
        source={images[icon]}
        style={[styles.icon, {tintColor: colors.icons}]}
      />
      <Text style={[textStyle(16), styles.rowTitle, {color: colors.text}]}>
        {title}
      </Text>
      {value ? (
        <Text style={[textStyle(14), {color: colors.secondaryText}]}>
          {value}
        </Text>
      ) : null}
    </Pressable>
  );

  return (
    <ScrollView
      style={{backgroundColor: colors.background}}
      contentContainerStyle={styles.container}
    >
      <Text style={[textStyle(14), {color: colors.secondaryText}]}>
        {localize('appearance')}
      </Text>
      <SegmentedControl
        tabs={THEMES.map(theme => localize(theme.toLowerCase()))}
        currentIndex={Math.max(THEMES.indexOf(themeMode), 0)}
        onChange={index => dispatch(storeThemeMode(THEMES[index]))}
      />

      <Text style={[textStyle(14), {color: colors.secondaryText}]}>
        {localize('language')}
      </Text>
      <SegmentedControl
        tabs={[localize('english'), localize('french')]}
        currentIndex={Math.max(LANGUAGES.indexOf(language_code), 0)}
        onChange={index => dispatch(languageSelection(LANGUAGES[index]))}
      />

      <Text style={[textStyle(14), {color: colors.secondaryText}]}>
        {localize('device')}
      </Text>
      <View style={[styles.row, {backgroundColor: colors.card}]}>
        <View style={styles.rowTitle}>
          <Text style={[textStyle(16), {color: colors.text}]}>
            {localize('auto_reconnect')}
          </Text>
          <Text style={[textStyle(12), {color: colors.secondaryText}]}>
            {localize('auto_reconnect_hint')}
          </Text>
        </View>
        <Switch
          value={autoReconnectEnabled}
          onValueChange={value => {
            dispatch(storeAutoReconnectEnabled(value));
          }}
          trackColor={{true: colors.link}}
        />
      </View>

      <View style={styles.section}>
        {row(
          localize('version'),
          'ic_version',
          undefined,
          DeviceInfo.getVersion(),
        )}
      </View>
    </ScrollView>
  );
};

export {SettingScreen};
