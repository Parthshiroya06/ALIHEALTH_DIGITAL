import React from 'react';
import {Image, Pressable, ScrollView, Text, View} from 'react-native';
import {CommonActions, useNavigation, useTheme} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import DeviceInfo from 'react-native-device-info';
import {styles} from './style';
import {images} from '@assets';
import {SegmentedControl} from '@components';
import {languageSelection, storeThemeMode} from '@actions';
import {localize} from '@languages';
import {textStyle} from '@resources';
import {ImageKeys, IRootReduxState} from '@types';

const THEMES = ['Auto', 'Light', 'Dark'];
const LANGUAGES = ['en_US', 'fr_FR'];

const SettingScreen = () => {
  const colors = useTheme().colors;
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const {themeMode, language_code} = useSelector(
    (state: IRootReduxState) => state.userDetails,
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

      <View style={styles.section}>
        {row(localize('term_title'), 'ic_terms', () =>
          // TODO: replace with the ALIHEALTH terms URL
          navigation.dispatch(
            CommonActions.navigate('WebViewScreen', {
              url: 'https://alihealth.example/terms',
              title: localize('term_title'),
            }),
          ),
        )}
        {row(localize('policy_title'), 'ic_privacy', () =>
          // TODO: replace with the ALIHEALTH privacy URL
          navigation.dispatch(
            CommonActions.navigate('WebViewScreen', {
              url: 'https://alihealth.example/privacy',
              title: localize('policy_title'),
            }),
          ),
        )}
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
