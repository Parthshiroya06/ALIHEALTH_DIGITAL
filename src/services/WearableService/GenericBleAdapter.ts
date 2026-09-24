import {Device, Subscription} from 'react-native-ble-plx';
import {v4 as uuidv4} from 'uuid';
import {BleUUID} from '@constants';
import {parseHeartRate} from '@utils';
import {IDeviceCapabilities, IHealthReading} from '@types';
import {connectToDevice, disconnectDevice} from '../BleService';
import {WearableAdapter} from './WearableAdapter';

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
    if (this.device) {
      await disconnectDevice(this.device.id);
      this.device = null;
    }
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
