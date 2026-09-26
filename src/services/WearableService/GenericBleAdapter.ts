import {Characteristic, Device, Subscription} from 'react-native-ble-plx';
import {v4 as uuidv4} from 'uuid';
import {BleUUID} from '@constants';
import {base64ToBytes, parseHeartRate} from '@utils';
import {
  ConnectionState,
  IDeviceCapabilities,
  IDeviceInfo,
  IHealthReading,
} from '@types';
import {bleManager, connectToDevice, disconnectDevice} from '../BleService';
import {WearableAdapter} from './WearableAdapter';

const READ_TIMEOUT_MS = 3000;
const MAX_VALUE_BYTES = 64;

/** Hex bytes, plus the text when printable (e.g. Device Information: manufacturer, model). */
const describeValue = (base64: string) => {
  const bytes = Array.from(base64ToBytes(base64)).slice(0, MAX_VALUE_BYTES);
  const hex = bytes.map(byte => byte.toString(16).padStart(2, '0')).join(' ');
  const printable =
    bytes.length > 0 && bytes.every(byte => byte >= 0x20 && byte < 0x7f);
  return printable ? `${hex} "${String.fromCharCode(...bytes)}"` : hex;
};

/** Reads one characteristic for the device check report; never throws. */
const readValue = async (characteristic: Characteristic) => {
  try {
    const read = characteristic.read();
    const timeout = new Promise<null>(resolve =>
      setTimeout(() => resolve(null), READ_TIMEOUT_MS),
    );
    const result = await Promise.race([read, timeout]);
    if (!result) {
      return 'read timed out';
    }
    return result.value ? describeValue(result.value) : 'empty';
  } catch (error: any) {
    return `read failed: ${error?.message ?? 'unknown'}`;
  }
};

/**
 * Fallback adapter: uses only standard Bluetooth services
 * (Heart Rate 0x180D). Works with any bracelet that exposes them.
 */
export class GenericBleAdapter implements WearableAdapter {
  private device: Device | null = null;

  async connect(deviceId: string) {
    this.device = await connectToDevice(deviceId);
  }

  async disconnect() {
    const device = this.device;
    this.device = null;
    if (device && (await device.isConnected().catch(() => false))) {
      // The band may drop the link at any moment; that is not an error here
      await disconnectDevice(device.id).catch(() => undefined);
    }
  }

  subscribeConnection(onChange: (state: ConnectionState) => void) {
    const device = this.device;
    if (!device) {
      return () => {};
    }
    const subscription = bleManager.onDeviceDisconnected(device.id, () =>
      onChange('disconnected'),
    );
    return () => subscription.remove();
  }

  async getCapabilities(): Promise<IDeviceCapabilities> {
    if (!this.device) {
      return [];
    }
    const services = await this.device.services();
    const uuids = services.map(service => service.uuid.toLowerCase());
    const capabilities: IDeviceCapabilities = [];
    if (uuids.includes(BleUUID.HEART_RATE_SERVICE)) {
      capabilities.push('heart_rate');
    }
    return capabilities;
  }

  /** Lists every service + characteristic, so an unknown band (e.g. E500) can be identified. */
  async getDeviceInfo(): Promise<IDeviceInfo> {
    if (!this.device) {
      return {};
    }
    const services = await this.device.services();
    const gattServices = await Promise.all(
      services.map(async service => ({
        uuid: service.uuid.toLowerCase(),
        characteristics: await Promise.all(
          (
            await service.characteristics()
          ).map(async characteristic => ({
            uuid: characteristic.uuid.toLowerCase(),
            properties: [
              characteristic.isReadable && 'read',
              characteristic.isWritableWithResponse && 'write',
              characteristic.isWritableWithoutResponse && 'write_no_response',
              characteristic.isNotifiable && 'notify',
              characteristic.isIndicatable && 'indicate',
            ].filter((property): property is string => !!property),
            value: characteristic.isReadable
              ? await readValue(characteristic)
              : undefined,
          })),
        ),
      })),
    );
    return {gattServices};
  }

  subscribeRealtime(onReadings: (readings: IHealthReading[]) => void) {
    const device = this.device;
    if (!device) {
      return () => {};
    }
    const subscription: Subscription = device.monitorCharacteristicForService(
      BleUUID.HEART_RATE_SERVICE,
      BleUUID.HEART_RATE_MEASUREMENT,
      (error, characteristic) => {
        if (error || !characteristic?.value) {
          return;
        }
        onReadings([
          {
            clientId: uuidv4(),
            deviceId: device.id,
            type: 'heart_rate',
            value: parseHeartRate(characteristic.value),
            unit: 'bpm',
            timestamp: new Date().toISOString(),
            quality: 'measured',
            source: 'standard_ble',
          },
        ]);
      },
    );
    return () => subscription.remove();
  }

  async syncHistory(): Promise<IHealthReading[]> {
    // Standard BLE has no history profile; history comes from the vendor SDK adapters.
    return [];
  }
}
