import React from 'react';
import {ScrollView, Text, View} from 'react-native';
import {useTheme} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {styles} from './style';
import {localize} from '@languages';
import {textStyle} from '@resources';
import {IRootReduxState, MetricType} from '@types';
import {formatReadingValue} from '@utils';

// Metrics the bracelets can stream in real time
const LIVE_METRICS: MetricType[] = ['heart_rate', 'spo2'];

const LiveReadingsScreen = () => {
  const colors = useTheme().colors;
  const {latest} = useSelector((state: IRootReduxState) => state.healthData);
  const {connectionState, pairedDevice} = useSelector(
    (state: IRootReduxState) => state.deviceDetails,
  );

  return (
    <ScrollView
      style={{backgroundColor: colors.background}}
      contentContainerStyle={styles.container}
    >
      <Text style={[textStyle(14), {color: colors.secondaryText}]}>
        {pairedDevice?.name ?? localize('no_device_paired')} ·{' '}
        {localize(connectionState)}
      </Text>

      {LIVE_METRICS.map(metric => {
        const reading = latest[metric];
        return (
          <View
            key={metric}
            style={[styles.card, {backgroundColor: colors.card}]}
          >
            <Text style={[textStyle(16), {color: colors.secondaryText}]}>
              {localize(metric)}
            </Text>
            <Text
              style={[
                textStyle(48, 'Roboto400', 'center'),
                {color: colors.text},
              ]}
            >
              {formatReadingValue(reading) ?? '--'}
              {reading ? (
                <Text style={[textStyle(18), {color: colors.secondaryText}]}>
                  {' ' + reading.unit}
                </Text>
              ) : null}
            </Text>
            <Text style={[textStyle(12), {color: colors.secondaryText}]}>
              {reading
                ? `${localize('updated_at')} ${new Date(
                    reading.timestamp,
                  ).toLocaleTimeString()}`
                : localize('waiting_for_data')}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
};

export {LiveReadingsScreen};
