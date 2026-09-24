import React from 'react';
import {ScrollView, Text, View} from 'react-native';
import {useTheme} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {styles} from './style';
import {localize} from '@languages';
import {textStyle} from '@resources';
import {IRootReduxState} from '@types';

const RECENT_READINGS = 20;

/**
 * POC only: shows the raw device state and the latest normalized readings
 * so values can be compared with the vendor app. Reachable in __DEV__ builds only.
 */
const DebugScreen = () => {
  const colors = useTheme().colors;
  const deviceDetails = useSelector(
    (state: IRootReduxState) => state.deviceDetails,
  );
  const {syncQueue} = useSelector((state: IRootReduxState) => state.healthData);

  const sections = [
    {title: localize('device_state'), data: deviceDetails},
    {
      title: localize('recent_readings'),
      data: syncQueue.slice(-RECENT_READINGS).reverse(),
    },
  ];

  return (
    <ScrollView
      style={{backgroundColor: colors.background}}
      contentContainerStyle={styles.container}
    >
      {sections.map(section => (
        <View
          key={section.title}
          style={[styles.card, {backgroundColor: colors.card}]}
        >
          <Text style={[textStyle(14, 'Roboto200'), {color: colors.text}]}>
            {section.title}
          </Text>
          <Text style={[styles.code, {color: colors.secondaryText}]}>
            {JSON.stringify(section.data, null, 2)}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

export {DebugScreen};
