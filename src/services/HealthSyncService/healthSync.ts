import {IHealthReading} from '@types';
import {getAxiosInstance} from '../ApiConfigService/axiosConfig';
import {endpoints} from '../ApiConfigService/endpoints';

export const BATCH_SIZE = 500;

/**
 * Uploads readings in batches of BATCH_SIZE.
 * Returns the clientIds that the API accepted, so they can be removed from the queue.
 */
export const uploadReadings = async (
  readings: IHealthReading[],
): Promise<string[]> => {
  const uploaded: string[] = [];
  for (let index = 0; index < readings.length; index += BATCH_SIZE) {
    const batch = readings.slice(index, index + BATCH_SIZE);
    const byDevice = batch.reduce<Record<string, IHealthReading[]>>(
      (groups, reading) => {
        (groups[reading.deviceId] = groups[reading.deviceId] ?? []).push(
          reading,
        );
        return groups;
      },
      {},
    );
    for (const [deviceId, deviceReadings] of Object.entries(byDevice)) {
      await getAxiosInstance().post(endpoints.measurementsBatch, {
        deviceId,
        // TODO: upload ECG waveform files once the API has a file endpoint, then send the file reference
        readings: deviceReadings.map(
          ({deviceId: _id, waveformFile: _file, ...reading}) => reading,
        ),
      });
      uploaded.push(...deviceReadings.map(reading => reading.clientId));
    }
  }
  return uploaded;
};
