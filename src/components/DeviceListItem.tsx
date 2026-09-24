import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useTheme} from '@react-navigation/native';
import {localize} from '@languages';
import {responsiveWidth, textStyle} from '@resources';
import {IWearableDevice} from '@types';

type Props = {
  device: IWearableDevice;
  onPress: (device: IWearableDevice) => void;
};

const DeviceListItem = (props: Props) => {
  const colors = useTheme().colors;
  const {device, onPress} = props;
  return (
    <Pressable
      style={[styles.deviceRow, {backgroundColor: colors.card}]}
      onPress={() => onPress(device)}
    >
      <View>
        <Text style={[textStyle(16, 'Roboto200'), {color: colors.text}]}>
          {device.name ?? device.id}
        </Text>
        <Text style={[textStyle(12), {color: colors.secondaryText}]}>
          {device.family} · RSSI {device.rssi ?? '-'}
        </Text>
      </View>
      <Text style={[textStyle(14), {color: colors.DarkSlateBlue}]}>
        {localize('connect')}
      </Text>
    </Pressable>
  );
};

export {DeviceListItem};

const styles = StyleSheet.create({
  deviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: responsiveWidth(4),
    borderRadius: responsiveWidth(3),
  },
});
