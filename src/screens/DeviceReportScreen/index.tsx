import React from 'react';
import {Alert, Platform, ScrollView, Share, Text, View} from 'react-native';
import {useTheme} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import DeviceInfo from 'react-native-device-info';
import {styles} from './style';
import {CommonButton} from '@components';
import {useLanguage} from '@hooks';
import {localize} from '@languages';
import {Colors, textStyle} from '@resources';
import {IRootReduxState} from '@types';
import {buildDeviceReport, getMetricStatuses, IMetricStatus} from '@utils';

const DeviceReportScreen = () => {
  const colors = useTheme().colors;
  useLanguage();
  const {pairedDevice, capabilities, deviceInfo} = useSelector(
    (state: IRootReduxState) => state.deviceDetails,
  );
  const {syncQueue, latest} = useSelector(
    (state: IRootReduxState) => state.healthData,
  );

  if (!pairedDevice) {
    return (
      <View style={[styles.container, {backgroundColor: colors.background}]}>
        <Text
          style={[
            textStyle(14, 'Roboto', 'center'),
            {color: colors.secondaryText},
          ]}
        >
          {localize('report_connect_first')}
        </Text>
      </View>
    );
  }

  const statuses = getMetricStatuses({
    device: pairedDevice,
    capabilities,
    readings: syncQueue,
    latest,
  });
  const features = Object.entries(deviceInfo.sdkFeatures ?? {});
  const services = deviceInfo.gattServices ?? [];

  const onShare = async () => {
    const report = buildDeviceReport({
      device: pairedDevice,
      capabilities,
      deviceInfo,
      readings: syncQueue,
      latest,
      app: {
        version: `${DeviceInfo.getVersion()} (${DeviceInfo.getBuildNumber()})`,
        phone: `${DeviceInfo.getBrand()} ${DeviceInfo.getModel()}`,
        os: `${
          Platform.OS === 'ios' ? 'iOS' : 'Android'
        } ${DeviceInfo.getSystemVersion()}`,
      },
      generatedAt: new Date().toISOString(),
    });
    try {
      await Share.share({
        title: localize('DeviceReportScreen'),
        message: report,
      });
    } catch (error: any) {
      Alert.alert(localize('share_failed'), error?.message);
    }
  };

  const statusText = (status: IMetricStatus) => {
    if (!status.supported) {
      return localize('not_reported');
    }
    if (status.readingCount === 0 && !status.lastReadingAt) {
      return localize('no_data_yet');
    }
    return `${localize('supported')} · ${status.readingCount} ${localize(
      'readings_received',
    )}`;
  };

  const statusIcon = (status: IMetricStatus) => {
    if (!status.supported) {
      return '❌';
    }
    return status.readingCount === 0 && !status.lastReadingAt ? '⚠️' : '✅';
  };

  const details = [
    deviceInfo.firmwareVersion &&
      `${localize('firmware')} ${deviceInfo.firmwareVersion}`,
    deviceInfo.batteryPercent != null &&
      `${localize('battery')} ${deviceInfo.batteryPercent}%`,
  ].filter(Boolean);

  return (
    <View style={[styles.container, {backgroundColor: colors.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, {backgroundColor: colors.card}]}>
          <Text style={[textStyle(16, 'Roboto200'), {color: colors.text}]}>
            {pairedDevice.name ?? pairedDevice.id}
          </Text>
          <Text style={[textStyle(12), {color: colors.secondaryText}]}>
            {pairedDevice.id}
          </Text>
          <Text style={[textStyle(12), {color: colors.secondaryText}]}>
            {localize('connected_with')}:{' '}
            {localize(
              pairedDevice.family === 'hband' ? 'hband_sdk' : 'standard_ble',
            )}
          </Text>
          {details.length > 0 && (
            <Text style={[textStyle(12), {color: colors.secondaryText}]}>
              {details.join(' · ')}
            </Text>
          )}
        </View>

        <Text style={[textStyle(16, 'Roboto200'), {color: colors.text}]}>
          {localize('data_availability')}
        </Text>
        {statuses.map(status => (
          <View
            key={status.metric}
            style={[styles.row, {backgroundColor: colors.card}]}
          >
            <Text style={[textStyle(14, 'Roboto200'), {color: colors.text}]}>
              {statusIcon(status)} {localize(status.metric)}
            </Text>
            <Text style={[textStyle(12), {color: colors.secondaryText}]}>
              {statusText(status)}
            </Text>
          </View>
        ))}

        {features.length > 0 && (
          <>
            <Text style={[textStyle(16, 'Roboto200'), {color: colors.text}]}>
              {localize('sdk_functions')}
            </Text>
            <View style={[styles.card, {backgroundColor: colors.card}]}>
              {features.map(([key, value]) => (
                <View key={key} style={styles.featureRow}>
                  <Text style={[textStyle(12), {color: colors.text}]}>
                    {key}
                  </Text>
                  <Text style={[textStyle(12), {color: colors.secondaryText}]}>
                    {value}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {services.length > 0 && (
          <>
            <Text style={[textStyle(16, 'Roboto200'), {color: colors.text}]}>
              {localize('bluetooth_services')}
            </Text>
            {services.map(service => (
              <View
                key={service.uuid}
                style={[styles.card, {backgroundColor: colors.card}]}
              >
                <Text
                  style={[textStyle(12, 'Roboto200'), {color: colors.text}]}
                >
                  {service.uuid}
                </Text>
                {service.characteristics.map(characteristic => (
                  <Text
                    key={characteristic.uuid}
                    style={[textStyle(11), {color: colors.secondaryText}]}
                  >
                    {characteristic.uuid} (
                    {characteristic.properties.join(', ')})
                  </Text>
                ))}
              </View>
            ))}
          </>
        )}

        {!!deviceInfo.rawResponses && (
          <Text style={[textStyle(12), {color: colors.secondaryText}]}>
            {localize('raw_data_included')} (
            {Math.ceil(deviceInfo.rawResponses.length / 1024)} KB)
          </Text>
        )}

        <Text
          style={[
            textStyle(12, 'Roboto', 'center'),
            {color: colors.secondaryText},
          ]}
        >
          {localize('report_hint')}
        </Text>
      </ScrollView>

      <CommonButton
        title={localize('share_report')}
        onPress={onShare}
        buttonStyle={styles.shareButton}
        TitleStyle={{color: Colors.offWhite}}
      />
    </View>
  );
};

export {DeviceReportScreen};
