import React from 'react';
import {ScrollView, Text, View} from 'react-native';
import {useTheme} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {styles} from './style';
import {CommonButton} from '@components';
import {useLanguage, useMeasurement} from '@hooks';
import {localize} from '@languages';
import {Colors, textStyle} from '@resources';
import {IRootReduxState, MeasurableMetric} from '@types';
import {formatMetricValue} from '@utils';

const MEASURABLE: MeasurableMetric[] = [
  'heart_rate',
  'spo2',
  'blood_pressure',
  'temperature',
  'glucose',
  'ecg',
];
const UNITS: Record<MeasurableMetric, string> = {
  heart_rate: 'bpm',
  spo2: '%',
  blood_pressure: 'mmHg',
  temperature: '°C',
  glucose: 'mg/dL',
  ecg: 'bpm',
};
const ESTIMATED: MeasurableMetric[] = ['blood_pressure', 'glucose'];

const LiveReadingsScreen = () => {
  const colors = useTheme().colors;
  useLanguage();
  const {latest} = useSelector((state: IRootReduxState) => state.healthData);
  const {connectionState, pairedDevice, capabilities, deviceInfo} = useSelector(
    (state: IRootReduxState) => state.deviceDetails,
  );
  const {statuses, activeType, canMeasure, start, stop} = useMeasurement();
  const isConnected = connectionState === 'connected';

  // Standard-BLE bands only stream heart rate; SDK bands list what they support
  const metrics = canMeasure
    ? MEASURABLE.filter(metric => capabilities.includes(metric))
    : (['heart_rate'] as MeasurableMetric[]);

  const renderStatus = (metric: MeasurableMetric) => {
    const status = statuses[metric];
    if (!status || status.state === 'idle') {
      const reading = latest[metric];
      return reading
        ? `${localize('updated_at')} ${new Date(
            reading.timestamp,
          ).toLocaleTimeString()}`
        : localize('waiting_for_data');
    }
    const progress =
      status.state === 'measuring' && status.progress != null
        ? ` ${status.progress}%`
        : '';
    return localize(`status_${status.state}`) + progress;
  };

  return (
    <ScrollView
      style={{backgroundColor: colors.background}}
      contentContainerStyle={styles.container}
    >
      <Text style={[textStyle(14), {color: colors.secondaryText}]}>
        {pairedDevice?.name ?? localize('no_device_paired')} ·{' '}
        {localize(connectionState)}
        {deviceInfo.batteryPercent != null
          ? ` · ${localize('battery')} ${deviceInfo.batteryPercent}%`
          : ''}
      </Text>

      {metrics.map(metric => {
        const status = statuses[metric];
        const isActive = activeType === metric;
        // Live value while measuring, otherwise the last stored reading
        const value =
          isActive && status?.value != null
            ? formatMetricValue(metric, status.value)
            : formatMetricValue(metric, latest[metric]?.value);
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
                textStyle(40, 'Roboto400', 'center'),
                {color: colors.text},
              ]}
            >
              {value ?? '--'}
              {value != null ? (
                <Text style={[textStyle(16), {color: colors.secondaryText}]}>
                  {' ' + UNITS[metric]}
                </Text>
              ) : null}
            </Text>
            {ESTIMATED.includes(metric) && (
              <Text style={[textStyle(11), {color: colors.secondaryText}]}>
                {localize('estimated')}
              </Text>
            )}
            <Text style={[textStyle(12), {color: colors.secondaryText}]}>
              {renderStatus(metric)}
            </Text>
            {canMeasure && (
              <CommonButton
                title={localize(isActive ? 'stop' : 'measure')}
                onPress={() => (isActive ? stop(metric) : start(metric))}
                buttonStyle={[
                  styles.button,
                  !isConnected || (activeType && !isActive)
                    ? styles.disabled
                    : null,
                ]}
                TitleStyle={{color: Colors.offWhite}}
              />
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

export {LiveReadingsScreen};
