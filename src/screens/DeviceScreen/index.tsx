import React, {useEffect, useRef, useState} from 'react';
import {Alert, FlatList, Text, View} from 'react-native';
import {CommonActions, useNavigation, useTheme} from '@react-navigation/native';
import {styles} from './style';
import {CommonButton, DeviceListItem} from '@components';
import {useLanguage, useWearable} from '@hooks';
import {localize} from '@languages';
import {Colors, textStyle} from '@resources';
import {detectDeviceFamily, HBandAdapter, startScan, stopScan} from '@services';
import {DeviceFamily, IWearableDevice} from '@types';

const DeviceScreen = () => {
  const colors = useTheme().colors;
  useLanguage();
  const navigation = useNavigation();
  const {
    pairedDevice,
    connectionState,
    capabilities,
    deviceInfo,
    isSyncingHistory,
    connect,
    disconnect,
    syncDeviceHistory,
  } = useWearable();

  const [devices, setDevices] = useState<IWearableDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const stopScanRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => stopScanRef.current?.();
  }, []);

  const onScan = async () => {
    if (isScanning) {
      stopScanRef.current?.();
      setIsScanning(false);
      return;
    }
    setDevices([]);
    setIsScanning(true);
    try {
      stopScanRef.current = await startScan(
        device => {
          const name = device.name ?? device.localName;
          setDevices(previous => [
            ...previous,
            {
              id: device.id,
              name: name,
              rssi: device.rssi,
              family: detectDeviceFamily(name, device.serviceUUIDs),
            },
          ]);
        },
        error => {
          setIsScanning(false);
          Alert.alert(localize('bluetooth_error'), error.message);
        },
      );
    } catch (error: any) {
      setIsScanning(false);
      Alert.alert(localize('bluetooth_error'), error?.message);
    }
  };

  const connectAs = async (device: IWearableDevice, family: DeviceFamily) => {
    try {
      await connect({...device, family});
    } catch (error: any) {
      Alert.alert(localize('bluetooth_error'), error?.message);
    }
  };

  const onConnect = (device: IWearableDevice) => {
    stopScanRef.current?.();
    stopScan();
    setIsScanning(false);
    // Unknown band: let the tester pick the vendor SDK or standard BLE (POC)
    if (device.family === 'generic_ble' && HBandAdapter.isAvailable()) {
      Alert.alert(localize('connect_as'), device.name ?? device.id, [
        {text: localize('cancel'), style: 'cancel'},
        {
          text: localize('standard_ble'),
          onPress: () => connectAs(device, 'generic_ble'),
        },
        {
          text: localize('hband_sdk'),
          onPress: () => connectAs(device, 'hband'),
        },
      ]);
      return;
    }
    connectAs(device, device.family);
  };

  const onSyncHistory = async () => {
    try {
      await syncDeviceHistory();
    } catch (error: any) {
      Alert.alert(localize('bluetooth_error'), error?.message);
    }
  };

  const renderItem = ({item}: {item: IWearableDevice}) => (
    <DeviceListItem device={item} onPress={onConnect} />
  );

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <View style={[styles.statusCard, {backgroundColor: colors.card}]}>
        <Text style={[textStyle(16, 'Roboto200'), {color: colors.text}]}>
          {pairedDevice?.name ?? localize('no_device_paired')}
        </Text>
        <Text style={[textStyle(14), {color: colors.secondaryText}]}>
          {localize(connectionState)}
        </Text>
        {capabilities.length > 0 && (
          <Text style={[textStyle(12), {color: colors.secondaryText}]}>
            {localize('supported_data')}:{' '}
            {capabilities.map(metric => localize(metric)).join(', ')}
          </Text>
        )}
        {(deviceInfo.firmwareVersion || deviceInfo.batteryPercent != null) && (
          <Text style={[textStyle(12), {color: colors.secondaryText}]}>
            {deviceInfo.firmwareVersion
              ? `${localize('firmware')} ${deviceInfo.firmwareVersion}`
              : ''}
            {deviceInfo.batteryPercent != null
              ? ` · ${localize('battery')} ${deviceInfo.batteryPercent}%`
              : ''}
          </Text>
        )}
        {connectionState === 'connected' && (
          <View style={styles.row}>
            <CommonButton
              title={localize('sync_bracelet')}
              onPress={onSyncHistory}
              isLoading={isSyncingHistory}
              buttonStyle={styles.smallButton}
              TitleStyle={{color: Colors.offWhite}}
            />
            <CommonButton
              title={localize('disconnect')}
              onPress={disconnect}
              buttonStyle={styles.smallButton}
              TitleStyle={{color: Colors.offWhite}}
            />
          </View>
        )}
      </View>

      <CommonButton
        title={localize(isScanning ? 'stop_scan' : 'scan_devices')}
        onPress={onScan}
        TitleStyle={{color: Colors.offWhite}}
      />

      {__DEV__ && (
        <CommonButton
          title={localize('DebugScreen')}
          onPress={() =>
            navigation.dispatch(CommonActions.navigate('DebugScreen'))
          }
          buttonStyle={styles.smallButton}
          TitleStyle={{color: Colors.offWhite}}
        />
      )}

      <FlatList
        data={devices}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text
            style={[
              textStyle(14, 'Roboto', 'center'),
              {color: colors.secondaryText},
            ]}
          >
            {localize(isScanning ? 'scanning' : 'no_devices_found')}
          </Text>
        }
      />
    </View>
  );
};

export {DeviceScreen};
