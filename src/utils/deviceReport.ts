import {
  IDeviceCapabilities,
  IDeviceInfo,
  IHealthReading,
  IWearableDevice,
  MetricType,
} from '@types';

/** The metrics the client asked to confirm, in report order. */
export const REPORT_METRICS: MetricType[] = [
  'heart_rate',
  'spo2',
  'steps',
  'sleep_session',
  'temperature',
  'blood_pressure',
  'glucose',
  'ecg',
];

const METRIC_NAMES: Record<MetricType, string> = {
  heart_rate: 'Heart rate',
  spo2: 'SpO2',
  steps: 'Activity / steps',
  sleep_session: 'Sleep',
  temperature: 'Temperature',
  blood_pressure: 'Blood pressure (estimated)',
  glucose: 'Glucose (estimated)',
  ecg: 'ECG',
};

export interface IMetricStatus {
  metric: MetricType;
  supported: boolean;
  readingCount: number;
  lastReadingAt: string | null;
}

export interface IDeviceReportInput {
  device: IWearableDevice;
  capabilities: IDeviceCapabilities;
  deviceInfo: IDeviceInfo;
  readings: IHealthReading[]; // readings the app received (offline queue)
  latest: Partial<Record<MetricType, IHealthReading>>;
  app: {version: string; phone: string; os: string};
  generatedAt: string; // ISO
}

// H Band and E500 (Veepoo-based) use the vendor SDK; unknown bands use standard BLE
export const deviceSource = (device: IWearableDevice) =>
  device.family === 'generic_ble' ? 'standard BLE' : 'vendor SDK';

/** Supported by the band + what the app actually received from it. */
export const getMetricStatuses = ({
  device,
  capabilities,
  readings,
  latest,
}: Pick<
  IDeviceReportInput,
  'device' | 'capabilities' | 'readings' | 'latest'
>): IMetricStatus[] =>
  REPORT_METRICS.map(metric => {
    const received = readings.filter(
      reading => reading.type === metric && reading.deviceId === device.id,
    );
    const newestQueued = received.reduce<string | null>(
      (max, reading) =>
        !max || reading.timestamp > max ? reading.timestamp : max,
      null,
    );
    const latestReading = latest[metric];
    const latestAt =
      latestReading?.deviceId === device.id ? latestReading.timestamp : null;
    return {
      metric,
      supported: capabilities.includes(metric),
      readingCount: received.length,
      lastReadingAt:
        [newestQueued, latestAt].filter(Boolean).sort().pop() ?? null,
    };
  });

const formatUtc = (iso: string) => `${iso.slice(0, 16).replace('T', ' ')} UTC`;

/**
 * Plain-text report the tester shares with the developer after the first
 * connection (the POC data availability matrix). No health values, only counts.
 */
export const buildDeviceReport = (input: IDeviceReportInput): string => {
  const {device, deviceInfo, app} = input;
  const source = deviceSource(device);
  const lines: string[] = [
    'ALIHEALTH – Device check report',
    `Generated: ${formatUtc(input.generatedAt)}`,
    '',
    'BRACELET',
    `Name: ${device.name ?? 'unknown'}`,
    `ID: ${device.id}`,
    `Connected with: ${source}`,
  ];
  const details = [
    deviceInfo.firmwareVersion && `Firmware: ${deviceInfo.firmwareVersion}`,
    deviceInfo.deviceNumber != null &&
      `Device number: ${deviceInfo.deviceNumber}`,
    deviceInfo.watchDays != null && `Stores: ${deviceInfo.watchDays} days`,
    deviceInfo.batteryPercent != null &&
      `Battery: ${deviceInfo.batteryPercent}%`,
  ].filter(Boolean);
  if (details.length) {
    lines.push(details.join(' · '));
  }

  lines.push('', 'DATA AVAILABILITY');
  getMetricStatuses(input).forEach(status => {
    const name = METRIC_NAMES[status.metric];
    if (!status.supported) {
      lines.push(`❌ ${name} – not reported by the bracelet`);
    } else if (status.readingCount === 0 && !status.lastReadingAt) {
      lines.push(`⚠️ ${name} – supported (${source}), no data received yet`);
    } else {
      const last = status.lastReadingAt
        ? `, last ${formatUtc(status.lastReadingAt)}`
        : '';
      lines.push(
        `✅ ${name} – supported (${source}), ${status.readingCount} readings received${last}`,
      );
    }
  });

  const features = Object.entries(deviceInfo.sdkFeatures ?? {});
  if (features.length) {
    lines.push('', 'FUNCTIONS REPORTED BY THE BRACELET (SDK)');
    features.forEach(([key, value]) => lines.push(`${key}: ${value}`));
  }

  const services = deviceInfo.gattServices ?? [];
  if (services.length) {
    lines.push('', 'BLUETOOTH SERVICES');
    services.forEach(service => {
      lines.push(`Service ${service.uuid}`);
      service.characteristics.forEach(characteristic =>
        lines.push(
          `  - ${characteristic.uuid} (${
            characteristic.properties.join(', ') || 'no properties'
          })${characteristic.value ? `: ${characteristic.value}` : ''}`,
        ),
      );
    });
  }

  lines.push(
    '',
    'PHONE',
    `${app.phone} · ${app.os} · ALIHEALTH ${app.version}`,
  );

  // Everything the band sent, so a missing metric can be added for this exact device
  if (deviceInfo.rawResponses) {
    lines.push(
      '',
      'RAW DEVICE DATA (for the developer – settings + field names, no health values)',
      deviceInfo.rawResponses,
    );
  }
  return lines.join('\n');
};
