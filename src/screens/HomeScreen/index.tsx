import React from 'react';
import {ScrollView, Text, View} from 'react-native';
import {CommonActions, useNavigation, useTheme} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {styles} from './style';
import {CommonButton, MetricCard} from '@components';
import {useHealthSync} from '@hooks';
import {localize} from '@languages';
import {Colors, textStyle} from '@resources';
import {IRootReduxState, MetricType} from '@types';
import {formatReadingValue} from '@utils';

const METRICS: MetricType[] = [
  'heart_rate',
  'spo2',
  'steps',
  'sleep_session',
  'temperature',
  'blood_pressure',
  'ecg',
  'glucose',
];

const HomeScreen = () => {
  const colors = useTheme().colors;
  const navigation = useNavigation();
  const {latest} = useSelector((state: IRootReduxState) => state.healthData);
  const {connectionState, pairedDevice} = useSelector(
    (state: IRootReduxState) => state.deviceDetails,
  );
  const {pendingCount, lastSyncAt, isSyncing, syncNow} = useHealthSync();

  return (
    <ScrollView
      style={{backgroundColor: colors.background}}
      contentContainerStyle={styles.container}
    >
      <Text style={[textStyle(14), {color: colors.secondaryText}]}>
        {pairedDevice?.name ?? localize('no_device_paired')} ·{' '}
        {localize(connectionState)}
      </Text>

      <View style={styles.grid}>
        {METRICS.map(metric => (
          <MetricCard
            key={metric}
            title={localize(metric)}
            value={formatReadingValue(latest[metric])}
            unit={latest[metric]?.unit}
            isEstimated={latest[metric]?.quality === 'estimated'}
          />
        ))}
      </View>

      <Text style={[textStyle(14), {color: colors.secondaryText}]}>
        {localize('pending_readings')}: {pendingCount}
      </Text>
      <Text style={[textStyle(14), {color: colors.secondaryText}]}>
        {localize('last_sync')}:{' '}
        {lastSyncAt ? new Date(lastSyncAt).toLocaleString() : localize('never')}
      </Text>
      <CommonButton
        title={localize('sync_now')}
        onPress={syncNow}
        isLoading={isSyncing}
        TitleStyle={{color: Colors.offWhite}}
      />
      <View style={styles.row}>
        <CommonButton
          title={localize('LiveReadingsScreen')}
          onPress={() =>
            navigation.dispatch(CommonActions.navigate('LiveReadingsScreen'))
          }
          buttonStyle={styles.halfButton}
          TitleStyle={{color: Colors.offWhite}}
        />
        <CommonButton
          title={localize('SyncStatusScreen')}
          onPress={() =>
            navigation.dispatch(CommonActions.navigate('SyncStatusScreen'))
          }
          buttonStyle={styles.halfButton}
          TitleStyle={{color: Colors.offWhite}}
        />
      </View>
    </ScrollView>
  );
};

export {HomeScreen};
