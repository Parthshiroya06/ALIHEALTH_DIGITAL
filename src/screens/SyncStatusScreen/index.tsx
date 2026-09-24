import React from 'react';
import {FlatList, Text, View} from 'react-native';
import {useTheme} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {styles} from './style';
import {CommonButton} from '@components';
import {useHealthSync} from '@hooks';
import {localize} from '@languages';
import {Colors, textStyle} from '@resources';
import {IHealthReading, IRootReduxState} from '@types';
import {formatReadingValue} from '@utils';

const SyncStatusScreen = () => {
  const colors = useTheme().colors;
  const {syncQueue} = useSelector((state: IRootReduxState) => state.healthData);
  const {pendingCount, lastSyncAt, isSyncing, syncNow} = useHealthSync();

  const renderItem = ({item}: {item: IHealthReading}) => (
    <View style={[styles.row, {backgroundColor: colors.card}]}>
      <View>
        <Text style={[textStyle(14, 'Roboto200'), {color: colors.text}]}>
          {localize(item.type)}
        </Text>
        <Text style={[textStyle(12), {color: colors.secondaryText}]}>
          {new Date(item.timestamp).toLocaleString()} · {localize(item.quality)}
        </Text>
      </View>
      <Text style={[textStyle(14), {color: colors.text}]}>
        {formatReadingValue(item)} {item.unit}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.summary, {backgroundColor: colors.card}]}>
        <Text style={[textStyle(14), {color: colors.secondaryText}]}>
          {localize('pending_readings')}: {pendingCount}
        </Text>
        <Text style={[textStyle(14), {color: colors.secondaryText}]}>
          {localize('last_sync')}:{' '}
          {lastSyncAt
            ? new Date(lastSyncAt).toLocaleString()
            : localize('never')}
        </Text>
        <CommonButton
          title={localize('sync_now')}
          onPress={syncNow}
          isLoading={isSyncing}
          buttonStyle={styles.button}
          TitleStyle={{color: Colors.offWhite}}
        />
      </View>

      <FlatList
        data={syncQueue}
        keyExtractor={item => item.clientId}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        initialNumToRender={20}
        ListEmptyComponent={
          <Text
            style={[
              textStyle(14, 'Roboto', 'center'),
              {color: colors.secondaryText},
            ]}
          >
            {localize('all_synced')}
          </Text>
        }
      />
    </View>
  );
};

export {SyncStatusScreen};
